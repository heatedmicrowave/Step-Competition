-- Step Competition app (v2). Run AFTER schema.sql, in Supabase: SQL Editor -> New query -> Run.
-- Additive: the website and the Garmin Shortcut keep working unchanged.
--
-- What it adds:
--   * App accounts: a player can belong to a signed-in Supabase user (players.user_id).
--   * Any step source (Apple Health, Health Connect, Garmin, Fitbit, Oura, Whoop, ...).
--   * Competitions you join with a 6-letter code instead of "everyone is in".

-- 1. Players can be app users, from any source.
alter table players add column if not exists user_id uuid unique references auth.users(id) on delete cascade;
alter table players alter column secret_key drop not null;
alter table players drop constraint if exists players_source_check;
alter table players add constraint players_source_check check (source in (
  'garmin_shortcut', 'fitbit_google',            -- website era
  'apple_health', 'health_connect',              -- read on the phone by the app
  'garmin', 'fitbit', 'oura', 'whoop', 'polar', 'coros', 'suunto', 'withings',
  'xiaomi', 'amazfit', 'huawei', 'samsung', 'other'
));
-- Which device the steps come from, as shown to other players (e.g. "Garmin Connect").
alter table players add column if not exists device_label text;

create or replace view public_players with (security_invoker = false) as
  select id, name, source, device_label from players;
grant select on public_players to anon, authenticated;

-- 2. Join codes for competitions.
alter table competitions add column if not exists join_code text unique;
update competitions set join_code = upper(substr(md5(random()::text || id::text), 1, 6)) where join_code is null;
alter table competitions alter column join_code set default upper(substr(md5(random()::text), 1, 6));
alter table competitions alter column join_code set not null;

-- Website competitions add every website player (linked or not), but not app-only users (they join by code).
create or replace function create_competition(p_key text, p_name text, p_start date, p_end date)
returns uuid language plpgsql security definer set search_path = public as $$
declare pid uuid; cid uuid;
begin
  select id into pid from players where secret_key = p_key;
  if pid is null then raise exception 'unknown key'; end if;
  insert into competitions (name, start_day, end_day, created_by)
  values (p_name, p_start, p_end, pid) returning id into cid;
  insert into competition_players (competition_id, player_id)
  select cid, id from players where secret_key is not null;
  return cid;
end $$;

-- 3. App functions. All require a signed-in user (auth.uid()).

-- The signed-in user's player row, created on first call.
create or replace function app_me(p_name text default null)
returns table (id uuid, name text, source text, device_label text)
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from players p where p.user_id = uid) then
    insert into players (name, source, user_id, secret_key)
    values (coalesce(nullif(trim(p_name), ''), 'New player'), 'apple_health', uid, null);
  elsif p_name is not null and trim(p_name) <> '' then
    update players p set name = trim(p_name) where p.user_id = uid;
  end if;
  return query select p.id, p.name, p.source, p.device_label from players p where p.user_id = uid;
end $$;

-- Claim an existing website player (and all its step history) with its secret key.
-- Only works if this account has no steps or competitions of its own yet.
create or replace function app_link_player(p_key text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); old_id uuid; mine uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select id into old_id from players where secret_key = p_key and user_id is null;
  if old_id is null then raise exception 'key not found or already linked'; end if;
  select id into mine from players where user_id = uid;
  if mine is not null then
    if exists (select 1 from daily_steps where player_id = mine)
       or exists (select 1 from competition_players where player_id = mine) then
      raise exception 'this account already has its own steps';
    end if;
    delete from players where id = mine;
  end if;
  update players set user_id = uid where id = old_id;
  return old_id;
end $$;

-- Which source this player's steps come from.
create or replace function app_set_source(p_source text, p_device_label text)
returns void language sql security definer set search_path = public as $$
  update players set source = p_source, device_label = p_device_label where user_id = auth.uid();
$$;

-- Upload daily totals: p_days = [{"day":"2026-11-10","steps":8123}, ...]. Overwrites each day.
create or replace function app_submit_steps(p_days jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare pid uuid; n integer;
begin
  select id into pid from players where user_id = auth.uid();
  if pid is null then raise exception 'not signed in'; end if;
  insert into daily_steps (player_id, day, steps, updated_at)
  select pid, (d->>'day')::date, (d->>'steps')::integer, now()
  from jsonb_array_elements(p_days) d
  where (d->>'day')::date between current_date - 31 and current_date + 1
    and (d->>'steps')::integer between 0 and 200000
  on conflict (player_id, day) do update set steps = excluded.steps, updated_at = now();
  get diagnostics n = row_count;
  return n;
end $$;

-- Start a competition. Only the creator is in it; others join with the code.
create or replace function app_create_competition(p_name text, p_start date, p_end date)
returns table (id uuid, join_code text)
language plpgsql security definer set search_path = public as $$
declare pid uuid; cid uuid;
begin
  select p.id into pid from players p where p.user_id = auth.uid();
  if pid is null then raise exception 'not signed in'; end if;
  insert into competitions (name, start_day, end_day, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Step competition'), p_start, p_end, pid)
  returning competitions.id into cid;
  insert into competition_players (competition_id, player_id) values (cid, pid);
  return query select c.id, c.join_code from competitions c where c.id = cid;
end $$;

create or replace function app_join_competition(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare pid uuid; cid uuid;
begin
  select id into pid from players where user_id = auth.uid();
  if pid is null then raise exception 'not signed in'; end if;
  select id into cid from competitions where join_code = upper(trim(p_code));
  if cid is null then raise exception 'no competition with that code'; end if;
  insert into competition_players (competition_id, player_id) values (cid, pid)
  on conflict do nothing;
  return cid;
end $$;

create or replace function app_leave_competition(p_competition uuid)
returns void language sql security definer set search_path = public as $$
  delete from competition_players
  where competition_id = p_competition
    and player_id = (select id from players where user_id = auth.uid());
$$;

revoke all on function app_me, app_link_player, app_set_source, app_submit_steps,
  app_create_competition, app_join_competition, app_leave_competition from public, anon;
grant execute on function app_me, app_link_player, app_set_source, app_submit_steps,
  app_create_competition, app_join_competition, app_leave_competition to authenticated;
grant execute on function create_competition to anon;

-- Signed-in app users read the same public data the website does.
grant select on daily_steps, competitions, competition_players to authenticated;

-- TODO before a public launch: limit reads to competitions you're in (today anyone with the
-- publishable key can read every leaderboard, which is fine for friends but not for strangers).
