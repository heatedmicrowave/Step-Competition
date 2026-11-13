-- Review list for the public boards (v6). Run AFTER 005_public_boards.sql, in Supabase:
-- SQL Editor -> New query -> Run. Safe to run twice.
--
-- This only FLAGS players for a human look; it hides nobody. A player is listed when, in the
-- last 60 days, they had a day over 50,000 steps, or 3+ days in a row at 35,000 or more.
-- To see the list: Table Editor -> public_review (or: select * from public_review;).
-- To hide someone from the public boards: update players set public_flagged = true where nickname = '...';
-- (Days over 100,000 never count on public boards anyway.)

create or replace view public_review as
with recent as (
  select d.player_id, d.day, d.steps
  from daily_steps d
  where d.day >= current_date - 60
),
big as (
  select player_id, count(*) as days_over_50k, max(steps) as best_day
  from recent group by player_id
  having max(steps) > 50000
),
runs as (
  -- Days at 35k+ grouped into unbroken runs (gaps-and-islands).
  select player_id, day - (row_number() over (partition by player_id order by day))::int as grp
  from recent where steps >= 35000
),
streaks as (
  select player_id, max(n) as longest_35k_run
  from (select player_id, grp, count(*) as n from runs group by player_id, grp) r
  group by player_id
  having max(n) >= 3
)
select p.nickname, p.name, p.country, p.public_board, p.public_flagged,
       coalesce(b.best_day, (select max(steps) from recent r where r.player_id = p.id)) as best_day,
       coalesce((select count(*) from recent r where r.player_id = p.id and r.steps > 50000), 0) as days_over_50k,
       coalesce(s.longest_35k_run, 0) as longest_35k_run,
       concat_ws(' + ', case when b.player_id is not null then 'day over 50k' end,
                        case when s.player_id is not null then '3+ days in a row at 35k+' end) as reason
from players p
left join big b on b.player_id = p.id
left join streaks s on s.player_id = p.id
where b.player_id is not null or s.player_id is not null
order by best_day desc;

-- Only you (in the Supabase dashboard) can read this list; the app and the public API cannot.
revoke all on public_review from public, anon, authenticated;
