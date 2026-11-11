import { Link, Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Button, fmt, Heading, Label, Numeral, Section, T, useColors } from '../components/ui';
import { useAuth } from '../lib/auth';
import { healthAvailable } from '../lib/health';
import { Competition, errorText, isoDay, supabase } from '../lib/supabase';
import { syncSteps } from '../lib/sync';

export default function Home() {
  const c = useColors();
  const { session, me, loading } = useAuth();
  const [comps, setComps] = useState<Competition[] | null>(null);
  const [today, setToday] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    try {
      const steps = await syncSteps();
      if (steps !== null) setToday(steps);
      setStatus(steps === null ? 'Not connected to Apple Health' : `Synced ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
    } catch (e) {
      setStatus(`Sync failed: ${errorText(e)}`);
    }
    const { data, error } = await supabase
      .from('competitions')
      .select('id, name, start_day, end_day, join_code, competition_players!inner(player_id)')
      .eq('competition_players.player_id', me.id)
      .order('end_day', { ascending: false });
    if (error) setStatus(errorText(error));
    else setComps(data as unknown as Competition[]);
  }, [me?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: c.bg }}><ActivityIndicator color={c.ink} /></View>;
  if (!session) return <Redirect href="/sign-in" />;
  if (!me) return <View style={{ flex: 1, padding: 20, backgroundColor: c.bg }}><T>Couldn't load your profile. Pull down to retry.</T></View>;
  if (me.name === 'New player') return <Redirect href="/settings" />;

  const now = isoDay(new Date());
  const live = (comps ?? []).filter((x) => x.end_day >= now);
  const past = (comps ?? []).filter((x) => x.end_day < now);

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: 4 }}
      refreshControl={<RefreshControl tintColor={c.ink} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Link href="/settings" asChild>
        <Pressable style={{ marginBottom: 28 }}>
          <Label>{me.name}{me.device_label ? ` · ${me.device_label}` : ''}</Label>
          <Numeral size={104}>{today === null ? '—' : fmt(today)}</Numeral>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T muted size={14}>Steps today</T>
            <T muted size={14}>{status}</T>
          </View>
          {!healthAvailable() && <T muted size={14}>Apple Health isn't available on this device.</T>}
        </Pressable>
      </Link>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 32 }}>
        <View style={{ flex: 1 }}><Button title="Start one" onPress={() => router.push('/new')} /></View>
        <View style={{ flex: 1 }}><Button title="Join" kind="plain" onPress={() => router.push('/join')} /></View>
      </View>

      {comps === null ? <ActivityIndicator color={c.ink} /> : (
        <>
          <Section label="Running">
            {live.length === 0 ? <T muted>Nothing running. Start one and send your friends the code.</T> : live.map((x) => <CompRow key={x.id} comp={x} />)}
          </Section>
          {past.length > 0 && <Section label="Finished">{past.map((x) => <CompRow key={x.id} comp={x} />)}</Section>}
        </>
      )}
    </ScrollView>
  );
}

function shortDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function CompRow({ comp }: { comp: Competition }) {
  const c = useColors();
  const now = isoDay(new Date());
  const daysLeft = Math.round((new Date(comp.end_day + 'T12:00:00').getTime() - new Date(now + 'T12:00:00').getTime()) / 86400000) + 1;
  const right = now < comp.start_day ? `Starts ${shortDate(comp.start_day)}` : now > comp.end_day ? shortDate(comp.end_day) : daysLeft === 1 ? 'Last day' : `${daysLeft} days left`;
  return (
    <Link href={{ pathname: '/competition/[id]', params: { id: comp.id } }} asChild>
      <Pressable style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: c.hair, opacity: pressed ? 0.6 : 1 })}>
        <View style={{ flex: 1, paddingRight: 12 }}><Heading size={24}>{comp.name}</Heading></View>
        <Label>{right}</Label>
      </Pressable>
    </Link>
  );
}
