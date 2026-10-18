-- Fitbit connection. Run in Supabase SQL Editor AFTER deploying the "fitbit" edge function.
-- Replace REPLACE_WITH_CRON_SECRET below with the same CRON_SECRET you set as a function secret.

create table fitbit_tokens (
  player_id       uuid primary key references players(id) on delete cascade,
  refresh_token   text not null,
  access_token    text,
  expires_at      timestamptz,
  needs_reconnect boolean not null default false,
  last_synced     timestamptz,
  last_error      text
);
-- RLS on with no policies: only the edge function (service role) can touch tokens.
alter table fitbit_tokens enable row level security;

-- What the site may see: whether someone is connected and when it last synced.
create view fitbit_status with (security_invoker = false) as
  select player_id, needs_reconnect, last_synced from fitbit_tokens;
grant select on fitbit_status to anon, authenticated;

-- Pull Fitbit steps every 20 minutes.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

select cron.schedule('fitbit-sync', '*/20 * * * *', $$
  select net.http_post(
    url     := 'https://rzkcrgihokfnyjazjtwh.supabase.co/functions/v1/fitbit/sync',
    headers := '{"x-cron-secret": "REPLACE_WITH_CRON_SECRET", "content-type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
$$);
