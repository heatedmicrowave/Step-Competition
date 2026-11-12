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
  configureBackgroundTypes,
  subscribeToChanges,
  UpdateFrequency,
} from '@kingstinct/react-native-healthkit';
import { isoDay } from './supabase';

const STEPS = 'HKQuantityTypeIdentifierStepCount' as const;
// Steps typed in by hand in the Health app ("Add Data") are saved under the Health app itself.
// They never count: only steps a watch or phone actually measured.
const TYPED_IN = 'com.apple.Health';

export type StepSource = { bundleId: string; name: string; todaySteps: number };
export type DayTotal = { day: string; steps: number };

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
    if (id === TYPED_IN) continue;
    const prev = today.get(id);
    today.set(id, { bundleId: id, name: r.source.name, todaySteps: (prev?.todaySteps ?? 0) + Math.round(r.sumQuantity?.quantity ?? 0) });
  }
  // Include sources that wrote nothing yet today.
  const week = await querySources(STEPS, { date: { startDate: startOfDay(7) } });
  for (const s of week) {
    if (s.bundleIdentifier === TYPED_IN) continue;
    if (!today.has(s.bundleIdentifier)) today.set(s.bundleIdentifier, { bundleId: s.bundleIdentifier, name: s.name, todaySteps: 0 });
  }
  return [...today.values()].sort((a, b) => b.todaySteps - a.todaySteps);
}

/**
 * Daily totals for the last `days` days (today included).
 * With a bundleId, counts only that app's steps (e.g. only Garmin Connect), so the number
 * matches the watch. Without one, uses Apple Health's de-duplicated total of every measuring
 * source. Steps typed in by hand are always left out.
 */
export async function readDailySteps(days: number, bundleId?: string | null): Promise<DayTotal[]> {
  const from = startOfDay(days - 1);
  const filter: any = { date: { startDate: from } };
  const sources = await querySources(STEPS, filter);
  const match = sources.filter((s) =>
    bundleId ? s.bundleIdentifier === bundleId : s.bundleIdentifier !== TYPED_IN);
  if (match.length === 0) return dayList(days).map((day) => ({ day, steps: 0 }));
  filter.sources = match;
  const rows = await queryStatisticsCollectionForQuantity(STEPS, ['cumulativeSum'], from, { day: 1 }, { unit: 'count', filter });
  const byDay = new Map<string, number>();
  for (const r of rows) if (r.startDate) byDay.set(isoDay(new Date(r.startDate)), Math.round(r.sumQuantity?.quantity ?? 0));
  return dayList(days).map((day) => ({ day, steps: byDay.get(day) ?? 0 }));
}

function dayList(days: number) {
  return Array.from({ length: days }, (_, i) => isoDay(startOfDay(days - 1 - i)));
}

/**
 * Calls onChange whenever new steps land in Apple Health, including when the app is closed:
 * iOS wakes the app in the background (for steps, at most about once an hour) so it can upload.
 * Only call after askForStepAccess(), or HealthKit crashes the app.
 */
export async function watchSteps(onChange: () => void) {
  await configureBackgroundTypes([STEPS], UpdateFrequency.immediate);
  return subscribeToChanges(STEPS, () => onChange());
}
