// Reads daily step totals from Apple Health (iOS).
// Garmin Connect, Oura, WHOOP, Polar, Coros, Suunto, Withings, Xiaomi (Mi Fitness), Amazfit (Zepp),
// Huawei Health and the iPhone/Apple Watch all write steps into Apple Health, so one integration covers most watches. Fitbit does not, and gets its own
// server-side connection later.
import { Platform } from 'react-native';
import {
  isHealthDataAvailable,
  queryStatisticsCollectionForQuantity,
  queryStatisticsCollectionForQuantitySeparateBySource,
  querySources,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { isoDay } from './supabase';

const STEPS = 'HKQuantityTypeIdentifierStepCount' as const;

export type StepSource = { bundleId: string; name: string; todaySteps: number };
export type DayTotal = { day: string; steps: number };

/** Picks a known brand from the app that wrote the steps. */
export function brandOf(bundleId: string, name: string): string {
  const s = `${bundleId} ${name}`.toLowerCase();
  const has = (...words: string[]) => words.some((w) => s.includes(w));
  if (has('garmin')) return 'garmin';
  if (has('oura')) return 'oura';
  if (has('whoop')) return 'whoop';
  if (has('polar')) return 'polar';
  if (has('coros')) return 'coros';
  if (has('suunto')) return 'suunto';
  if (has('withings')) return 'withings';
  if (has('xiaomi', 'mi fitness', 'mifit', 'zepp life')) return 'xiaomi'; // Mi Band
  if (has('zepp', 'amazfit', 'huami')) return 'amazfit';
  if (has('huawei')) return 'huawei';
  if (has('samsung')) return 'samsung';
  if (has('fitbit')) return 'fitbit';
  return 'apple_health';
}

export function healthAvailable() {
  return Platform.OS === 'ios' && isHealthDataAvailable();
}

export async function askForStepAccess() {
  return requestAuthorization({ toRead: [STEPS] });
}

function startOfDay(daysAgo: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

/** Every app that wrote steps in the last week, with today's count, busiest first. */
export async function listStepSources(): Promise<StepSource[]> {
  const from = startOfDay(0);
  const rows = await queryStatisticsCollectionForQuantitySeparateBySource(
    STEPS, ['cumulativeSum'], from, { day: 1 }, { unit: 'count', filter: { date: { startDate: from } } },
  );
  const today = new Map<string, StepSource>();
  for (const r of rows) {
    const id = r.source.bundleIdentifier;
    const prev = today.get(id);
    today.set(id, { bundleId: id, name: r.source.name, todaySteps: (prev?.todaySteps ?? 0) + Math.round(r.sumQuantity?.quantity ?? 0) });
  }
  // Include sources that wrote nothing yet today.
  const week = await querySources(STEPS, { date: { startDate: startOfDay(7) } });
  for (const s of week) {
    if (!today.has(s.bundleIdentifier)) today.set(s.bundleIdentifier, { bundleId: s.bundleIdentifier, name: s.name, todaySteps: 0 });
  }
  return [...today.values()].sort((a, b) => b.todaySteps - a.todaySteps);
}

/**
 * Daily totals for the last `days` days (today included).
 * With a bundleId, counts only that app's steps (e.g. only Garmin Connect), so the number
 * matches the watch. Without one, uses Apple Health's own de-duplicated total.
 */
export async function readDailySteps(days: number, bundleId?: string | null): Promise<DayTotal[]> {
  const from = startOfDay(days - 1);
  const filter: any = { date: { startDate: from } };
  if (bundleId) {
    const sources = await querySources(STEPS, filter);
    const match = sources.filter((s) => s.bundleIdentifier === bundleId);
    if (match.length === 0) return dayList(days).map((day) => ({ day, steps: 0 }));
    filter.sources = match;
  }
  const rows = await queryStatisticsCollectionForQuantity(STEPS, ['cumulativeSum'], from, { day: 1 }, { unit: 'count', filter });
  const byDay = new Map<string, number>();
  for (const r of rows) if (r.startDate) byDay.set(isoDay(new Date(r.startDate)), Math.round(r.sumQuantity?.quantity ?? 0));
  return dayList(days).map((day) => ({ day, steps: byDay.get(day) ?? 0 }));
}

function dayList(days: number) {
  return Array.from({ length: days }, (_, i) => isoDay(startOfDay(days - 1 - i)));
}
