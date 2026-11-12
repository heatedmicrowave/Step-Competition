import AsyncStorage from '@react-native-async-storage/async-storage';
import { askForStepAccess, healthAvailable, listStepSources, readDailySteps, watchSteps } from './health';
import { Device, matchesDevice } from './devices';
import { syncFitbitNow } from './fitbit';
import { supabase } from './supabase';

const SOURCE_KEY = 'stepSourceBundleId';
const ASKED_KEY = 'healthAsked';
const ROUTE_KEY = 'stepRoute'; // 'apple_health' | 'fitbit'

export async function setRoute(route: 'apple_health' | 'fitbit') {
  await AsyncStorage.setItem(ROUTE_KEY, route);
}

export async function getChosenSource() {
  return AsyncStorage.getItem(SOURCE_KEY);
}
export async function setChosenSource(bundleId: string | null) {
  if (bundleId) await AsyncStorage.setItem(SOURCE_KEY, bundleId);
  else await AsyncStorage.removeItem(SOURCE_KEY);
}

/**
 * Apple Health route: reads the last 7 days on the phone and uploads them. Returns today's steps.
 * Fitbit route: asks the server to pull from Google now; returns null (the leaderboard shows the result).
 */
export async function syncSteps(): Promise<number | null> {
  if ((await AsyncStorage.getItem(ROUTE_KEY)) === 'fitbit') {
    await syncFitbitNow();
    return null;
  }
  if (!healthAvailable()) return null;
  const days = await readDailySteps(7, await getChosenSource());
  const { error } = await supabase.rpc('app_submit_steps', { p_days: days });
  if (error) throw error;
  return days[days.length - 1]?.steps ?? 0;
}

let watching = false;
/** Keeps steps uploading whenever Apple Health gets new ones. Safe to call on every launch. */
export async function startBackgroundSync() {
  if (watching || !healthAvailable() || !(await AsyncStorage.getItem(ASKED_KEY))) return;
  if ((await AsyncStorage.getItem(ROUTE_KEY)) === 'fitbit') return;
  watching = true;
  await watchSteps(() => { syncSteps().catch(() => {}); });
}

export type ConnectResult = { ok: true; label: string } | { ok: false; fix: string };

/**
 * Connect a chosen device through Apple Health: Apple's Allow sheet, then we look for that
 * brand's app among the step sources. If it isn't there yet, return the one-line fix.
 */
export async function connectDevice(d: Device): Promise<ConnectResult> {
  await askForStepAccess();
  await AsyncStorage.setItem(ASKED_KEY, '1');
  await setRoute('apple_health');
  const sources = await listStepSources();
  const found = sources.find((s) => matchesDevice(d, s.bundleId, s.name));
  if (!found && d.id !== 'apple_health' && d.id !== 'other') {
    return { ok: false, fix: d.fix ?? `Make sure your ${d.name} app shares steps with Apple Health.` };
  }
  // Apple Watch / iPhone: use Apple's combined total, which already de-duplicates the two.
  const useSource = d.id === 'apple_health' || d.id === 'other' ? null : found!;
  await setChosenSource(useSource?.bundleId ?? null);
  const label = useSource ? useSource.name : d.name;
  const { error } = await supabase.rpc('app_set_source', { p_source: d.id, p_device_label: label });
  if (error) throw error;
  await syncSteps();
  await startBackgroundSync();
  return { ok: true, label };
}
