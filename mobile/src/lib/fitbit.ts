// Fitbit: one Google sign-in, then our server reads Fitbit's steps (supabase/functions/fitbit).
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
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

const ERRORS: Record<string, string> = {
  access_denied: 'Google sign-in was cancelled.',
  not_linked: "Your Fitbit isn't on a Google account yet. Open the Fitbit app, follow its prompt to move your account to Google, then come back and tap Try again.",
  expired: 'That took too long. Try again.',
  no_refresh_token: 'Google didn\'t give us lasting access. Try again.',
};

/** Opens Google sign-in in a sheet; resolves when the user is back in the app. */
export async function connectFitbit(): Promise<{ ok: true } | { ok: false; message: string }> {
  const { url } = await call('start');
  const result = await WebBrowser.openAuthSessionAsync(url, 'stepcompetition://fitbit');
  if (result.type !== 'success') return { ok: false, message: 'Google sign-in was closed before finishing.' };
  const params = new URLSearchParams(result.url.split('?')[1] ?? '');
  if (params.get('ok')) return { ok: true };
  const err = params.get('error') ?? 'unknown';
  return { ok: false, message: ERRORS[err] ?? `Couldn't connect Fitbit (${err}).` };
}

/** Pulls this user's latest Fitbit steps right now. */
export async function syncFitbitNow() {
  await call('sync-me');
}

export async function fitbitStatus(): Promise<{ connected: boolean; needs_reconnect: boolean } | null> {
  const { data } = await supabase.rpc('app_fitbit_status');
  return (data as { connected: boolean; needs_reconnect: boolean }[] | null)?.[0] ?? null;
}
