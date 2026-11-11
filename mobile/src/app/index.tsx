import { Link, Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Button, Card, fmt, T, useColors } from '../components/ui';
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
      setStatus(steps === null ? 'Steps from this phone are not connected yet.' : `Synced ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
    } catch (e) {
      setStatus(`Couldn't sync steps: ${errorText(e)}`);
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

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: c.bg }}><ActivityIndicator /></View>;
  if (!session) return <Redirect href="/sign-in" />;
  if (!me) return <View style={{ flex: 1, padding: 16, backgroundColor: c.bg }}><T>Couldn't load your profile. Pull to retry.</T></View>;
  if (me.name === 'New player') return <Redirect href="/settings" />;

  const now = isoDay(new Date());
  const live = (comps ?? []).filter((x) => x.end_day >= now);
  const past = (comps ?? []).filter((x) => x.end_day < now);

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Card>
        <T muted>Today, {me.name}</T>
        <T size={40} bold>{today === null ? '–' : fmt(today)}</T>
        <T muted size={13}>{status}{me.device_label ? ` · from ${me.device_label}` : ''}</T>
        {!healthAvailable() && <T muted size={13}>Apple Health isn't available on this device.</T>}
        <Link href="/settings" asChild><Pressable><T color={c.accent}>Change watch or name ›</T></Pressable></Link>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <View style={{ flex: 1 }}><Button title="New competition" onPress={() => router.push('/new')} /></View>
        <View style={{ flex: 1 }}><Button title="Join with code" kind="plain" onPress={() => router.push('/join')} /></View>
      </View>

      {comps === null ? <ActivityIndicator /> : comps.length === 0 ? (
        <T muted>No competitions yet. Start one and send your friends the code.</T>
      ) : (
        <>
          {live.map((x) => <CompRow key={x.id} comp={x} />)}
          {past.length > 0 && <T muted style={{ marginVertical: 8 }}>Finished</T>}
          {past.map((x) => <CompRow key={x.id} comp={x} />)}
        </>
      )}
    </ScrollView>
  );
}

function CompRow({ comp }: { comp: Competition }) {
  const now = isoDay(new Date());
  const state = now < comp.start_day ? 'Starts ' + comp.start_day : now > comp.end_day ? 'Ended ' + comp.end_day : 'Ends ' + comp.end_day;
  return (
    <Link href={{ pathname: '/competition/[id]', params: { id: comp.id } }} asChild>
      <Pressable>
        <Card>
          <T bold size={18}>{comp.name}</T>
          <T muted size={14}>{state}</T>
        </Card>
      </Pressable>
    </Link>
  );
}
