// Fitbit steps through the Google Health API (Fitbit's own API was shut down in 2026).
//
// Routes (all under /functions/v1/fitbit):
//   POST /start     app, signed in   -> { url } of Google's sign-in page for this player
//   GET  /callback  Google redirect  -> saves the tokens, pulls steps, sends the browser back to the app
//   POST /sync-me   app, signed in   -> pulls the caller's Fitbit steps now (pull-to-refresh)
//   POST /sync      cron (secret)    -> pulls everyone's Fitbit steps
//
// Deploy with "Verify JWT" OFF: Google's redirect has no Supabase token, so each route checks its own.
// Secrets to set in Supabase (Edge Functions > Secrets): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/fitbit/callback`;
const APP_RETURN = 'stepcompetition://fitbit';
const SCOPE = 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly';
const HEALTH = 'https://health.googleapis.com/v4';

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } });
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, apikey' };
const backToApp = (params: Record<string, string>) =>
  new Response(null, { status: 302, headers: { location: `${APP_RETURN}?${new URLSearchParams(params)}` } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const path = new URL(req.url).pathname;
  try {
    if (path.endsWith('/start')) return await start(req);
    if (path.endsWith('/callback')) return await callback(req);
    if (path.endsWith('/sync-me')) return await syncMe(req);
    if (path.endsWith('/sync')) return await syncAll(req);
    return json({ error: 'not found' }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});

// ---- who is calling ----

async function playerFromAuth(req: Request): Promise<string | null> {
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const { data } = await db.auth.getUser(jwt);
  if (!data.user) return null;
  const { data: p } = await db.from('players').select('id').eq('user_id', data.user.id).maybeSingle();
  return p?.id ?? null;
}

// The OAuth "state" carries the player id, signed so nobody can attach their Fitbit to someone else.
async function sign(text: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SERVICE_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function makeState(playerId: string) {
  const payload = `${playerId}.${Date.now()}`;
  return `${payload}.${await sign(payload)}`;
}
async function readState(state: string): Promise<string | null> {
  const [playerId, ts, sig] = state.split('.');
  if (!playerId || !ts || !sig) return null;
  if ((await sign(`${playerId}.${ts}`)) !== sig) return null;
  if (Date.now() - Number(ts) > 15 * 60 * 1000) return null; // sign-in must finish within 15 minutes
  return playerId;
}

// ---- routes ----

async function start(req: Request) {
  const playerId = await playerFromAuth(req);
  if (!playerId) return json({ error: 'not signed in' }, 401);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',  // we need a refresh token to keep syncing
    prompt: 'consent',       // Google only hands out a refresh token on consent
    include_granted_scopes: 'true',
    state: await makeState(playerId),
  }).toString();
  return json({ url: url.toString() });
}

async function callback(req: Request) {
  const q = new URL(req.url).searchParams;
  if (q.get('error')) return backToApp({ error: q.get('error')! });
  const playerId = await readState(q.get('state') ?? '');
  if (!playerId) return backToApp({ error: 'expired' });

  const tok = await tokenRequest({ code: q.get('code') ?? '', grant_type: 'authorization_code', redirect_uri: REDIRECT_URI });
  if (!tok.refresh_token) return backToApp({ error: 'no_refresh_token' });

  // Google sign-in works for any Google account; this checks it actually has Fitbit / Google Health data.
  const idRes = await fetch(`${HEALTH}/users/me/identity`, { headers: { authorization: `Bearer ${tok.access_token}` } });
  if (!idRes.ok) return backToApp({ error: idRes.status === 400 ? 'not_linked' : 'identity_failed' });
  const identity = await idRes.json();

  await db.from('fitbit_links').upsert({
    player_id: playerId,
    google_user: identity?.name ?? null,
    refresh_token: tok.refresh_token,
    access_token: tok.access_token,
    expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
    needs_reconnect: false,
  });
  await db.from('players').update({ source: 'fitbit', device_label: 'Fitbit' }).eq('id', playerId);
  await syncPlayer(playerId);
  return backToApp({ ok: '1' });
}

async function syncMe(req: Request) {
  const playerId = await playerFromAuth(req);
  if (!playerId) return json({ error: 'not signed in' }, 401);
  return json(await syncPlayer(playerId));
}

async function syncAll(req: Request) {
  const { data: secret } = await db.from('app_secrets').select('value').eq('name', 'fitbit_cron_secret').single();
  if (!secret || req.headers.get('x-cron-secret') !== secret.value) return json({ error: 'forbidden' }, 403);
  const { data: links } = await db.from('fitbit_links').select('player_id').eq('needs_reconnect', false);
  const results = [];
  for (const l of links ?? []) results.push(await syncPlayer(l.player_id)); // one at a time: well under Google's limits
  return json({ synced: results.length, results });
}

// ---- Google ----

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params }),
  });
  const body = await res.json();
  if (!res.ok) throw Object.assign(new Error(body.error_description ?? body.error ?? 'token request failed'), { code: body.error });
  return body as { access_token: string; refresh_token?: string; expires_in?: number };
}

