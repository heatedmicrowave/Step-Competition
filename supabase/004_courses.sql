-- Challenges with a course: a mountain to climb or a route to walk. Additive and safe to re-run.
-- 'classic' (most steps wins) stays the default, so existing competitions are unchanged.

alter table competitions add column if not exists course text not null default 'classic';

-- Replace the 3-argument version so calls aren't ambiguous; older app builds that leave out
-- p_course still work and get a classic competition.
drop function if exists app_create_competition(text, date, date);

create or replace function app_create_competition(p_name text, p_start date, p_end date, p_course text default 'classic')
returns table (id uuid, join_code text)
language plpgsql security definer set search_path = public as $$
declare pid uuid; cid uuid;
begin
  select p.id into pid from players p where p.user_id = auth.uid();
  if pid is null then raise exception 'not signed in'; end if;
  if p_course not in ('classic', 'vesuvius', 'half_dome', 'matterhorn', 'big_sur') then
    raise exception 'unknown course';
  end if;
  insert into competitions (name, start_day, end_day, created_by, course)
  values (coalesce(nullif(trim(p_name), ''), 'Step competition'), p_start, p_end, pid, p_course)
  returning competitions.id into cid;
  insert into competition_players (competition_id, player_id) values (cid, pid);
  return query select c.id, c.join_code from competitions c where c.id = cid;
end $$;

revoke all on function app_create_competition(text, date, date, text) from public, anon;
grant execute on function app_create_competition(text, date, date, text) to authenticated;
