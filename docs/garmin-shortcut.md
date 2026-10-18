# Garmin steps → leaderboard (iPhone Shortcut)

Each Garmin person does this once on their own iPhone, which takes about 5 minutes. You need your own **secret key** from Maclain.

First check that Garmin is writing to Apple Health: Garmin Connect → More → Settings → Connected Apps → Apple Health → turn on Steps.

## 1. Build the Shortcut

Shortcuts app → **+** → name it **Send Garmin steps**. Add these actions in order:

1. **Find Health Samples**
   - Type: **Steps**
   - Add filter: **Start Date** *is today*
   - Add filter: **Source** *is* **Garmin Connect** (this is what makes it Garmin's number)
2. **Calculate Statistics**: **Sum** of *Health Samples*
3. **Date** (Current Date) → **Format Date**: Custom, `yyyy-MM-dd`
4. **Get Contents of URL**
   - URL: `https://rzkcrgihokfnyjazjtwh.supabase.co/rest/v1/rpc/submit_steps`
   - Method: **POST**
   - Headers:
     - `apikey`: `sb_publishable_kvp1jafJOXqE9_1aHFvS-A_hmd30Gbx`
     - `Content-Type`: `application/json`
   - Request Body: **JSON**
     - `p_key` (Text): *your secret key*
     - `p_day` (Text): *Formatted Date*
     - `p_steps` (Number): *Statistics Result*

Then repeat actions 1 to 4 for **yesterday**: set the filter to *Start Date is yesterday*, and for the date use **Adjust Date** → subtract 1 day before formatting. That way steps synced after midnight still count toward the right day.

Tap ▶︎ once to test, and allow Health access when asked. Your steps should appear on the site.

## 2. Make it run on its own

Shortcuts → **Automation** → **+**:

- **App** → Garmin Connect → **Is Closed** → **Run Immediately** → Send Garmin steps. Each time you check Garmin, the board updates.
- **Time of Day**, as many times as you like (e.g. 10am, 1pm, 4pm, 7pm, 9pm, 11:45pm) → **Run Immediately** → Send Garmin steps.

Note: iOS locks Health data while the phone is locked, so a timed run with the phone locked can miss. The next run catches up, and the "yesterday" step fixes the end of each day.
