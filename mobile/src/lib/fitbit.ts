// Fitbit: one Google sign-in, then our server reads Fitbit's steps (supabase/functions/fitbit).
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import type { Strings } from './i18n';
import { supabase } from './supabase';

const extra = Constants.expoConfig?.extra as { supabaseUrl: string; supabaseKey: string };
const FN = `${extra.supabaseUrl}/functions/v1/fitbit`;

async function call(path: string) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${FN}/${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${data.session?.access_token}`, apikey: extra.supabaseKey, 'content-type': 'application/json' },
    body: '{}',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Fitbit connection failed (${res.status})`);
  return body;
}

/** Opens Google sign-in in a sheet; resolves when the user is back in the app. */
export async function connectFitbit(): Promise<{ ok: true } | { ok: false; code: string }> {
  const { url } = await call('start');
  const result = await WebBrowser.openAuthSessionAsync(url, 'stepcompetition://fitbit');
  if (result.type !== 'success') return { ok: false, code: 'closed' };
  const params = new URLSearchParams(result.url.split('?')[1] ?? '');
  if (params.get('ok')) return { ok: true };
  return { ok: false, code: params.get('error') ?? 'unknown' };
}

/** What to tell the user when connectFitbit fails. */
export function fitbitError(t: Strings, code: string) {
  return t.fitbitErrors[code] ?? t.fitbitUnknown(code);
}

/** Pulls this user's latest Fitbit steps right now. */
export async function syncFitbitNow() {
  await call('sync-me');
}

export async function fitbitStatus(): Promise<{ connected: boolean; needs_reconnect: boolean } | null> {
  const { data } = await supabase.rpc('app_fitbit_status');
  return (data as { connected: boolean; needs_reconnect: boolean }[] | null)?.[0] ?? null;
}
