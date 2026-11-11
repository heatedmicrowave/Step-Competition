# Step Competition app (iPhone first, Android next)

Expo / React Native app on the same Supabase project as the website. Anyone signs in with
their email, picks which watch their steps come from, and starts or joins competitions with
a 6-letter code.

## How steps get in

| Watch | Route | Status |
|---|---|---|
| Garmin, Oura, WHOOP, Polar, Coros, Suunto, Withings, Xiaomi Mi Band (Mi Fitness / Zepp Life), Amazfit (Zepp), Huawei (Huawei Health), Apple Watch, iPhone | Read from Apple Health on the phone (HealthKit), filtered to that brand's app so the number matches the watch | built |
| Android phones (any brand, incl. Samsung Galaxy Watch) | Health Connect | next |
| Fitbit | Google Health API on the server (Fitbit doesn't write into Apple Health) | later |

## One-time backend setup

1. Supabase → SQL Editor → run `../supabase/002_app.sql` (safe to re-run; the website keeps working).
2. Supabase → Authentication → URL Configuration → Redirect URLs: add `stepcompetition://**`
   so the sign-in email's link opens the app.

## Running it on your iPhone

HealthKit doesn't work in Expo Go, so the app needs its own build.

- **Free, Mac + cable:** `npm install`, then `npx expo run:ios --device` (Xcode signs it with your
  free Apple ID; it has to be reinstalled every 7 days).
- **Friends' phones / App Store:** needs the Apple Developer Program ($99/year), then
  `npx eas-cli build -p ios` and TestFlight.

## Layout

- `src/app/`: screens (Expo Router). `index` home, `sign-in`, `settings` (name + watch),
  `new`, `join`, `competition/[id]` leaderboard.
- `src/lib/health.ts`: Apple Health reads. `src/lib/sync.ts`: uploads the last 7 days.
- `src/lib/supabase.ts`: client; project URL and publishable key live in `app.json` → `extra`.

## Later: beyond steps

Long-term idea: a fuller health app with a body avatar (height, weight, more), a goal avatar and a
plan to reach it. Steps stay the base. The schema keeps per-day metrics in their own table so new
ones (weight, sleep, workouts) can be added alongside `daily_steps` without changing competitions.
