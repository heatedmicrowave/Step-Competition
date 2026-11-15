-- WHOOP via WHOOP's own developer API. Run AFTER 003_fitbit.sql, in Supabase: SQL Editor -> New query -> Run.
-- Safe to re-run.
--
-- The app's "WHOOP" tile opens WHOOP sign-in once, the `whoop` edge function keeps the
-- refresh token here, and a cron job pulls everyone's steps every 15 minutes.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- WHOOP tokens per player. No policies: only the edge function (service role) can read it.
create table if not exists whoop_links (
  player_id       uuid primary key references players(id) on delete cascade,
  refresh_token   text not null,
  access_token    text,
  expires_at      timestamptz,
  needs_reconnect boolean not null default false,  -- WHOOP refused the refresh token
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now()
);
alter table whoop_links enable row level security;

insert into app_secrets (name, value)
values ('whoop_cron_secret', encode(gen_random_bytes(24), 'hex'))
on conflict (name) do nothing;

-- Whether the signed-in user's WHOOP is connected (the app shows "Reconnect WHOOP" when it isn't).
create or replace function app_whoop_status()
returns table (connected boolean, needs_reconnect boolean, last_synced_at timestamptz)
language sql security definer set search_path = public as $$
  select l.player_id is not null, coalesce(l.needs_reconnect, false), l.last_synced_at
  from players p left join whoop_links l on l.player_id = p.id
  where p.user_id = auth.uid();
$$;
revoke all on function app_whoop_status from public, anon;
grant execute on function app_whoop_status to authenticated;

-- Every 15 minutes, ask the edge function to pull fresh WHOOP steps for everyone.
select cron.unschedule('whoop-sync') where exists (select 1 from cron.job where jobname = 'whoop-sync');
select cron.schedule('whoop-sync', '*/15 * * * *', $$
  select net.http_post(
    url     := 'https://rzkcrgihokfnyjazjtwh.supabase.co/functions/v1/whoop/sync',
    headers := jsonb_build_object('x-cron-secret', (select value from app_secrets where name = 'whoop_cron_secret')),
    body    := '{}'::jsonb
  );
$$);
