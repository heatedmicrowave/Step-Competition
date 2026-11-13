// Today: the drawn Matterhorn. Base camp is you (your chalet holds the settings, the mailbox is
// notifications), the Hörnli Hut's trail signs are your challenges, and the summit book is the
// leaderboard. The drawing itself lives in src/world/world.html; this screen feeds it the numbers.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MountainWorld, WorldBoard, WorldCourse, WorldData, WorldEvent, WorldHiker, WorldSign } from '../../components/MountainWorld';
import { T, useColors } from '../../components/ui';
import { course, COURSES, position, progress, size } from '../../lib/courses';
import { useAuth } from '../../lib/auth';
import { Lang, LANGS, errorIn, useT } from '../../lib/i18n';
import { countryName, loadBoard, loadPublicMe, phoneCountry } from '../../lib/publicBoard';
import { register } from '../../lib/push';
import { COMP_FIELDS, daysLeftOf, inviteMessage, loadStandings, Standing } from '../../lib/standings';
import { hasWorld } from '../../lib/worlds';
import { Competition, errorText, isoDay, supabase } from '../../lib/supabase';
import { fitbitStatus } from '../../lib/fitbit';
import { syncSteps } from '../../lib/sync';

const ME = '#C14A1F';
const OTHERS = ['#3E6C8A', '#4E7A4A', '#8A5A9E', '#B5892E', '#5F6B73', '#2F7F7A'];
const SEEN = 'world.seen'; // today's steps the last time you looked, for the "+N today" walk

type Loaded = {
  today: number | null;
  sync: string;
  week: number;
  best: { day: string; steps: number } | null;
  alerts: boolean;
  gain: number;
  nickname: string | null;
  publicOn: boolean;
  boards: WorldBoard[];
  live: { comp: Competition; board: Standing[] }[];
};

function monday() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoDay(d);
}

