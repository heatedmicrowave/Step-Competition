# Fitbit setup (one time, on a computer)

Fitbit doesn't share steps with Apple Health, so Fitbit players connect through Google's Health API, which replaced the old Fitbit Web API (switched off 30 Oct 2026). It's free.

## A. Google Cloud (about 15 min)
1. Go to console.cloud.google.com and create a project called `step-competition`.
2. **APIs & Services → Library**: search for **Google Health API** and click **Enable**.
3. **Google Auth Platform** (it may ask you to "Get started"):
   - **Branding**: App name `Step Competition`, plus your email as the support and developer contact.
   - **Audience**: User type **External**. Under **Test users**, add Beatincheeks's Google email.
   - **Data access**: **Add or remove scopes**, search "Google Health API", tick `.../auth/googlehealth.activity_and_fitness.readonly`, then **Update → Save**.
   - **Clients**: **Create client** → type **Web application** → Authorized redirect URI:
     `https://rzkcrgihokfnyjazjtwh.supabase.co/functions/v1/fitbit/callback`
     Copy the **Client ID** and **Client secret**.
4. **Audience → Publish app** (to "In production"). In "Testing" mode Google signs people out every 7 days. Unverified apps can still have up to 100 users, and the only catch is a "Google hasn't verified this app" warning, where you click **Advanced → Go to Step Competition**.

## B. Supabase (about 5 min)
1. **Edge Functions → Deploy a new function → Via editor**. Name it `fitbit`, paste `supabase/functions/fitbit/index.ts`, and deploy.
2. In the function's **Details/Settings**, turn **Enforce JWT verification** off.
3. **Edge Functions → Secrets**: add
   - `GOOGLE_CLIENT_ID` = from step A3
   - `GOOGLE_CLIENT_SECRET` = from step A3
   - `CRON_SECRET` = any long random string you make up
4. **SQL Editor**: paste `supabase/fitbit.sql`, replace `REPLACE_WITH_CRON_SECRET` with the same string, and run it.

## C. Beatincheeks (2 min, on their phone)
1. Make sure the Fitbit / Google Health app is signed in with the same Google account you added as a test user.
2. Open the steps site, save their key under **Who are you?**, then tap **Connect Fitbit** and sign in with Google.
3. They land back on the site, and their steps appear. After that it updates every 20 minutes by itself.
