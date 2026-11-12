// Every device we support, and the shortest way to connect each one.
// "apple_health": the watch's own app already writes steps into Apple Health, so one Allow is enough.
// "fitbit": Fitbit doesn't write to Apple Health; we sign in with Google and read from Fitbit's servers.

import type { Strings } from './i18n';

export type Device = {
  id: string;            // stored as players.source
  name: string;
  route: 'apple_health' | 'fitbit';
  /** Words that identify this brand's app among Apple Health sources (lowercase). */
  match: string[];
  /** The brand's own app, named in the one-line fix shown if we can't see its steps after Allow. */
  app?: string;
  /** Can't pair with an iPhone at all (Galaxy Watch). */
  androidOnly?: boolean;
};

export const DEVICES: Device[] = [
  { id: 'apple_health', name: 'Apple Watch', route: 'apple_health', match: ['com.apple'] },
  { id: 'garmin', name: 'Garmin', route: 'apple_health', match: ['garmin'],
    app: 'Garmin Connect' },
  { id: 'fitbit', name: 'Fitbit', route: 'fitbit', match: ['fitbit'] },
  { id: 'oura', name: 'Oura', route: 'apple_health', match: ['oura'],
    app: 'Oura' },
  { id: 'whoop', name: 'WHOOP', route: 'apple_health', match: ['whoop'],
    app: 'WHOOP' },
  { id: 'samsung', name: 'Galaxy Watch', route: 'apple_health', match: ['samsung'],
    androidOnly: true },
  { id: 'xiaomi', name: 'Xiaomi', route: 'apple_health', match: ['xiaomi', 'mi fitness', 'mifit', 'zepp life'],
    app: 'Mi Fitness' },
  { id: 'amazfit', name: 'Amazfit', route: 'apple_health', match: ['zepp', 'amazfit', 'huami'],
    app: 'Zepp' },
  { id: 'huawei', name: 'Huawei', route: 'apple_health', match: ['huawei'],
    app: 'Huawei Health' },
  { id: 'polar', name: 'Polar', route: 'apple_health', match: ['polar'],
    app: 'Polar Flow' },
  { id: 'coros', name: 'COROS', route: 'apple_health', match: ['coros'],
    app: 'COROS' },
  { id: 'suunto', name: 'Suunto', route: 'apple_health', match: ['suunto'],
    app: 'Suunto' },
  { id: 'withings', name: 'Withings', route: 'apple_health', match: ['withings'],
    app: 'Withings' },
  { id: 'other', name: 'Just my iPhone', route: 'apple_health', match: ['com.apple'] },
];

export function matchesDevice(d: Device, bundleId: string, name: string) {
  const s = `${bundleId} ${name}`.toLowerCase();
  return d.match.some((w) => s.includes(w));
}

/** The device's name as shown in the app (brand names stay as they are). */
export function deviceName(t: Strings, d: Device) {
  return d.id === 'other' ? t.justIphone : d.name;
}

/** The one-line fix for when Apple Health has no steps from this device yet. */
export function fixFor(t: Strings, d: Device) {
  if (d.androidOnly) return t.fixAndroidOnly;
  return d.app ? t.fixShare(d.app) : t.fixGeneric(d.name);
}
