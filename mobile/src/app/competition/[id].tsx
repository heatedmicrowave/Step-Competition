import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, View } from 'react-native';
import { Button, fmt, Heading, Label, Numeral, pad2, Section, T, useColors } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { Competition, errorText, isoDay, supabase } from '../../lib/supabase';

type Player = { id: string; name: string; device_label: string | null; source: string };
type Row = { player_id: string; day: string; steps: number; updated_at: string };
type Standing = Player & { total: number; today: number; last: string | null };

function ago(ts: string) {
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
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

  const days = comp ? Math.round((new Date(comp.end_day + 'T12:00:00').getTime() - new Date(comp.start_day + 'T12:00:00').getTime()) / 86400000) + 1 : 0;
  const dayN = comp ? Math.min(days, Math.max(0, Math.round((new Date(now + 'T12:00:00').getTime() - new Date(comp.start_day + 'T12:00:00').getTime()) / 86400000) + 1)) : 0;
  const phase = !comp ? '' : now > comp.end_day ? 'Final results' : now < comp.start_day ? `Starts ${comp.start_day}` : `Day ${dayN} of ${days}`;

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: 4 }}
      refreshControl={<RefreshControl tintColor={c.ink} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      {!!msg && <T color={c.red}>{msg}</T>}
      {comp && (
        <View style={{ marginBottom: 24 }}>
          <Label color={c.red}>{phase}</Label>
          <Heading size={40}>{comp.name}</Heading>
        </View>
      )}

      <View style={{ borderTopWidth: 2, borderColor: c.rule, marginBottom: 32 }}>
        {standings.map((p, i) => {
          const lead = i === 0 && p.total > 0;
          const gap = i > 0 ? standings[0].total - p.total : 0;
          return (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderColor: c.hair }}>
              <Numeral size={44} color={lead ? c.red : c.muted}>{pad2(i + 1)}</Numeral>
              <View style={{ flex: 1, paddingTop: 4 }}>
                <Heading size={22}>{p.name}{p.id === me?.id ? ' (you)' : ''}</Heading>
                <T muted size={13}>
                  {fmt(p.today)} today · {p.last ? ago(p.last) : 'no data yet'}{p.device_label ? ` · ${p.device_label}` : ''}
                </T>
                <View style={{ height: 3, backgroundColor: c.hair, marginTop: 8 }}>
                  <View style={{ height: 3, backgroundColor: lead ? c.red : c.ink, width: `${(p.total / top) * 100}%` }} />
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Numeral size={36}>{fmt(p.total)}</Numeral>
                {gap > 0 && <T muted size={12}>-{fmt(gap)}</T>}
              </View>
            </View>
          );
        })}
      </View>

      {comp && (
        <Section label="Invite code">
          <Numeral size={56}>{comp.join_code}</Numeral>
          <Button title="Send to a friend" onPress={() => Share.share({ message: `Join "${comp.name}" in Step Competition. Code: ${comp.join_code}` })} />
        </Section>
      )}
      <Button title="Leave" kind="plain" onPress={leave} />
    </ScrollView>
  );
}
