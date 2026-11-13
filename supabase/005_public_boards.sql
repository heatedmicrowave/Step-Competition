-- Public leaderboards (v5). Run AFTER 004_courses.sql, in Supabase: SQL Editor -> New query -> Run.
-- Additive and safe to run twice.
--
-- What it adds:
--   * Opt-in public boards: World, and your own country. Nobody appears unless they turn it on.
--   * A unique nickname for the public boards (your private name in friend competitions stays as is).
--   * Anti-cheat: days over 100,000 steps never count on public boards, and a player can be
--     flagged by hand (update players set public_flagged = true where nickname = '...').
--     Hand-entered steps are already left out by the app when it reads Apple Health.

alter table players add column if not exists public_board boolean not null default false;
alter table players add column if not exists nickname text;
alter table players add column if not exists country text;
alter table players add column if not exists public_flagged boolean not null default false;

create unique index if not exists players_nickname_unique on players (lower(nickname));
alter table players drop constraint if exists players_nickname_check;
alter table players add constraint players_nickname_check
  check (nickname is null or nickname ~ '^[A-Za-z0-9_.]{3,20}$');
alter table players drop constraint if exists players_country_check;
alter table players add constraint players_country_check check (country is null or country ~ '^[A-Z]{2}$');

-- The public view must not show the new columns to everyone (country and opt-in stay private).
create or replace view public_players with (security_invoker = false) as
  select id, name, source, device_label from players;

-- Is this nickname free? (Case doesn't matter: "Heated" and "heated" are the same.)
create or replace function app_nickname_free(p_nickname text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from players
    where lower(nickname) = lower(trim(p_nickname))
      and user_id is distinct from auth.uid()
  );
$$;

-- Join, update or leave the public boards.
create or replace function app_set_public(p_on boolean, p_nickname text default null, p_country text default null)
returns table (public_board boolean, nickname text, country text)
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); nick text := trim(p_nickname); cc text := upper(trim(p_country));
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from players p where p.user_id = uid) then raise exception 'not signed in'; end if;
  if p_on then
    if nick is null or nick !~ '^[A-Za-z0-9_.]{3,20}$' then raise exception 'bad nickname'; end if;
    if not app_nickname_free(nick) then raise exception 'nickname taken'; end if;
    if cc is not null and cc !~ '^[A-Z]{2}$' then cc := null; end if;
    update players p set public_board = true, nickname = nick, country = coalesce(cc, p.country)
    where p.user_id = uid;
  else
    -- Leaving keeps the nickname reserved, so nobody else can take it.
    update players p set public_board = false where p.user_id = uid;
  end if;
  return query select p.public_board, p.nickname, p.country from players p where p.user_id = uid;
end $$;

-- My public-board settings.
create or replace function app_public_me()
returns table (public_board boolean, nickname text, country text)
language sql stable security definer set search_path = public as $$
  select p.public_board, p.nickname, p.country from players p where p.user_id = auth.uid();
$$;

-- A public board: p_period 'today' | 'week' | 'month'; p_country null for World.
-- Returns the top p_limit, plus your own row if you're further down.
create or replace function app_public_board(p_period text, p_country text default null, p_limit integer default 100)
returns table (rank bigint, nickname text, country text, steps bigint, is_me boolean)
language sql stable security definer set search_path = public as $$
  with win as (
    select case p_period when 'today' then current_date - 1   -- covers time zones ahead of the server
                         when 'month' then current_date - 29
                         else current_date - 6 end as since
  ),
  totals as (
    select p.id, p.nickname, p.country, p.user_id,
           sum(case when d.steps <= 100000 then d.steps else 0 end)::bigint as steps
    from players p
    join daily_steps d on d.player_id = p.id
    cross join win
    where p.public_board and not p.public_flagged and p.nickname is not null
      and (p_country is null or p.country = upper(p_country))
      and d.day >= win.since
      and d.day <= current_date + 1
      -- 'today' is each player's own latest day (their local today), not the server's date.
      and (p_period <> 'today' or d.day = (select max(d2.day) from daily_steps d2 where d2.player_id = p.id and d2.day <= current_date + 1))
    group by p.id
  ),
  ranked as (
    select rank() over (order by steps desc) as rank, nickname, country, steps, user_id = auth.uid() as is_me
    from totals where steps > 0
  )
  select rank, nickname, country, steps, coalesce(is_me, false) from ranked
  where rank <= least(greatest(p_limit, 1), 500) or is_me
  order by rank, nickname;
$$;

revoke all on function app_nickname_free, app_set_public, app_public_me, app_public_board from public, anon;
grant execute on function app_nickname_free, app_set_public, app_public_me, app_public_board to authenticated;
