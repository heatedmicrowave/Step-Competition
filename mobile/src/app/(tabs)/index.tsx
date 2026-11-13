import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompCard } from '../../components/CompCard';
import { CourseThumb, MountainArt } from '../../components/Mountain';
import { Button, Card, fmt, Label, Numeral, Section, T, Title, useColors } from '../../components/ui';
import { COURSES, size } from '../../lib/courses';
import { useAuth } from '../../lib/auth';
import { healthAvailable } from '../../lib/health';
import { Competition, errorText, isoDay, supabase } from '../../lib/supabase';
import { connectFitbit, fitbitError, fitbitStatus } from '../../lib/fitbit';
import { useT } from '../../lib/i18n';
import { COMP_FIELDS } from '../../lib/standings';
import { syncSteps } from '../../lib/sync';

export default function Home() {
  const c = useColors();
  const { session, me, loading } = useAuth();
  const { t, locale, lang } = useT();
  const insets = useSafeAreaInsets();
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
      .select(`${COMP_FIELDS}, competition_players!inner(player_id)`)
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
  if (!me) return <View style={{ flex: 1, padding: 20, paddingTop: insets.top + 20, backgroundColor: c.bg }}><T>{t.profileFailed}</T></View>;
  if (me.name === 'New player') return <Redirect href="/welcome" />;

  const now = isoDay(new Date());
  const live = (comps ?? []).filter((x) => x.end_day >= now);
  const picks = COURSES.filter((x) => x.kind !== 'classic').slice(0, 3);

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl tintColor={c.ink} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Label>{new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</Label>
      <View style={{ marginBottom: 16 }}><Title size={34}>{t.tabToday}</Title></View>

      <Card style={{ padding: 20, marginBottom: 26, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -24, bottom: -36, width: 190, height: 170, opacity: 0.16 }}>
          <MountainArt art="matterhorn" viewBox="60 0 290 390" />
        </View>
        <Numeral size={64}>{today === null ? '—' : fmt(today)}</Numeral>
        <T bold size={15}>{t.stepsToday}</T>
        <T muted size={13} style={{ marginTop: 16 }}>{me.device_label ? `${me.device_label} · ` : ''}{status}</T>
        {!healthAvailable() && me.source !== 'fitbit' && <T muted size={13}>{t.noHealth}</T>}
        {me.source === 'garmin' && <T muted size={13} style={{ marginTop: 4 }}>{t.garminHint}</T>}
      </Card>

      {reconnect && (
        <Section label="Fitbit">
          <T>{t.fitbitReconnectBody}</T>
          <Button title={t.reconnectFitbit} onPress={async () => { const r = await connectFitbit(); if (r.ok) load(); else setStatus(fitbitError(t, r.code)); }} />
        </Section>
      )}

      {comps === null ? <ActivityIndicator color={c.ink} style={{ marginBottom: 26 }} /> : live.length > 0 && (
        <Section label={t.yourChallenges}>
          {live.map((x) => <CompCard key={x.id} comp={x} />)}
        </Section>
      )}

      <Section label={t.startNew}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {picks.map((x) => (
            <Pressable key={x.id} onPress={() => router.push({ pathname: '/new', params: { course: x.id } })}
              style={({ pressed }) => ({ flex: 1, backgroundColor: c.paper, borderRadius: 18, padding: 10, gap: 6, opacity: pressed ? 0.7 : 1 })}>
              <CourseThumb id={x.id} width="100%" height={64} radius={12} />
              <View>
                <T bold size={14}>{t.courseNames[x.id][0]}</T>
                <T muted size={12}>{size(x, lang, locale)}</T>
              </View>
            </Pressable>
          ))}
        </View>
        {/* The Challenges tab already lists every challenge, so only "Join with code" stays here. */}
        <Button title={t.joinCode} kind="plain" onPress={() => router.push('/join')} />
      </Section>
    </ScrollView>
  );
}
