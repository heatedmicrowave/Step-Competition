-- "X just passed you" notifications (v7). Run AFTER 006_review_flags.sql, in Supabase:
-- SQL Editor -> New query -> Run. Safe to run twice.
--
-- How it works: each phone gives us its Expo push address (app_set_push_token). Whenever someone's
-- steps go up, a trigger checks every challenge they're in that covers that day. Anyone they just
-- overtook gets a push via Expo's free push service, in that person's own language. The same pair
-- in the same challenge is notified at most once every 6 hours, so a back-and-forth day isn't spammy.
-- If sending ever fails, step uploads still work: notifications never block them.

create extension if not exists pg_net;

create table if not exists push_tokens (
  player_id  uuid primary key references players(id) on delete cascade,
  token      text not null,
  lang       text not null default 'en',
  updated_at timestamptz not null default now()
);
alter table push_tokens enable row level security;   -- no policies: only the functions below touch it

create table if not exists pass_notices (
  competition_id uuid not null references competitions(id) on delete cascade,
  passer         uuid not null references players(id) on delete cascade,
  passed         uuid not null references players(id) on delete cascade,
  sent_at        timestamptz not null default now(),
  primary key (competition_id, passer, passed)
);
alter table pass_notices enable row level security;

-- The app calls this after the player allows notifications.
create or replace function app_set_push_token(p_token text, p_lang text default 'en')
returns void language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  select id into pid from players where user_id = auth.uid();
  if pid is null then raise exception 'not signed in'; end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[^\]]+\]$' then raise exception 'bad push token'; end if;
  -- A phone belongs to one player: if it was someone else's (shared phone, re-sign-in), move it.
  delete from push_tokens where token = p_token and player_id <> pid;
  insert into push_tokens (player_id, token, lang, updated_at)
  values (pid, p_token, case when p_lang in ('en','it','nap','es','ja') then p_lang else 'en' end, now())
  on conflict (player_id) do update set token = excluded.token, lang = excluded.lang, updated_at = now();
end $$;

revoke all on function app_set_push_token from public, anon;
grant execute on function app_set_push_token to authenticated;

-- The notice text, in the reader's language.
create or replace function pass_message(p_lang text, p_name text, p_comp text, p_gap bigint)
returns jsonb language sql immutable as $$
  with g as (
    select case when p_lang in ('it','nap','es') then replace(to_char(p_gap, 'FM999,999,999'), ',', '.')
                else to_char(p_gap, 'FM999,999,999') end as n
  )
  select case p_lang
    when 'it'  then jsonb_build_object('title', p_name || ' ti ha appena superato',
                                       'body',  p_comp || ': sei dietro di ' || n || ' passi. Due passi?')
    when 'nap' then jsonb_build_object('title', p_name || ' t''ha passato annanze',
                                       'body',  p_comp || ': staje areto ''e ' || n || ' passe. Jammo, cammina!')
    when 'es'  then jsonb_build_object('title', p_name || ' te acaba de adelantar',
                                       'body',  p_comp || ': vas ' || n || ' pasos por detrás. ¿Un paseo?')
    when 'ja'  then jsonb_build_object('title', p_name || 'さんに抜かれました',
                                       'body',  p_comp || '：' || n || '歩差。ちょっと歩きませんか？')
    else            jsonb_build_object('title', p_name || ' just passed you',
                                       'body',  p_comp || ': you''re ' || n || ' steps behind. Time for a walk?')
  end from g;
$$;

create or replace function notify_passes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  delta bigint := new.steps - coalesce(case when tg_op = 'UPDATE' then old.steps end, 0);
  me_name text;
  msgs jsonb := '[]'::jsonb;
  r record;
