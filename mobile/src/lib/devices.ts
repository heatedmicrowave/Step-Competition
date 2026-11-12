// Every device we support, and the shortest way to connect each one.
// "apple_health": the watch's own app already writes steps into Apple Health, so one Allow is enough.
// "fitbit": Fitbit doesn't write to Apple Health; we sign in with Google and read from Fitbit's servers.

export type Device = {
  id: string;            // stored as players.source
  name: string;
  route: 'apple_health' | 'fitbit';
  /** Words that identify this brand's app among Apple Health sources (lowercase). */
  match: string[];
  /** One line shown only if we can't see this brand's steps after Allow. */
  fix?: string;
};

export const DEVICES: Device[] = [
  { id: 'apple_health', name: 'Apple Watch', route: 'apple_health', match: ['com.apple'] },
  { id: 'garmin', name: 'Garmin', route: 'apple_health', match: ['garmin'],
    fix: 'Open Garmin Connect, find Apple Health in its settings, and turn on sharing for Steps. Then come back here.' },
  { id: 'fitbit', name: 'Fitbit', route: 'fitbit', match: ['fitbit'] },
  { id: 'oura', name: 'Oura', route: 'apple_health', match: ['oura'],
    fix: 'Open Oura, find Apple Health in its settings, and turn on sharing for Steps. Then come back here.' },
  { id: 'whoop', name: 'WHOOP', route: 'apple_health', match: ['whoop'],
    fix: 'Open WHOOP, find Apple Health in its settings, and turn on sharing for Steps. Then come back here.' },
  { id: 'samsung', name: 'Galaxy Watch', route: 'apple_health', match: ['samsung'],
    fix: 'Galaxy Watches only pair with Android phones. The Android version of this app is coming.' },
  { id: 'xiaomi', name: 'Xiaomi', route: 'apple_health', match: ['xiaomi', 'mi fitness', 'mifit', 'zepp life'],
    fix: 'Open Mi Fitness, find Apple Health in its settings, and turn on sharing for Steps. Then come back here.' },
  { id: 'amazfit', name: 'Amazfit', route: 'apple_health', match: ['zepp', 'amazfit', 'huami'],
    fix: 'Open Zepp, find Apple Health in its settings, and turn on sharing for Steps. Then come back here.' },
  { id: 'huawei', name: 'Huawei', route: 'apple_health', match: ['huawei'],
    fix: 'Open Huawei Health, find Apple Health in its settings, and turn on sharing for Steps. Then come back here.' },
  { id: 'polar', name: 'Polar', route: 'apple_health', match: ['polar'],
    fix: 'Open Polar Flow, find Apple Health in its settings, and turn on sharing for Steps. Then come back here.' },
  { id: 'coros', name: 'COROS', route: 'apple_health', match: ['coros'],
    fix: 'Open COROS, find Apple Health in its settings, and turn on sharing for Steps. Then come back here.' },
  { id: 'suunto', name: 'Suunto', route: 'apple_health', match: ['suunto'],
    fix: 'Open Suunto, find Apple Health in its settings, and turn on sharing for Steps. Then come back here.' },
  { id: 'withings', name: 'Withings', route: 'apple_health', match: ['withings'],
    fix: 'Open Withings, find Apple Health in its settings, and turn on sharing for Steps. Then come back here.' },
  { id: 'other', name: 'Just my iPhone', route: 'apple_health', match: ['com.apple'] },
];

export function matchesDevice(d: Device, bundleId: string, name: string) {
  const s = `${bundleId} ${name}`.toLowerCase();
  return d.match.some((w) => s.includes(w));
}
