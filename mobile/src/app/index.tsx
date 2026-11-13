import { Link, Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Button, fmt, Heading, Label, Numeral, Section, T, useColors } from '../components/ui';
import { useAuth } from '../lib/auth';
import { healthAvailable } from '../lib/health';
import { Competition, errorText, isoDay, supabase } from '../lib/supabase';
import { connectFitbit, fitbitError, fitbitStatus } from '../lib/fitbit';
import { useT } from '../lib/i18n';
import { syncSteps } from '../lib/sync';

export default function Home() {
  const c = useColors();
  const { session, me, loading } = useAuth();
  const { t, locale } = useT();
  const [comps, setComps] = useState<Competition[] | null>(null);
  const [today, setToday] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [reconnect, setReconnect] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    const fitbit = me.source === 'fitbit';
    try {
      const steps = await syncSteps();
      if (steps !== null) setToday(steps);
      if (fitbit) {
        // Fitbit steps arrive on the server; read today's back.
        const { data: row } = await supabase.from('daily_steps').select('steps').eq('player_id', me.id).eq('day', isoDay(new Date())).maybeSingle();
        setToday(row?.steps ?? 0);
        const st = await fitbitStatus();
        setReconnect(!!st?.needs_reconnect);
      }
      setStatus(steps === null && !fitbit ? t.notConnectedHealth : t.synced(new Date().toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })));
    } catch (e) {
      setStatus(t.syncFailed(errorText(e)));
    }
    const { data, error } = await supabase
      .from('competitions')
      .select('id, name, start_day, end_day, join_code, competition_players!inner(player_id)')
      .eq('competition_players.player_id', me.id)
      .order('end_day', { ascending: false });
    if (error) setStatus(errorText(error));
    else setComps(data as unknown as Competition[]);
  }, [me?.id, t, locale]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  // Sync again every time the app comes back to the front.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') load(); });
    return () => sub.remove();
  }, [load]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: c.bg }}><ActivityIndicator color={c.ink} /></View>;
  if (!session) return <Redirect href="/sign-in" />;
  if (!me) return <View style={{ flex: 1, padding: 20, backgroundColor: c.bg }}><T>{t.profileFailed}</T></View>;
  if (me.name === 'New player') return <Redirect href="/welcome" />;

  const now = isoDay(new Date());
  const live = (comps ?? []).filter((x) => x.end_day >= now);
  const past = (comps ?? []).filter((x) => x.end_day < now);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: 4 }}
      refreshControl={<RefreshControl tintColor={c.ink} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Link href="/settings" asChild>
        <Pressable style={{ marginBottom: 28 }}>
          <Label>{me.name}{me.device_label ? ` · ${me.device_label}` : ''}</Label>
          <Numeral size={104}>{today === null ? '—' : fmt(today)}</Numeral>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T muted size={14}>{t.stepsToday}</T>
            <T muted size={14}>{status}</T>
          </View>
          {!healthAvailable() && me.source !== 'fitbit' && <T muted size={14}>{t.noHealth}</T>}
        </Pressable>
      </Link>

      {reconnect && (
        <Section label="Fitbit">
          <T>{t.fitbitReconnectBody}</T>
          <Button title={t.reconnectFitbit} onPress={async () => { const r = await connectFitbit(); if (r.ok) load(); else setStatus(fitbitError(t, r.code)); }} />
        </Section>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 32 }}>
        <View style={{ flex: 1 }}><Button title={t.startOne} onPress={() => router.push('/new')} /></View>
        <View style={{ flex: 1 }}><Button title={t.join} kind="plain" onPress={() => router.push('/join')} /></View>
      </View>

      {comps === null ? <ActivityIndicator color={c.ink} /> : (
        <>
          <Section label={t.running}>
            {live.length === 0 ? <T muted>{t.nothingRunning}</T> : live.map((x) => <CompRow key={x.id} comp={x} />)}
          </Section>
          {past.length > 0 && <Section label={t.finished}>{past.map((x) => <CompRow key={x.id} comp={x} />)}</Section>}
        </>
      )}
    </ScrollView>
  );
}

function shortDate(iso: string, locale: string | undefined) {
  return new Date(iso + 'T12:00:00').toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function CompRow({ comp }: { comp: Competition }) {
  const c = useColors();
  const { t, locale } = useT();
  const now = isoDay(new Date());
  const daysLeft = Math.round((new Date(comp.end_day + 'T12:00:00').getTime() - new Date(now + 'T12:00:00').getTime()) / 86400000) + 1;
  const right = now < comp.start_day ? t.startsOn(shortDate(comp.start_day, locale)) : now > comp.end_day ? shortDate(comp.end_day, locale) : daysLeft === 1 ? t.lastDay : t.daysLeft(daysLeft);
  return (
    <Link href={{ pathname: '/competition/[id]', params: { id: comp.id } }} asChild>
      <Pressable style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: c.hair, opacity: pressed ? 0.6 : 1 })}>
        <View style={{ flex: 1, paddingRight: 12 }}><Heading size={24}>{comp.name}</Heading></View>
        <Label>{right}</Label>
      </Pressable>
    </Link>
  );
}
