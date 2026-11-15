// Watches we read straight from their own cloud (no Apple Health): one sign-in, then our server
// pulls the steps. Fitbit via Google (supabase/functions/fitbit), WHOOP (supabase/functions/whoop).
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import type { Strings } from './i18n';
import { supabase } from './supabase';

const extra = Constants.expoConfig?.extra as { supabaseUrl: string; supabaseKey: string };
export type Cloud = 'fitbit' | 'whoop';
const fn = (p: Cloud) => `${extra.supabaseUrl}/functions/v1/${p}`;

async function call(p: Cloud, path: string) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${fn(p)}/${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${data.session?.access_token}`, apikey: extra.supabaseKey, 'content-type': 'application/json' },
    body: '{}',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `${p} connection failed (${res.status})`);
  return body;
}

/** Opens the watch's sign-in (Google for Fitbit, WHOOP for WHOOP) in a sheet; resolves when the user is back in the app. */
export async function connectCloud(p: Cloud): Promise<{ ok: true } | { ok: false; code: string }> {
  const { url } = await call(p, 'start');
  const result = await WebBrowser.openAuthSessionAsync(url, `stepcompetition://${p}`);
  if (result.type !== 'success') return { ok: false, code: 'closed' };
  const params = new URLSearchParams(result.url.split('?')[1] ?? '');
  if (params.get('ok')) return { ok: true };
  return { ok: false, code: params.get('error') ?? 'unknown' };
}

/** What to tell the user when connectCloud fails. */
export function cloudError(t: Strings, p: Cloud, code: string) {
  return p === 'whoop' ? t.whoopErrors[code] ?? t.whoopUnknown(code) : t.fitbitErrors[code] ?? t.fitbitUnknown(code);
}

/** Pulls this user's latest steps from their watch's cloud right now. */
export async function syncCloudNow(p: Cloud) {
  await call(p, 'sync-me');
}

export async function cloudStatus(p: Cloud): Promise<{ connected: boolean; needs_reconnect: boolean } | null> {
  const { data } = await supabase.rpc(p === 'whoop' ? 'app_whoop_status' : 'app_fitbit_status');
  return (data as { connected: boolean; needs_reconnect: boolean }[] | null)?.[0] ?? null;
}
