import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import { askForStepAccess, healthAvailable, lastStepTime, listStepSources, readDailySteps, watchSteps } from './health';
import { DEVICES, Device, matchesDevice } from './devices';
import { syncCloudNow } from './cloud';
import { supabase } from './supabase';

const SOURCE_KEY = 'stepSourceBundleId';
const ASKED_KEY = 'healthAsked';
const ROUTE_KEY = 'stepRoute'; // 'apple_health' | 'fitbit' | 'whoop'
type Route = 'apple_health' | 'fitbit' | 'whoop';
const cloudRoute = async () => { const r = await AsyncStorage.getItem(ROUTE_KEY); return r === 'fitbit' || r === 'whoop' ? r : null; };

export async function setRoute(route: Route) {
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
 * Fitbit / WHOOP route: asks the server to pull from that watch's cloud now; returns null (the leaderboard shows the result).
 */
export async function syncSteps(): Promise<number | null> {
  const cloud = await cloudRoute();
  if (cloud) {
    await syncCloudNow(cloud);
    return null;
  }
  if (!healthAvailable()) return null;
  const days = await readDailySteps(7, await getChosenSource());
  const { error } = await supabase.rpc('app_submit_steps', { p_days: days });
  if (error) throw error;
  return days[days.length - 1]?.steps ?? 0;
}

/**
 * For a watch read through Apple Health: when its app last handed steps over today.
 * Lets the home say "last steps 8:12" (not just when we looked) and offer to open the watch's app.
 */
export async function watchFreshness(): Promise<{ device: Device; last: Date | null } | null> {
  if (!healthAvailable() || (await cloudRoute())) return null;
  const bundleId = await getChosenSource();
  if (!bundleId) return null;
  const device = DEVICES.find((d) => d.app && d.id !== 'other' && matchesDevice(d, bundleId, ''));
  if (!device) return null;
  return { device, last: await lastStepTime(bundleId) };
}

/** Opens the watch's own app so it syncs (Garmin Connect only hands steps to Apple Health when it syncs). */
export async function openWatchApp(d: Device) {
  for (const url of d.open ?? []) {
    try { await Linking.openURL(url); return; } catch { /* not this one */ }
  }
  if (d.store) await Linking.openURL(d.store).catch(() => {});
}

// Screens that want to redraw when new steps arrive while the app is open (e.g. Garmin Connect just synced).
const listeners = new Set<() => void>();
export function onNewSteps(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

let watching = false;
/** Keeps steps uploading whenever Apple Health gets new ones. Safe to call on every launch. */
export async function startBackgroundSync() {
  if (watching || !healthAvailable() || !(await AsyncStorage.getItem(ASKED_KEY))) return;
  if (await cloudRoute()) return;
  watching = true;
  await watchSteps(() => { syncSteps().then(() => listeners.forEach((fn) => fn())).catch(() => {}); });
}

export type ConnectResult = { ok: true; label: string } | { ok: false };

/**
 * Connect a chosen device through Apple Health: Apple's Allow sheet, then we look for that
 * brand's app among the step sources. If it isn't there yet, the screen shows the one-line fix.
 */
export async function connectDevice(d: Device): Promise<ConnectResult> {
  await askForStepAccess();
  await AsyncStorage.setItem(ASKED_KEY, '1');
  await setRoute('apple_health');
  const sources = await listStepSources();
  const found = sources.find((s) => matchesDevice(d, s.bundleId, s.name));
  if (!found && d.id !== 'apple_health' && d.id !== 'other') {
    return { ok: false };
  }
  // Apple Watch / iPhone: use Apple's combined total, which already de-duplicates the two.
  const useSource = d.id === 'apple_health' || d.id === 'other' ? null : found!;
  await setChosenSource(useSource?.bundleId ?? null);
  // Shown to other players, so keep it language-free: the brand ("Garmin"), not its app's name.
  const label = d.id === 'other' ? 'iPhone' : d.name;
  const { error } = await supabase.rpc('app_set_source', { p_source: d.id, p_device_label: label });
  if (error) throw error;
  await syncSteps();
  await startBackgroundSync();
  return { ok: true, label };
}
