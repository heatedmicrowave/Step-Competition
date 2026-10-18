# Step Competition

A free leaderboard for step competitions among friends. It's a web page you add to your iPhone home screen. Garmin steps arrive via an iPhone Shortcut, Fitbit steps via Google's Health API (coming next), and everything is stored in Supabase.

## Setup (one time, about 15 minutes)

1. **Supabase**: create a free project at supabase.com. Open SQL Editor, paste `supabase/schema.sql`, and run it. Then run the commented `insert into players …` at the bottom with your real names, followed by `select name, secret_key from players;`, and send each person their key privately.
2. **Site config**: put the Project URL and anon key (Project Settings → API) into `site/config.js`.
3. **Hosting**: repo Settings → Pages → deploy from the `main` branch. Your site is at `https://<you>.github.io/step-competition/site/`.
4. **On each phone**: open the site in Safari → Share → **Add to Home Screen**. Open it, and at the bottom paste your secret key under "Who are you?".
5. **Garmin users**: follow `docs/garmin-shortcut.md`.
6. Start a competition from the site.

## Layout
- `supabase/schema.sql`: tables, read-only access for the site, and key-checked functions for writes
- `site/`: the leaderboard (plain HTML + supabase-js, no build step)
- `docs/garmin-shortcut.md`: iPhone Shortcut that sends Garmin Connect's step count
