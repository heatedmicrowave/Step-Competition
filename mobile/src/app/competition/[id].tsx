import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { ChallengeMap, hasMap } from '../../components/ChallengeMap';
import { Fade } from '../../components/Fade';
import { MountainWorld, WorldEvent } from '../../components/MountainWorld';
import { VESUVIUS_HTML } from '../../world/vesuviusHtml';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { artFor, CLIMBER_COLORS, MountainArt, YOU_COLOR } from '../../components/Mountain';
import { Bar, Button, Card, fmt, Label, Numeral, Section, T, Title, useColors } from '../../components/ui';
import { course, position, progress, size } from '../../lib/courses';
import { useAuth } from '../../lib/auth';
import { errorIn, Strings, useT } from '../../lib/i18n';
import { COMP_FIELDS, daysLeftOf, inviteMessage, loadStandings, Standing } from '../../lib/standings';
import { Competition, isoDay, supabase } from '../../lib/supabase';

function ago(t: Strings, ts: string) {
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return t.justNow;
  if (m < 60) return t.minAgo(m);
  if (m < 1440) return t.hAgo(Math.round(m / 60));
  return t.dAgo(Math.round(m / 1440));
}

export default function Leaderboard() {
  const c = useColors();
  const { me } = useAuth();
  const { t, locale, lang } = useT();
  // list=1 shows the plain details page even for a challenge that has its own drawn world.
  const { id, list } = useLocalSearchParams<{ id: string; list?: string }>();
  const insets = useSafeAreaInsets();
  const [comp, setComp] = useState<Competition | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [msg, setMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [taunts, setTaunts] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('competitions').select(COMP_FIELDS).eq('id', id).single();
      if (error) throw error;
      const k = data as Competition;
      setStandings(await loadStandings(k));
      setComp(k);
      setMsg('');
      // Taunts left (null until the server has them, so older setups just don't show any).
      const tl = await supabase.rpc('app_taunts_left', { p_competition: id });
      setTaunts(tl.error || tl.data == null ? null : Number(tl.data));
    } catch (e) {
      setMsg(errorIn(t, e));
    }
  }, [id, t]);

  useEffect(() => {
    load();
    // Live: redraw when anyone's steps change.
    const ch = supabase.channel(`steps-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_steps' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const top = Math.max(1, standings[0]?.total ?? 1);
  const cs = course(comp?.course);
  const journey = cs.kind !== 'classic';
  let other = 0;
  const colors = standings.map((p) => (p.id === me?.id ? YOU_COLOR : CLIMBER_COLORS[other++ % CLIMBER_COLORS.length]));
  const now = isoDay(new Date());

  async function leave() {
    Alert.alert(t.leaveQ, undefined, [
      { text: t.cancel, style: 'cancel' },
      { text: t.leave, style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('app_leave_competition', { p_competition: id });
        if (error) setMsg(errorIn(t, error)); else router.back();
      } },
    ]);
  }

  function taunt(p: Standing) {
    Alert.alert(t.tauntTo(p.name), undefined, [
      ...t.taunts.map((line, i) => ({ text: line, onPress: async () => {
        const { data, error } = await supabase.rpc('app_send_taunt', { p_competition: id, p_target: p.id, p_line: i });
        if (error) { setMsg(errorIn(t, error)); Alert.alert(errorIn(t, error)); return; }
        setTaunts(Number(data));
        Alert.alert(t.tauntSent(p.name));
      } })),
      { text: t.cancel, style: 'cancel' as const },
    ]);
  }

  const days = comp ? Math.round((new Date(comp.end_day + 'T12:00:00').getTime() - new Date(comp.start_day + 'T12:00:00').getTime()) / 86400000) + 1 : 0;
  const dayN = comp ? Math.min(days, Math.max(0, Math.round((new Date(now + 'T12:00:00').getTime() - new Date(comp.start_day + 'T12:00:00').getTime()) / 86400000) + 1)) : 0;
  const phase = !comp ? '' : now > comp.end_day ? t.finalResults : now < comp.start_day ? t.startsOn(new Date(comp.start_day + 'T12:00:00').toLocaleDateString(locale, { month: 'short', day: 'numeric' })) : t.dayOf(dayN, days);

  // Still loading: a quiet screen, so a challenge with its own world doesn't flash the plain page first.
  if (!comp && !list && !msg) return (<><Stack.Screen options={{ headerShown: false, gestureEnabled: false }} /><View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}><ActivityIndicator color={c.ink} /></View></>);

  // Vesuvius has its own drawn world: Naples, the Osservatorio and the crater.
  if (comp && cs.id === 'vesuvius' && !list) {
    const V = t.vesuvius as Record<string, any>;
    const tp = (k: string, o: Record<string, string | number>) => String(V[k]).replace(/\{(\w+)\}/g, (_, x) => String(o[x] ?? ''));
    const r = standings.findIndex((p) => p.id === me?.id);
    const mine = r >= 0 ? standings[r] : null;
    const heroSub = !mine ? '' : r === 0 ? (standings.length > 1 ? tp('leadBy', { n: fmt(mine.total - standings[1].total) }) : '')
      : `#${r + 1} · ${tp('behind', { n: fmt(standings[r - 1].total - mine.total), name: standings[r - 1].name })}`;
    const { left, over } = daysLeftOf(comp);
    const when = over ? t.finalResults : left === 1 ? t.lastDay : t.daysLeft(left);
    const days: number[] = [];
    for (let d = new Date(comp.start_day + 'T12:00:00'); isoDay(d) <= now && isoDay(d) <= comp.end_day; d.setDate(d.getDate() + 1)) {
      const k = isoDay(d); days.push(standings.reduce((a, p) => a + (p.byDay?.[k] ?? 0), 0));
    }
    const data = {
      lang, locale, insetTop: insets.top, name: comp.name, goal: cs.goal, code: comp.join_code,
      heroK: `${comp.name} · ${phase}`, heroSub, kicker: phase, ends: `${when} · ${tp('climbers', { n: standings.length })}`, sub: V.sub, place: mine ? `#${r + 1}` : '—',
      hikers: standings.map((p, i) => ({ id: p.id, n: (p.name.trim()[0] ?? '?').toUpperCase(), name: p.name, c: colors[i], st: p.total, today: p.today, watch: p.device_label ?? p.source, me: p.id === me?.id || undefined })),
      days, t: V,
    };
    const onEvent = (e: WorldEvent) => {
      if (e.type === 'back') router.back();
      else if (e.type === 'details') router.push({ pathname: '/competition/[id]', params: { id: comp.id, list: '1' } });
      else if (e.type === 'invite') Share.share({ message: inviteMessage(t.shareMsg(comp.name, comp.join_code), comp.join_code) });
      else if (e.type === 'taunt') {
        const p = standings.find((x) => x.id === e.player);
        if (!p || p.id === me?.id) return;
        if (!taunts) Alert.alert(t.server['no taunts left'] ?? '', t.tauntsHow);
        else taunt(p);
      }
    };
    return (
      <>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <MountainWorld html={VESUVIUS_HTML} data={data} onEvent={onEvent} />
      </>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 48 }}
      refreshControl={<RefreshControl tintColor={c.ink} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      {!!msg && <T color={c.red}>{msg}</T>}
      {comp && (
        <View style={{ marginBottom: 16 }}>
          <Label color={c.red}>{phase}</Label>
          <Title size={32}>{comp.name}</Title>
          {journey && <T muted size={14}>{t.courseNames[cs.id][1]} · {cs.kind === 'climb' ? t.top(size(cs, lang, locale)) : t.routeLen(size(cs, lang, locale))}</T>}
        </View>
      )}

      {comp && journey && (
        // The climb: everyone is a dot on the trail.
        hasMap(cs) ? (
          // Edge to edge, fading into the page at top and bottom: part of the screen, not a box.
          <View style={{ height: 480, marginHorizontal: -20, marginTop: -8, marginBottom: 8, backgroundColor: c.bg }}>
            <ChallengeMap course={cs} lang={lang} locale={locale} stepsWord={t.stepsWord}
              climbers={standings.map((p, i) => ({ id: p.id, initial: (p.name.trim()[0] ?? '?').toUpperCase(), color: colors[i], steps: p.total, you: p.id === me?.id }))} />
            <Fade edge="top" height={70} color={c.bg} />
            <Fade edge="bottom" height={40} color={c.bg} />
          </View>
        ) : (
        <View style={{ height: 360, borderRadius: 24, overflow: 'hidden', backgroundColor: '#1B1714', marginBottom: 20 }}>
          <MountainArt art={artFor(cs.id)} showTrail viewBox={cs.kind === 'route' ? '0 0 390 520' : '0 10 390 500'} slice={false}
            climbers={standings.map((p, i) => ({ id: p.id, initial: (p.name.trim()[0] ?? '?').toUpperCase(), color: colors[i], frac: progress(cs, p.total) }))} />
        </View>
        )
      )}

      {taunts != null && standings.length > 1 && (
        <View style={{ marginBottom: 10, gap: 2 }}>
          {taunts > 0 && <T bold>{t.tauntsLeft(taunts)}</T>}
          <T muted size={13}>{t.tauntsHow}</T>
        </View>
      )}
      <Card style={{ padding: 0, marginBottom: 26 }}>
        {standings.map((p, i) => {
          const lead = i === 0 && p.total > 0;
          const gap = i > 0 ? standings[0].total - p.total : 0;
          const done = journey && progress(cs, p.total) >= 1;
          return (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderColor: c.hair }}>
              <View style={{ width: 28, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: lead ? c.red : c.muted, fontVariant: ['tabular-nums'] }}>{i + 1}</Text>
              </View>
              {journey && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors[i], borderWidth: 1, borderColor: c.rule }} />}
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T bold>{p.name}{p.id === me?.id ? ` (${t.you})` : ''}</T>
                  {!!taunts && p.id !== me?.id && (
                    <Pressable onPress={() => taunt(p)} hitSlop={10} accessibilityLabel={t.tauntTo(p.name)}
                      style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: c.hair }}>
                      <Text style={{ fontSize: 14 }}>🔥</Text>
                    </Pressable>
                  )}
                </View>
                <T muted size={12}>{t.todaySteps(fmt(p.today))} · {p.last ? ago(t, p.last) : t.noData}{p.device_label ? ` · ${p.device_label}` : ''}</T>
                <Bar value={journey ? progress(cs, p.total) : p.total / top} color={lead ? c.red : c.ink} />
              </View>
              <View style={{ alignItems: 'flex-end', minWidth: 76 }}>
                <Numeral size={22}>{journey ? position(cs, p.total, lang, locale) : fmt(p.total)}</Numeral>
                <T muted size={12}>
                  {journey ? (done ? (cs.kind === 'climb' ? t.atTop : t.atEnd) : t.toGo(fmt(cs.goal - p.total))) : gap > 0 ? `-${fmt(gap)}` : ' '}
                </T>
              </View>
            </View>
          );
        })}
      </Card>

      {comp && (
        <Section label={t.inviteCode}>
          <Card style={{ alignItems: 'center', gap: 12 }}>
            <Numeral size={44}>{comp.join_code}</Numeral>
            <View style={{ alignSelf: 'stretch' }}><Button title={t.sendFriend} onPress={() => Share.share({ message: inviteMessage(t.shareMsg(comp.name, comp.join_code), comp.join_code) })} /></View>
          </Card>
        </Section>
      )}
      <Pressable onPress={leave} style={{ alignItems: 'center', padding: 12 }} hitSlop={8}>
        <Text style={{ color: c.red, fontSize: 16, fontWeight: '600' }}>{t.leave}</Text>
      </Pressable>
    </ScrollView>
  );
}
