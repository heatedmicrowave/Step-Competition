import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthAvailable, readDailySteps } from './health';
import { supabase } from './supabase';

const SOURCE_KEY = 'stepSourceBundleId';

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
