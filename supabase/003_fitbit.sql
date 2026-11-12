-- Fitbit via the Google Health API. Run AFTER 002_app.sql, in Supabase: SQL Editor -> New query -> Run.
-- Safe to re-run.
--
-- Fitbit doesn't write steps into Apple Health, so the server reads them from Google:
-- the app's "Fitbit" tile opens Google sign-in once, the `fitbit` edge function keeps the
-- Google refresh token here, and a cron job pulls everyone's daily steps every 15 minutes.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Google tokens per player. No policies: only the edge function (service role) can read it.
create table if not exists fitbit_links (
  player_id       uuid primary key references players(id) on delete cascade,
  google_user     text,                       -- users/me/identity, to spot account mix-ups
  refresh_token   text not null,
  access_token    text,
  expires_at      timestamptz,
  needs_reconnect boolean not null default false,  -- Google refused the refresh token
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now()
);
alter table fitbit_links enable row level security;

-- Small private key/value store for server-side secrets (service role only).
create table if not exists app_secrets (name text primary key, value text not null);
alter table app_secrets enable row level security;
insert into app_secrets (name, value)
values ('fitbit_cron_secret', encode(gen_random_bytes(24), 'hex'))
on conflict (name) do nothing;

-- Whether the signed-in user's Fitbit is connected (the app shows "Reconnect" when it isn't).
create or replace function app_fitbit_status()
returns table (connected boolean, needs_reconnect boolean, last_synced_at timestamptz)
language sql security definer set search_path = public as $$
  select l.player_id is not null, coalesce(l.needs_reconnect, false), l.last_synced_at
  from players p left join fitbit_links l on l.player_id = p.id
  where p.user_id = auth.uid();
$$;
revoke all on function app_fitbit_status from public, anon;
grant execute on function app_fitbit_status to authenticated;

-- Every 15 minutes, ask the edge function to pull fresh Fitbit steps for everyone.
select cron.unschedule('fitbit-sync') where exists (select 1 from cron.job where jobname = 'fitbit-sync');
select cron.schedule('fitbit-sync', '*/15 * * * *', $$
  select net.http_post(
    url     := 'https://rzkcrgihokfnyjazjtwh.supabase.co/functions/v1/fitbit/sync',
    headers := jsonb_build_object('x-cron-secret', (select value from app_secrets where name = 'fitbit_cron_secret')),
    body    := '{}'::jsonb
  );
$$);
