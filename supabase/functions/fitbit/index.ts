// Fitbit (Google Health API) connection for players without a Garmin.
//   GET  /fitbit/start?key=<player secret key>  -> sends the player to Google sign-in
//   GET  /fitbit/callback                       -> Google sends them back here; saves the token
//   POST /fitbit/sync  (header x-cron-secret)   -> called by pg_cron; pulls recent daily steps
//
// Secrets (Edge Functions -> Secrets): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CRON_SECRET.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// Deploy with JWT verification OFF: Google's redirect can't carry a Supabase token.

import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const SITE = "https://heatedmicrowave.github.io/Step-Competition/site/";
const SCOPE = "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly";
const ROLLUP_URL = "https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp";

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`missing secret ${k}`);
  return v;
};
const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const callbackUrl = `${env("SUPABASE_URL")}/functions/v1/fitbit/callback`;

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
const redirect = (to: string) => new Response(null, { status: 302, headers: { location: to } });

// The OAuth "state" is the player id plus an HMAC, so the callback can trust it
// without the secret key ever being sent to Google.
async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env("CRON_SECRET")),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function googleToken(params: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      ...params,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`token: ${json.error ?? res.status} ${json.error_description ?? ""}`);
  return json as { access_token: string; expires_in: number; refresh_token?: string };
}

type TokenRow = { player_id: string; refresh_token: string; access_token: string | null; expires_at: string | null };

async function accessTokenFor(row: TokenRow): Promise<string> {
  if (row.access_token && row.expires_at && new Date(row.expires_at).getTime() > Date.now() + 60_000) {
    return row.access_token;
  }
  const tok = await googleToken({ grant_type: "refresh_token", refresh_token: row.refresh_token });
  await db.from("fitbit_tokens").update({
    access_token: tok.access_token,
    expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
  }).eq("player_id", row.player_id);
  return tok.access_token;
}

const ymd = (d: Date) => ({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
const midnight = { hours: 0, minutes: 0, seconds: 0, nanos: 0 };
const pad = (n: number) => String(n).padStart(2, "0");

// Pulls the last few days (Google counts days in the wearer's own time zone)
// and overwrites them in daily_steps, so late syncs still land on the right day.
async function syncPlayer(playerId: string, accessToken: string) {
  const day = 24 * 3600 * 1000;
  const start = new Date(Date.now() - 3 * day);
  const end = new Date(Date.now() + 2 * day);
  const res = await fetch(ROLLUP_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      range: { start: { date: ymd(start), time: midnight }, end: { date: ymd(end), time: midnight } },
      windowSizeDays: 1,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`rollup: ${res.status} ${JSON.stringify(json).slice(0, 300)}`);

  const rows = (json.rollupDataPoints ?? [])
    .map((p: any) => {
      const d = p.civilStartTime?.date;
      return { day: d && `${d.year}-${pad(d.month)}-${pad(d.day)}`, steps: Number(p.steps?.countSum ?? 0) };
    })
    .filter((r: { day?: string; steps: number }) => r.day && r.steps > 0)
    .map((r: { day: string; steps: number }) => ({
      player_id: playerId, day: r.day, steps: r.steps, updated_at: new Date().toISOString(),
    }));
  if (rows.length) {
    const { error } = await db.from("daily_steps").upsert(rows, { onConflict: "player_id,day" });
    if (error) throw new Error(`save: ${error.message}`);
  }
  await db.from("fitbit_tokens")
    .update({ last_synced: new Date().toISOString(), last_error: null, needs_reconnect: false })
    .eq("player_id", playerId);
}

async function start(url: URL) {
  const key = url.searchParams.get("key") ?? "";
  const { data: player } = await db.from("players").select("id").eq("secret_key", key).maybeSingle();
  if (!player) return text("That key doesn't match anyone. Save your key on the site first.", 403);

  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: `${player.id}.${await hmac(player.id)}`,
  }).toString();
  return redirect(auth.toString());
}

async function callback(url: URL) {
  if (url.searchParams.get("error")) return text(`Google said: ${url.searchParams.get("error")}`, 400);
  const [playerId, sig] = (url.searchParams.get("state") ?? "").split(".");
  if (!playerId || sig !== await hmac(playerId)) return text("This sign-in link is invalid. Try again from the site.", 400);

  const tok = await googleToken({
    grant_type: "authorization_code",
    code: url.searchParams.get("code") ?? "",
    redirect_uri: callbackUrl,
  });
  if (!tok.refresh_token) return text("Google didn't give a long-lived token. Try connecting again.", 400);

  const { error } = await db.from("fitbit_tokens").upsert({
    player_id: playerId,
    refresh_token: tok.refresh_token,
    access_token: tok.access_token,
    expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
    needs_reconnect: false,
  });
  if (error) return text(`Couldn't save: ${error.message}`, 500);

  try {
    await syncPlayer(playerId, tok.access_token);
  } catch (e) {
    await db.from("fitbit_tokens").update({ last_error: String(e) }).eq("player_id", playerId);
    return redirect(`${SITE}?fitbit=error`);
  }
  return redirect(`${SITE}?fitbit=connected`);
}

async function syncAll(req: Request) {
  if (req.headers.get("x-cron-secret") !== env("CRON_SECRET")) return text("forbidden", 403);
  const { data: rows } = await db.from("fitbit_tokens").select("*").eq("needs_reconnect", false);
  const results: string[] = [];
  for (const row of (rows ?? []) as TokenRow[]) {
    try {
      await syncPlayer(row.player_id, await accessTokenFor(row));
      results.push(`${row.player_id}: ok`);
    } catch (e) {
      const msg = String(e);
      // invalid_grant = the person revoked access or the token expired; they need to reconnect.
      await db.from("fitbit_tokens")
        .update({ last_error: msg, needs_reconnect: msg.includes("invalid_grant") })
        .eq("player_id", row.player_id);
      results.push(`${row.player_id}: ${msg}`);
    }
  }
  return text(results.join("\n") || "no fitbit players connected");
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  try {
    if (url.pathname.endsWith("/start")) return await start(url);
    if (url.pathname.endsWith("/callback")) return await callback(url);
    if (url.pathname.endsWith("/sync")) return await syncAll(req);
    return text("not found", 404);
  } catch (e) {
    return text(`Something went wrong: ${e}`, 500);
  }
});
