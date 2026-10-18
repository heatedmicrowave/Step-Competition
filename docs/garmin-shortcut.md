# Garmin steps → leaderboard (iPhone Shortcut)

Each Garmin person does this once on their own iPhone. You need your own **secret key** from Maclain.

These steps match the redesigned Shortcuts app in iOS 27. Italian labels are in brackets, since that's what the first setup was done on.

## 0. Garmin → Health
Garmin Connect → More → Settings → Connected Apps → Apple Health: make sure **Steps** is on.

## 1. Build the shortcut
Shortcuts (Comandi) → **+**. Ignore the "describe a shortcut" box and tap **Edit** (Modifica). Add these actions from the search bar at the bottom:

1. **Find Health Samples** (Trova campioni di dati sanitari)
   - Type is **Steps** (Passi)
   - Start Date **is today** (Data di inizio è oggi)
   - Add filter: **Source** (Sorgente) **is Garmin Connect**
   - Allow Health access: "last 30 days and future" is enough
2. **Calculate Statistics** (Calcola statistiche): **Sum** (Somma) of Health Samples
3. **Format Date** (Formatta data): Current Date (Data attuale), Date Format **Custom** (Personalizzato), format string `yyyy-MM-dd`
4. **Get Contents of URL** (Ottieni contenuti dell'URL)
   - URL: type this by hand. Pasting from chat apps can carry hidden formatting that Shortcuts rejects with "couldn't convert from RTF to URL".
     `https://rzkcrgihokfnyjazjtwh.supabase.co/rest/v1/rpc/submit_steps`
   - Method: **POST**
   - Header: `apikey` = `sb_publishable_kvp1jafJOXqE9_1aHFvS-A_hmd30Gbx`
   - Request body: **JSON**, three fields:
     - Text `p_key` = your secret key
     - Text `p_day` = *Formatted Date* (pick it from the bar above the keyboard)
     - Number `p_steps` = *Sum* (make sure no stray `0` sits in front of it)

Rename it **Send Garmin steps** and tap ▶︎ once. Choose **Always allow** when it asks to send data to supabase.co. A "Zero KB" result means it worked, and your steps should show on the site.

## 2. Make it run on its own
In the same shortcut: search → **Automations** (Automazioni) → **App**. The trigger goes to the top. Set it to **Garmin Connect** **is Closed** (Chiuso), with **Automation** on and **Notify** (Avvisa) off.

Now every time you close Garmin Connect, the leaderboard updates. Opening Garmin before bed makes sure late-evening steps count.
