import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, View } from 'react-native';
import { Button, Card, fmt, T, useColors } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { Competition, errorText, isoDay, supabase } from '../../lib/supabase';

type Player = { id: string; name: string; device_label: string | null; source: string };
type Row = { player_id: string; day: string; steps: number; updated_at: string };
type Standing = Player & { total: number; today: number; last: string | null };

function ago(ts: string) {
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
}

export default function Leaderboard() {
  const c = useColors();
  const { me } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [comp, setComp] = useState<Competition | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [msg, setMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [cRes, mRes] = await Promise.all([
      supabase.from('competitions').select('id, name, start_day, end_day, join_code').eq('id', id).single(),
      supabase.from('competition_players').select('player_id').eq('competition_id', id),
    ]);
    if (cRes.error || mRes.error) { setMsg(errorText(cRes.error || mRes.error)); return; }
    const k = cRes.data as Competition;
    const ids = mRes.data.map((r) => r.player_id as string);
    const [pRes, sRes] = await Promise.all([
      supabase.from('public_players').select('id, name, device_label, source').in('id', ids),
      supabase.from('daily_steps').select('player_id, day, steps, updated_at').in('player_id', ids).gte('day', k.start_day).lte('day', k.end_day),
    ]);
    if (pRes.error || sRes.error) { setMsg(errorText(pRes.error || sRes.error)); return; }
    const rows = sRes.data as Row[];
    const today = isoDay(new Date());
    setComp(k);
    setStandings((pRes.data as Player[]).map((p) => {
      const mine = rows.filter((r) => r.player_id === p.id);
      return {
        ...p,
        total: mine.reduce((a, r) => a + r.steps, 0),
        today: mine.find((r) => r.day === today)?.steps ?? 0,
        last: mine.reduce<string | null>((a, r) => (a && a > r.updated_at ? a : r.updated_at), null),
      };
    }).sort((a, b) => b.total - a.total));
    setMsg('');
  }, [id]);

  useEffect(() => {
    load();
    // Live: redraw when anyone's steps change.
    const ch = supabase.channel(`steps-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_steps' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const top = Math.max(1, standings[0]?.total ?? 1);
  const now = isoDay(new Date());

  async function leave() {
    Alert.alert('Leave this competition?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('app_leave_competition', { p_competition: id });
        if (error) setMsg(errorText(error)); else router.back();
      } },
    ]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Stack.Screen options={{ title: comp?.name ?? '' }} />
      {!!msg && <T color={c.danger}>{msg}</T>}
      {comp && (
        <T muted style={{ marginBottom: 12 }}>
          {comp.start_day} → {comp.end_day}{now > comp.end_day ? ' · finished' : now < comp.start_day ? ' · not started' : ''}
        </T>
      )}
      <Card>
        {standings.map((p, i) => {
          const lead = i === 0 && p.total > 0;
          return (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
              <T size={20} bold color={lead ? c.gold : undefined} style={{ width: 30, textAlign: 'center' }}>{lead ? '👑' : String(i + 1)}</T>
              <View style={{ flex: 1 }}>
                <T bold>{p.name}{p.id === me?.id ? ' (you)' : ''}</T>
                <T muted size={13}>Today {fmt(p.today)} · {p.last ? `updated ${ago(p.last)}` : 'no data yet'}{p.device_label ? ` · ${p.device_label}` : ''}</T>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: c.accent, marginTop: 6, width: `${(p.total / top) * 100}%` }} />
              </View>
              <T size={20} bold>{fmt(p.total)}</T>
            </View>
          );
        })}
      </Card>
      {comp && (
        <Card>
          <T muted>Invite code</T>
          <T size={28} bold style={{ letterSpacing: 4 }}>{comp.join_code}</T>
          <Button title="Share invite" onPress={() => Share.share({ message: `Join my step competition "${comp.name}" in the Step Competition app. Code: ${comp.join_code}` })} />
        </Card>
      )}
      <Button title="Leave competition" kind="plain" onPress={leave} />
    </ScrollView>
  );
}