export default function Home() {
  const c = useColors();
  const { session, me, loading } = useAuth();
  const { t, lang, locale, setChoice } = useT();
  const insets = useSafeAreaInsets();
  const [d, setD] = useState<Loaded | null>(null);
  const hikers = useRef<{ comp: Competition; list: Standing[] } | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (!me) return;
    const fitbit = me.source === 'fitbit';
    const now = isoDay(new Date());
    let today: number | null = null;
    let sync = '';
    try {
      today = await syncSteps();
      if (fitbit) {
        // Fitbit steps arrive on the server; read today's back.
        const { data: row } = await supabase.from('daily_steps').select('steps').eq('player_id', me.id).eq('day', now).maybeSingle();
        today = row?.steps ?? 0;
        const st = await fitbitStatus();
        if (st?.needs_reconnect) sync = t.reconnectFitbit;
      }
      if (!sync) sync = today === null && !fitbit ? t.notConnectedHealth : t.synced(new Date().toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }));
    } catch (e) {
      sync = t.syncFailed(errorText(e));
    }

    // This week, from Monday, and its best day.
    let week = 0;
    let best: Loaded['best'] = null;
    const { data: days } = await supabase.from('daily_steps').select('day, steps').eq('player_id', me.id).gte('day', monday());
    for (const r of (days ?? []) as { day: string; steps: number }[]) {
      const s = r.day === now && today !== null ? today : r.steps;
      week += s;
      if (s > 0 && (!best || s > best.steps)) best = { day: new Date(r.day + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long' }), steps: s };
    }
    if (today !== null && !(days ?? []).some((r: any) => r.day === now)) week += today;

    // "+N today": how far you've walked since you last looked.
    let gain = 0;
    if (today !== null) {
      try {
        const seen = JSON.parse((await AsyncStorage.getItem(SEEN)) ?? 'null') as { day: string; steps: number } | null;
        gain = seen && seen.day === now ? Math.max(0, today - seen.steps) : today;
        await AsyncStorage.setItem(SEEN, JSON.stringify({ day: now, steps: today }));
      } catch {}
    }

    // The mailbox flag: is the phone allowed to show our notifications?
    let alerts = false;
    try { alerts = (await Notifications.getPermissionsAsync()).granted; } catch {}

    // Challenges you're in that haven't ended.
    const { data: comps } = await supabase
      .from('competitions')
      .select(`${COMP_FIELDS}, competition_players!inner(player_id)`)
      .eq('competition_players.player_id', me.id)
      .gte('end_day', now)
      .order('end_day', { ascending: true });
    const live = await Promise.all(((comps ?? []) as unknown as Competition[]).map(async (comp) => ({ comp, board: await loadStandings(comp).catch(() => [] as Standing[]) })));

    // The summit book: the world and your country, this week. Only if you've joined the public board.
    let publicOn = false, nickname: string | null = null;
    const boards: WorldBoard[] = [];
    try {
      const pub = await loadPublicMe();
      publicOn = pub.public_board;
      nickname = pub.nickname;
      if (publicOn) {
        const country = pub.country ?? phoneCountry();
        const [world, home] = await Promise.all([loadBoard('week', null), country ? loadBoard('week', country) : Promise.resolve(null)]);
        boards.push({ key: 'world', label: t.boardWorld, rows: world.map((r) => ({ rank: r.rank, name: r.nickname, sub: r.country ?? '', steps: r.steps, me: r.is_me })) });
        if (home && country) boards.push({ key: country, label: countryName(country, locale), rows: home.map((r) => ({ rank: r.rank, name: r.nickname, sub: '', steps: r.steps, me: r.is_me })) });
      }
    } catch {}

    setD({ today, sync, week, best, alerts, gain, nickname, publicOn, boards, live });
  }, [me?.id, me?.device_label, t, locale]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  // Sync again every time the app comes back to the front (also picks up a changed notification setting).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') load(); });
    return () => sub.remove();
  }, [load]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: c.bg }}><ActivityIndicator color={c.ink} /></View>;
  if (!session) return <Redirect href="/sign-in" />;
  if (!me) return <View style={{ flex: 1, padding: 20, paddingTop: insets.top + 20, backgroundColor: c.bg }}><T>{t.profileFailed}</T></View>;
  if (me.name === 'New player') return <Redirect href="/welcome" />;

  const now = isoDay(new Date());
  const kfmt = (st: number) => `${(st / 1000).toFixed(st >= 100000 || st % 1000 < 50 ? 0 : 1)}K`;
  const fmt = (n: number) => n.toLocaleString(locale);

  // Trail signs at the hut, one per challenge.
  const live = d?.live ?? [];
  const signs: WorldSign[] = live.slice(0, 3).map(({ comp, board }) => {
    const cs = course(comp.course);
    const journey = cs.kind !== 'classic';
    const rank = board.findIndex((p) => p.id === me.id);
    const mine = rank >= 0 ? board[rank] : null;
    const { left, upcoming } = daysLeftOf(comp);
    const total = Math.round((new Date(comp.end_day + 'T12:00:00').getTime() - new Date(comp.start_day + 'T12:00:00').getTime()) / 86400000) + 1;
    const short = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    const lead = board[0]?.total || 0;
    let k = 0;
    return {
      id: comp.id,
      title: comp.name,
      sub: !mine ? t.courseNames[cs.id][0] : journey ? `#${rank + 1} · ${position(cs, mine.total, lang, locale)}` : `#${rank + 1} · ${fmt(mine.total)} ${t.stepsWord}`,
      kicker: upcoming ? t.startsOn(short(comp.start_day)) : t.dayOf(total - left + 1, total),
      detail: `${t.courseNames[cs.id].join(' · ')}. ${upcoming ? '' : left === 1 ? t.lastDay : t.daysLeft(left)}`,
      dots: board.map((p) => [Math.round((journey ? progress(cs, p.total) : lead ? p.total / lead : 0) * 1000) / 10, p.id === me.id ? ME : OTHERS[k++ % OTHERS.length]] as [number, string]),
      // The noticeboard: top five, and you if you're further down.
      rows: board.map((p, i) => ({ rank: i + 1, name: p.name, val: `${fmt(p.total)} ${t.stepsWord}`, me: p.id === me.id || undefined }))
        .filter((r, i) => i < 5 || r.me).slice(0, 6),
      world: hasWorld(cs.id) || undefined,
    };
  });

  // Hikers on the mountain: everyone in your main climb (a climb first, then a route).
  const started = live.filter((x) => x.comp.start_day <= now && x.board.length > 0);
  const main = started.find((x) => course(x.comp.course).id === 'matterhorn')
    ?? started.find((x) => course(x.comp.course).kind === 'climb')
    ?? started.find((x) => course(x.comp.course).kind === 'route');
  hikers.current = main ? { comp: main.comp, list: main.board } : null;
  let k = 0;
  const climb: WorldData['climb'] = main ? {
    id: main.comp.id,
    name: main.comp.name,
    goal: course(main.comp.course).goal,
    hikers: main.board.map((p): WorldHiker => ({
      id: p.id,
      n: (p.name.trim()[0] ?? '?').toUpperCase(),
      name: p.name,
      c: p.id === me.id ? ME : OTHERS[k++ % OTHERS.length],
      st: p.total,
      today: p.today,
      watch: p.device_label ?? p.source,
      me: p.id === me.id || undefined,
    })),
  } : null;

  const data: WorldData = {
    lang,
    locale,
    insetTop: insets.top,
    today: d ? d.today : null,
    sync: d?.sync ?? '',
    week: d?.week ?? 0,
    best: d?.best ?? null,
    name: me.name,
    nickname: d?.nickname ?? null,
    watch: me.device_label ?? '',
    alerts: d?.alerts ?? false,
    gain: climb ? d?.gain ?? 0 : 0,
    publicOn: d?.publicOn ?? false,
    t: { ...t.world, stepsToday: t.stepsToday, leave: t.leave, length: t.length, starts: t.starts, today: t.today, tomorrow: t.tomorrow, startBtn: t.startBtn, lengths: t.lengths, comingSoon: t.comingSoon },
    signs,
    climb,
    boards: d?.boards ?? [],
    courses: COURSES.map((x): WorldCourse => ({
      id: x.id,
      name: t.courseNames[x.id][0],
      sub: x.kind === 'climb' ? `${t.courseNames[x.id][1]} · ${size(x, lang, locale)}` : x.kind === 'route' ? size(x, lang, locale) : t.courseNames[x.id][1],
      soon: x.soon || undefined,
    })),
    focus,
  };

  async function taunt(compId: string, playerId: string) {
    const h = hikers.current;
    const p = h && h.comp.id === compId ? h.list.find((x) => x.id === playerId) : null;
    if (!p || p.id === me!.id) return;
    const { data: left } = await supabase.rpc('app_taunts_left', { p_competition: compId });
    if (!Number(left)) { Alert.alert(t.server['no taunts left'] ?? '', t.tauntsHow); return; }
    Alert.alert(t.tauntTo(p.name), t.tauntsLeft(Number(left)), [
      ...t.taunts.map((line, n) => ({ text: line, onPress: async () => {
        const { error } = await supabase.rpc('app_send_taunt', { p_competition: compId, p_target: p.id, p_line: n });
        Alert.alert(error ? errorIn(t, error) : t.tauntSent(p.name));
      } })),
      { text: t.cancel, style: 'cancel' as const },
    ]);
  }

  async function alertsTapped() {
    try {
      const perm = await Notifications.getPermissionsAsync();
      if (!perm.granted && perm.canAskAgain) {
        await register(lang);
        load();
      } else {
        // Already on, or turned off in iOS Settings: only Settings can change it now.
        Linking.openSettings();
      }
    } catch {}
  }

  // Start a challenge from the hut's noticeboard. A climb with its own world opens it; anything else
  // shows up on the noticeboard right away.
  async function create(id: string, days: number, tomorrow: boolean) {
    if (busy.current) return;
    busy.current = true;
    const cs = course(id);
    const start = new Date(); if (tomorrow) start.setDate(start.getDate() + 1);
    const end = new Date(start); end.setDate(end.getDate() + Math.max(1, days) - 1);
    const { data: made, error } = await supabase.rpc('app_create_competition', { p_name: t.courseNames[cs.id][0], p_start: isoDay(start), p_end: isoDay(end), p_course: cs.id });
    busy.current = false;
    if (error) { Alert.alert(errorIn(t, error)); return; }
    const newId = (made as { id: string }[])[0].id;
    await load();
    if (hasWorld(cs.id)) router.push({ pathname: '/competition/[id]', params: { id: newId } });
    else setFocus(newId);
  }

  function joinWithCode() {
    Alert.prompt(t.joinCode, t.inviteCode, async (raw) => {
      const code = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (!code) return;
      const { data: joined, error } = await supabase.rpc('app_join_competition', { p_code: code });
      if (error) { Alert.alert(errorIn(t, error)); return; }
      await load();
      const x = await supabase.from('competitions').select('course').eq('id', joined as string).single();
      if (hasWorld(course(x.data?.course).id)) router.push({ pathname: '/competition/[id]', params: { id: joined as string } });
      else setFocus(joined as string);
    }, 'plain-text', '', 'default');
  }

  function leave(id: string) {
    Alert.alert(t.leaveQ, undefined, [
      { text: t.cancel, style: 'cancel' },
      { text: t.leave, style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('app_leave_competition', { p_competition: id });
        if (error) Alert.alert(errorIn(t, error)); else load();
      } },
    ]);
  }

  function onEvent(e: WorldEvent) {
    switch (e.type) {
      case 'open': if (e.id) router.push({ pathname: '/competition/[id]', params: { id: e.id } }); break;
      case 'invite': {
        const x = live.find((l) => l.comp.id === e.id);
        if (x) Share.share({ message: inviteMessage(t.shareMsg(x.comp.name, x.comp.join_code), x.comp.join_code) });
        break;
      }
      case 'create': if (e.id) create(e.id, e.days ?? 7, !!e.tomorrow); break;
      case 'leave': if (e.id) leave(e.id); break;
      case 'join': joinWithCode(); break;
      case 'alerts': alertsTapped(); break;
      case 'lang': if (LANGS.includes(e.id as Lang)) setChoice(e.id as Lang); break;
      case 'account': router.navigate('/account'); break;
      case 'board': router.navigate('/board'); break;
      case 'taunt': if (e.id && e.player) taunt(e.id, e.player); break;
    }
  }

  return <MountainWorld data={data} onEvent={onEvent} />;
}
