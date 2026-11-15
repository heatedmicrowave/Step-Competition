// WHOOP steps through WHOOP's own developer API (steps arrived in it on 2026-09-23).
//
// Routes (all under /functions/v1/whoop):
//   POST /start     app, signed in   -> { url } of WHOOP's sign-in page for this player
//   GET  /callback  WHOOP redirect   -> saves the tokens, pulls steps, sends the browser back to the app
//   POST /sync-me   app, signed in   -> pulls the caller's WHOOP steps now
//   POST /sync      cron (secret)    -> pulls everyone's WHOOP steps
//
// Deploy with "Verify JWT" OFF: WHOOP's redirect has no Supabase token, so each route checks its own.
// Secrets to set in Supabase (Edge Functions > Secrets): WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET.
//
// WHOOP counts steps per "cycle" (wake-up to next wake-up), not per calendar day. Each cycle's steps
// go to the local date the cycle started on, so the cycle that starts when you wake up today is today.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLIENT_ID = Deno.env.get('WHOOP_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('WHOOP_CLIENT_SECRET')!;
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/whoop/callback`;
const APP_RETURN = 'stepcompetition://whoop';
const AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const API = 'https://api.prod.whoop.com/developer/v2';
const SCOPE = 'offline read:cycles'; // offline = a refresh token, so we can keep syncing

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, apikey' };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } });
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

// The OAuth "state" carries the player id, signed so nobody can attach their WHOOP to someone else.
async function sign(text: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SERVICE_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('whoop:' + text));
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
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
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

  await db.from('whoop_links').upsert({
    player_id: playerId,
    refresh_token: tok.refresh_token,
    access_token: tok.access_token,
    expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
    needs_reconnect: false,
  });
  await db.from('players').update({ source: 'whoop', device_label: 'WHOOP' }).eq('id', playerId);
  await syncPlayer(playerId);
  return backToApp({ ok: '1' });
}

async function syncMe(req: Request) {
  const playerId = await playerFromAuth(req);
  if (!playerId) return json({ error: 'not signed in' }, 401);
  return json(await syncPlayer(playerId));
}

async function syncAll(req: Request) {
  const { data: secret } = await db.from('app_secrets').select('value').eq('name', 'whoop_cron_secret').single();
  if (!secret || req.headers.get('x-cron-secret') !== secret.value) return json({ error: 'forbidden' }, 403);
  const { data: links } = await db.from('whoop_links').select('player_id').eq('needs_reconnect', false);
  const results = [];
  for (const l of links ?? []) results.push(await syncPlayer(l.player_id)); // one at a time: well under WHOOP's limits
  return json({ synced: results.length, results });
}

// ---- WHOOP ----

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error_description ?? body.error ?? `token request failed (${res.status})`), { code: body.error });
  return body as { access_token: string; refresh_token?: string; expires_in?: number };
}

async function accessToken(playerId: string): Promise<string | null> {
  const { data: l } = await db.from('whoop_links').select('*').eq('player_id', playerId).single();
  if (!l || l.needs_reconnect) return null;
  if (l.access_token && l.expires_at && new Date(l.expires_at).getTime() > Date.now() + 60_000) return l.access_token;
  try {
    // WHOOP hands out a NEW refresh token each time and the old one stops working, so save it right away.
    const tok = await tokenRequest({ refresh_token: l.refresh_token, grant_type: 'refresh_token', scope: 'offline' });
    await db.from('whoop_links').update({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token ?? l.refresh_token,
      expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
    }).eq('player_id', playerId);
    return tok.access_token;
  } catch (e) {
    // invalid_grant: the member removed access in WHOOP, or the refresh token was already used.
    if ((e as { code?: string }).code === 'invalid_grant') {
      await db.from('whoop_links').update({ needs_reconnect: true }).eq('player_id', playerId);
      return null;
    }
    throw e;
  }
}

type Cycle = { start: string; timezone_offset?: string; step_count?: number | null };

/** The wearer's local date ("2026-11-15") for a UTC time and an offset like "-06:00" or "Z". */
function localDay(utc: string, offset = 'Z') {
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(offset);
  const mins = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  return new Date(new Date(utc).getTime() + mins * 60_000).toISOString().slice(0, 10);
}

/** Pulls the last week of WHOOP cycles and stores their steps in daily_steps. */
async function syncPlayer(playerId: string) {
  const token = await accessToken(playerId);
  if (!token) return { playerId, ok: false, reason: 'needs_reconnect' };

  const cycles: Cycle[] = [];
  let next: string | undefined;
  const from = new Date(Date.now() - 8 * 86_400_000).toISOString();
  for (let page = 0; page < 3; page++) {
    const url = new URL(`${API}/cycle`);
    url.search = new URLSearchParams({ start: from, limit: '25', ...(next ? { nextToken: next } : {}) }).toString();
    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return { playerId, ok: false, reason: `whoop ${res.status}: ${(await res.text()).slice(0, 200)}` };
    const body = await res.json() as { records?: Cycle[]; next_token?: string };
    cycles.push(...(body.records ?? []));
    next = body.next_token;
    if (!next) break;
  }

  // Null step_count = no step data (strap not worn); skip it rather than writing 0.
  const byDay = new Map<string, number>();
  for (const c of cycles) {
    if (c.step_count == null) continue;
    const day = localDay(c.start, c.timezone_offset);
    byDay.set(day, (byDay.get(day) ?? 0) + c.step_count);
  }
  const rows = [...byDay].map(([day, steps]) => ({ player_id: playerId, day, steps, updated_at: new Date().toISOString() }));
  if (rows.length) {
    const { error } = await db.from('daily_steps').upsert(rows, { onConflict: 'player_id,day' });
    if (error) return { playerId, ok: false, reason: error.message };
  }
  await db.from('whoop_links').update({ last_synced_at: new Date().toISOString() }).eq('player_id', playerId);
  return { playerId, ok: true, days: rows.length };
}
