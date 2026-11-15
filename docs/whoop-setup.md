# WHOOP setup (one time, on a computer, about 15 minutes)

WHOOP steps come from WHOOP's own developer API. The app's WHOOP tile opens a WHOOP sign-in, and
the `whoop` edge function in Supabase pulls steps every 15 minutes. Free. Up to 10 WHOOP members can
connect without any approval from WHOOP ("Sandbox"); more needs WHOOP's review.

## 1. WHOOP Developer Dashboard (developer-dashboard.whoop.com)

1. Sign in. It uses a WHOOP account login.
2. Create a team (any name, e.g. "Pass1") and then **Create App**:
   - Name: Pass1
   - Scopes: tick **read:cycles** and **offline**
   - Redirect URL: `https://rzkcrgihokfnyjazjtwh.supabase.co/functions/v1/whoop/callback`
   - Privacy policy: https://heatedmicrowave.github.io/Step-Competition/site/privacy.html
3. Save, then copy the **Client ID** and **Client Secret**.

## 2. Supabase

1. **Edge Functions → Secrets**: add `WHOOP_CLIENT_ID` and `WHOOP_CLIENT_SECRET` from step 1.3.
2. **Edge Functions → Deploy a new function → Via editor**: name it `whoop`, paste
   `supabase/functions/whoop/index.ts`, deploy. In the function's settings turn **Verify JWT off**.
3. **SQL Editor**: run `supabase/008_whoop.sql`.

## Good to know

- WHOOP counts steps per cycle (wake-up to next wake-up), not midnight to midnight. Each cycle's
  steps count for the day it started, so numbers can differ a little from other apps.
- WHOOP's own approval tiers: Sandbox 10 members, then 100, 1,000, 5,000, unlimited. Each step up
  needs half the current limit connected, and a manual review.
