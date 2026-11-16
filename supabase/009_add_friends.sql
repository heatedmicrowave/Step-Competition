-- Add friends to a challenge with one tap (v9). Run AFTER 008_whoop.sql, in Supabase:
-- SQL Editor -> New query -> Run. Safe to run twice.
--
-- "People you know" = anyone who has been in a challenge with you. You can add them straight into
-- a challenge you're in, and they get a push saying who added them. Anyone else still joins with
-- the invite link or code, so a stranger can never be dropped into your challenge.

-- Everyone you've shared a challenge with, newest first, and whether they're already in p_competition.
create or replace function app_people(p_competition uuid default null)
returns table (id uuid, name text, device_label text, in_it boolean)
language sql stable security definer set search_path = public as $$
  with me as (select id from players where user_id = auth.uid()),
  known as (
    select other.player_id as pid, max(c.end_day) as last_day
    from competition_players mine
    join competition_players other on other.competition_id = mine.competition_id and other.player_id <> mine.player_id
    join competitions c on c.id = mine.competition_id
    where mine.player_id = (select id from me)
    group by other.player_id
  )
  select p.id, p.name, p.device_label,
         exists (select 1 from competition_players cp where cp.competition_id = p_competition and cp.player_id = p.id)
  from known k join players p on p.id = k.pid
  order by k.last_day desc, p.name
  limit 50;
$$;

-- Put someone you know into a challenge you're in.
create or replace function app_add_friend(p_competition uuid, p_player uuid)
returns void language plpgsql security definer set search_path = public as $$
declare pid uuid; pname text; cname text; tok text; tlang text; added integer;
begin
  select id, name into pid, pname from players where user_id = auth.uid();
  if pid is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from competition_players where competition_id = p_competition and player_id = pid) then
    raise exception 'not in that challenge';
  end if;
  if not exists (select 1 from app_people() k where k.id = p_player) then
    raise exception 'not someone you know';
  end if;
  insert into competition_players (competition_id, player_id) values (p_competition, p_player)
  on conflict do nothing;
  get diagnostics added = row_count;
  if added = 0 then return; end if;

  select name into cname from competitions where id = p_competition;
  select token, lang into tok, tlang from push_tokens where player_id = p_player;
  if tok is not null and tok <> 'ExpoPushToken[off]' then
    begin
      perform net.http_post(
        url     := 'https://exp.host/--/api/v2/push/send',
        body    := jsonb_build_object('to', tok, 'sound', 'default', 'title', '🏔 ' || cname,
                                      'body', case tlang
                                        when 'it'  then pname || ' ti ha aggiunto alla sfida. Si parte!'
                                        when 'nap' then pname || ' t''ha miso dint''â sfida. Jamme!'
                                        when 'es'  then pname || ' te ha añadido al reto. ¡A caminar!'
                                        when 'ja'  then pname || 'さんがあなたをチャレンジに追加しました。'
                                        else pname || ' added you to the challenge. Let''s go!' end,
                                      'data', jsonb_build_object('competition', p_competition)),
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
    exception when others then
      raise warning 'app_add_friend: %', sqlerrm;
    end;
  end if;
end $$;

revoke all on function app_people, app_add_friend from public, anon;
grant execute on function app_people, app_add_friend to authenticated;