begin
  if delta <= 0 then return new; end if;
  select name into me_name from players where id = new.player_id;

  for r in
    with comps as (
      select c.id, c.name, c.start_day, c.end_day
      from competitions c
      join competition_players cp on cp.competition_id = c.id and cp.player_id = new.player_id
      where new.day between c.start_day and c.end_day
    ),
    totals as (
      select cm.id as comp_id, cm.name as comp_name, cp.player_id, coalesce(sum(d.steps), 0)::bigint as total
      from comps cm
      join competition_players cp on cp.competition_id = cm.id
      left join daily_steps d on d.player_id = cp.player_id and d.day between cm.start_day and cm.end_day
      group by cm.id, cm.name, cp.player_id
    ),
    mine as (select comp_id, total as now_total, total - delta as before_total from totals where player_id = new.player_id)
    select t.comp_id, t.comp_name, t.player_id as passed, m.now_total - t.total as gap, pt.token, pt.lang
    from totals t
    join mine m on m.comp_id = t.comp_id
    join push_tokens pt on pt.player_id = t.player_id
    where t.player_id <> new.player_id
      and t.total > 0
      and t.total >= m.before_total      -- they were ahead of (or level with) you...
      and t.total <  m.now_total         -- ...and now you're ahead
      and not exists (
        select 1 from pass_notices n
        where n.competition_id = t.comp_id and n.passer = new.player_id and n.passed = t.player_id
          and n.sent_at > now() - interval '6 hours')
  loop
    insert into pass_notices (competition_id, passer, passed, sent_at)
    values (r.comp_id, new.player_id, r.passed, now())
    on conflict (competition_id, passer, passed) do update set sent_at = now();
    msgs := msgs || jsonb_build_array(
      jsonb_build_object('to', r.token, 'sound', 'default', 'data', jsonb_build_object('competition', r.comp_id))
      || pass_message(r.lang, me_name, r.comp_name, r.gap));
  end loop;

  if jsonb_array_length(msgs) > 0 then
    perform net.http_post(
      url     := 'https://exp.host/--/api/v2/push/send',
      body    := msgs,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
  end if;
  return new;
exception when others then
  -- Never let a notification problem stop steps from saving.
  raise warning 'notify_passes: %', sqlerrm;
  return new;
end $$;

drop trigger if exists daily_steps_notify_passes on daily_steps;
create trigger daily_steps_notify_passes
  after insert or update of steps on daily_steps
  for each row execute function notify_passes();

-- ---------------------------------------------------------------------------------------------
-- Taunts: in each challenge, every 5,000 steps earns one taunt. A taunt is one of a few ready-made
-- lines (index 0..4, the same order as `taunts` in the app), sent as a push in the target's language.

create table if not exists taunts (
  id             bigserial primary key,
  competition_id uuid not null references competitions(id) on delete cascade,
  sender         uuid not null references players(id) on delete cascade,
  target         uuid not null references players(id) on delete cascade,
  line           integer not null,
  sent_at        timestamptz not null default now()
);
create index if not exists taunts_sender on taunts (competition_id, sender);
alter table taunts enable row level security;

create or replace function taunt_line(p_lang text, p_line integer) returns text language sql immutable as $$
  select (case p_lang
    when 'it'  then array['Comodo lì sotto?', 'Da quassù la vista è fantastica 👋', 'Ti si sono addormentate le scarpe?', 'Prendimi se ci riesci 🏃', 'Ti tengo un posto in cima.']
    when 'nap' then array['Staje cummuoto llà abbascio?', '''A vista ''a ccà ncoppa è na bellezza 👋', 'S''hanno addurmute ''e scarpe toje?', 'Acchiappame si si'' capace 🏃', 'Te tengo ''o posto ncopp''â cimma.']
    when 'es'  then array['¿Cómodo ahí abajo?', 'La vista desde aquí arriba es genial 👋', '¿Se te durmieron las zapatillas?', 'Atrápame si puedes 🏃', 'Te guardo un sitio en la cima.']
    when 'ja'  then array['下の居心地はどう？', 'ここからの眺め、最高だよ 👋', '靴、寝ちゃった？', '追いつけるものならどうぞ 🏃', '頂上で席とっておくね。']
    else            array['Getting comfy down there?', 'The view from up here is great 👋', 'Did your shoes fall asleep?', 'Catch me if you can 🏃', 'I''ll save you a spot at the top.']
  end)[p_line + 1];
$$;

-- How many taunts I have left in a challenge: one per 5,000 steps in it, minus those already sent.
create or replace function app_taunts_left(p_competition uuid)
returns integer language sql stable security definer set search_path = public as $$
  with me as (select id from players where user_id = auth.uid()),
  c as (select start_day, end_day from competitions where id = p_competition)
  select greatest(0,
    (coalesce((select sum(d.steps) from daily_steps d, c, me
               where d.player_id = me.id and d.day between c.start_day and c.end_day), 0) / 5000)::integer
    - (select count(*) from taunts t, me where t.competition_id = p_competition and t.sender = me.id)::integer)
  where exists (select 1 from competition_players cp, me where cp.competition_id = p_competition and cp.player_id = me.id);
$$;

create or replace function app_send_taunt(p_competition uuid, p_target uuid, p_line integer)
returns integer language plpgsql security definer set search_path = public as $$
declare pid uuid; pname text; tok text; tlang text; cname text; left_now integer;
begin
  select id, name into pid, pname from players where user_id = auth.uid();
  if pid is null then raise exception 'not signed in'; end if;
  if p_target = pid then raise exception 'no taunts left'; end if;
  if p_line is null or p_line < 0 or p_line > 4 then raise exception 'no taunts left'; end if;
  if not exists (select 1 from competition_players where competition_id = p_competition and player_id = p_target) then
    raise exception 'no taunts left';
  end if;
  left_now := coalesce(app_taunts_left(p_competition), 0);
  if left_now < 1 then raise exception 'no taunts left'; end if;
  -- One taunt per person per minute, so a double tap doesn't spend two.
  if exists (select 1 from taunts where sender = pid and target = p_target and sent_at > now() - interval '1 minute') then
    raise exception 'taunt just sent';
  end if;

  insert into taunts (competition_id, sender, target, line) values (p_competition, pid, p_target, p_line);
  select name into cname from competitions where id = p_competition;
  select token, lang into tok, tlang from push_tokens where player_id = p_target;
  if tok is not null then
    begin
      perform net.http_post(
        url     := 'https://exp.host/--/api/v2/push/send',
        body    := jsonb_build_object('to', tok, 'sound', 'default', 'title', '🔥 ' || pname,
                                      'subtitle', cname, 'body', taunt_line(tlang, p_line),
                                      'data', jsonb_build_object('competition', p_competition)),
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
    exception when others then
      raise warning 'app_send_taunt: %', sqlerrm;
    end;
  end if;
  return left_now - 1;
end $$;

revoke all on function app_taunts_left, app_send_taunt from public, anon;
grant execute on function app_taunts_left, app_send_taunt to authenticated;
