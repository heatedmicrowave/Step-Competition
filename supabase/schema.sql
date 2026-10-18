-- Step competition schema. Paste into Supabase: SQL Editor -> New query -> Run.
-- Everyone can read standings; all writes go through the functions below,
-- which require a player's secret key.

create extension if not exists pgcrypto;

create table players (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  source     text not null check (source in ('garmin_shortcut', 'fitbit_google')),
  secret_key text not null unique default encode(gen_random_bytes(16), 'hex')
);

create table daily_steps (
  player_id  uuid not null references players(id) on delete cascade,
  day        date not null,            -- the player's own local date
  steps      integer not null check (steps >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, day)
);

create table competitions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  start_day  date not null,
  end_day    date not null check (end_day >= start_day),
  created_by uuid references players(id),
  created_at timestamptz not null default now()
);

create table competition_players (
  competition_id uuid not null references competitions(id) on delete cascade,
  player_id      uuid not null references players(id) on delete cascade,
  primary key (competition_id, player_id)
);

-- Public view of players that hides secret keys.
create view public_players with (security_invoker = false) as
  select id, name, source from players;

-- Read access for the website (anon key). No direct writes.
alter table players             enable row level security;
alter table daily_steps         enable row level security;
alter table competitions        enable row level security;
alter table competition_players enable row level security;

create policy "read steps"        on daily_steps         for select using (true);
create policy "read competitions" on competitions        for select using (true);
create policy "read members"      on competition_players for select using (true);
grant select on public_players to anon, authenticated;

-- Called by the iPhone Shortcut. Overwrites that day's total.
create function submit_steps(p_key text, p_day date, p_steps integer)
returns void language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  select id into pid from players where secret_key = p_key;
  if pid is null then raise exception 'unknown key'; end if;
  if p_day > current_date + 1 or p_day < current_date - 7 then
    raise exception 'day out of range';
  end if;
  insert into daily_steps (player_id, day, steps, updated_at)
  values (pid, p_day, p_steps, now())
  on conflict (player_id, day) do update
    set steps = excluded.steps, updated_at = now();
end $$;

-- Called by the website. Any player can start a competition; everyone is in it.
create function create_competition(p_key text, p_name text, p_start date, p_end date)
returns uuid language plpgsql security definer set search_path = public as $$
declare pid uuid; cid uuid;
begin
  select id into pid from players where secret_key = p_key;
  if pid is null then raise exception 'unknown key'; end if;
  insert into competitions (name, start_day, end_day, created_by)
  values (p_name, p_start, p_end, pid) returning id into cid;
  insert into competition_players (competition_id, player_id)
  select cid, id from players;
  return cid;
end $$;

-- Checks a key and returns the player's name (the website's "sign in").
create function whoami(p_key text)
returns table (id uuid, name text) language sql security definer set search_path = public as $$
  select id, name from players where secret_key = p_key;
$$;

revoke all on function submit_steps, create_competition, whoami from public;
grant execute on function submit_steps, create_competition, whoami to anon;

-- Live updates for the leaderboard.
alter publication supabase_realtime add table daily_steps;

-- Add the three of you (change the names), then read back the secret keys:
-- insert into players (name, source) values
--   ('Maclain', 'garmin_shortcut'), ('Friend 2', 'garmin_shortcut'), ('Friend 3', 'fitbit_google');
-- select name, secret_key from players;
