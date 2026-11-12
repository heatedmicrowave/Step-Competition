import AsyncStorage from '@react-native-async-storage/async-storage';
import { askForStepAccess, brandOf, healthAvailable, listStepSources, pickWatch, readDailySteps, watchSteps } from './health';
import { supabase } from './supabase';

const SOURCE_KEY = 'stepSourceBundleId';
const ASKED_KEY = 'healthAsked';

export async function getChosenSource() {
  return AsyncStorage.getItem(SOURCE_KEY);
}
export async function setChosenSource(bundleId: string | null) {
  if (bundleId) await AsyncStorage.setItem(SOURCE_KEY, bundleId);
  else await AsyncStorage.removeItem(SOURCE_KEY);
}

/** Reads the last 7 days from Apple Health and uploads them. Returns today's steps. */
export async function syncSteps(): Promise<number | null> {
  if (!healthAvailable()) return null;
  const days = await readDailySteps(7, await getChosenSource());
  const { error } = await supabase.rpc('app_submit_steps', { p_days: days });
  if (error) throw error;
  return days[days.length - 1]?.steps ?? 0;
}

/**
 * The whole "connect your watch" flow in one call: Apple's permission sheet, then we work out
 * which watch app you use (Garmin Connect, Oura, WHOOP...) and start syncing. No picker needed.
 * Returns the label shown to others, e.g. "Garmin Connect".
 */
export async function connectHealth(): Promise<string> {
  await askForStepAccess();
  await AsyncStorage.setItem(ASKED_KEY, '1');
  const watch = pickWatch(await listStepSources());
  await setChosenSource(watch?.bundleId ?? null);
  const label = watch ? watch.name : 'Apple Health';
  const { error } = await supabase.rpc('app_set_source', { p_source: watch ? brandOf(watch.bundleId, watch.name) : 'apple_health', p_device_label: label });
  if (error) throw error;
  await syncSteps();
  await startBackgroundSync();
  return label;
}

let watching = false;
/** Keeps steps uploading whenever Apple Health gets new ones. Safe to call on every launch. */
export async function startBackgroundSync() {
  if (watching || !healthAvailable() || !(await AsyncStorage.getItem(ASKED_KEY))) return;
  watching = true;
  await watchSteps(() => { syncSteps().catch(() => {}); });
}