async function accessToken(playerId: string): Promise<string | null> {
  const { data: l } = await db.from('fitbit_links').select('*').eq('player_id', playerId).single();
  if (!l || l.needs_reconnect) return null;
  if (l.access_token && l.expires_at && new Date(l.expires_at).getTime() > Date.now() + 60_000) return l.access_token;
  try {
    const tok = await tokenRequest({ refresh_token: l.refresh_token, grant_type: 'refresh_token' });
    await db.from('fitbit_links').update({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token ?? l.refresh_token,
      expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
    }).eq('player_id', playerId);
    return tok.access_token;
  } catch (e) {
    // invalid_grant: the user removed access, or (while the Google app is in Testing) the 7-day token expired.
    if ((e as { code?: string }).code === 'invalid_grant') {
      await db.from('fitbit_links').update({ needs_reconnect: true }).eq('player_id', playerId);
      return null;
    }
    throw e;
  }
}

type CivilDate = { year: number; month: number; day: number };
const civil = (d: Date): CivilDate => ({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
const midnight = (d: Date) => ({ date: civil(d), time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 } });
const iso = (c: CivilDate) => `${c.year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`;

/** Pulls the last week of daily step totals (in the wearer's own local days) into daily_steps. */
async function syncPlayer(playerId: string) {
  const token = await accessToken(playerId);
  if (!token) return { playerId, ok: false, reason: 'needs_reconnect' };

  const day = 86_400_000;
  const from = new Date(Date.now() - 7 * day);
  const to = new Date(Date.now() + 2 * day); // end is exclusive; covers "today" in every time zone
  const res = await fetch(`${HEALTH}/users/me/dataTypes/steps/dataPoints:dailyRollUp`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ range: { start: midnight(from), end: midnight(to) }, windowSizeDays: 1 }),
  });
  if (!res.ok) return { playerId, ok: false, reason: `google ${res.status}: ${(await res.text()).slice(0, 200)}` };
  const body = await res.json() as { rollupDataPoints?: { civilStartTime: { date: CivilDate }; steps?: { countSum?: string } }[] };

  const rows = (body.rollupDataPoints ?? [])
    .filter((p) => p.steps?.countSum !== undefined) // days the watch wasn't worn have no steps field
    .map((p) => ({ player_id: playerId, day: iso(p.civilStartTime.date), steps: Number(p.steps!.countSum), updated_at: new Date().toISOString() }));
  if (rows.length) {
    const { error } = await db.from('daily_steps').upsert(rows, { onConflict: 'player_id,day' });
    if (error) return { playerId, ok: false, reason: error.message };
  }
  await db.from('fitbit_links').update({ last_synced_at: new Date().toISOString() }).eq('player_id', playerId);
  return { playerId, ok: true, days: rows.length };
}
