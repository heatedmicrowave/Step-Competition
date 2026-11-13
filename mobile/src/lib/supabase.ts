import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { AppState } from 'react-native';

const extra = Constants.expoConfig?.extra as { supabaseUrl: string; supabaseKey: string };

export const supabase = createClient(extra.supabaseUrl, extra.supabaseKey, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Only refresh the sign-in token while the app is on screen.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export type Me = { id: string; name: string; source: string; device_label: string | null };
export type Competition = { id: string; name: string; start_day: string; end_day: string; join_code: string; course: string };

/** A local-time YYYY-MM-DD date (competitions count days in each player's own time zone). */
export function isoDay(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function errorText(e: unknown) {
  return e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as any).message) : String(e);
}
