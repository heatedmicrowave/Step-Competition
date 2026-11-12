# Fitbit setup (one time, on a computer, about 20 minutes)

Fitbit steps come from Google's Health API. The app's Fitbit tile opens a Google sign-in, and
the `fitbit` edge function in Supabase keeps pulling steps every 15 minutes.

## 1. Google Cloud (console.cloud.google.com)

1. Create a project, e.g. "Step Competition".
2. **APIs & Services → Library**: search **Google Health API** and click **Enable**.
3. **Google Auth Platform → Branding**: app name "Step Competition", your email. Save.
4. **Audience**: User type **External**, status **Testing**. Under **Test users**, add the Google
   email of every Fitbit user (e.g. Mitch).
5. **Data Access → Add or remove scopes**: search "Google Health API" and tick
   `.../auth/googlehealth.activity_and_fitness.readonly`. Save.
6. **Clients → Create client**: type **Web application**. Under **Authorized redirect URIs** add:
   `https://rzkcrgihokfnyjazjtwh.supabase.co/functions/v1/fitbit/callback`
   Create, then copy the **Client ID** and **Client secret**.

## 2. Supabase

1. **Edge Functions → Secrets**: add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from step 1.6.
2. **Edge Functions → Deploy a new function → Via editor**: name it `fitbit`, paste
   `supabase/functions/fitbit/index.ts`, deploy. In the function's settings turn **Verify JWT off**
   (Google's redirect can't carry a Supabase token; the function checks sign-in itself).
3. **SQL Editor**: run `supabase/003_fitbit.sql`.

## Good to know

- The Fitbit user's account must already be on a Google account (the Fitbit / Google Health app
  walks them through moving it). Otherwise sign-in says the account has no Fitbit data.
- While the Google app is in **Testing**, Google expires the sign-in after 7 days, so Fitbit users
  see a "Reconnect Fitbit" button about once a week. It's capped at 100 users.
- Removing that limit means Google verification: a review plus a yearly security assessment
  (Google quotes $500 to $4,500 and a few weeks). Only worth it for a public launch.
