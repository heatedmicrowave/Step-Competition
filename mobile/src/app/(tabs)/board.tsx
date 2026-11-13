// The public leaderboard: World and your country, today / this week / this month.
// Opt-in: until you join, this tab explains it and asks for a nickname.
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, fmt, Input, Label, T, Title, useColors } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { errorIn, useT } from '../../lib/i18n';
import {
  BoardRow, countryName, loadBoard, loadPublicMe, nicknameFree, NICK_RE, Period, phoneCountry, PublicMe, setPublic, suggestNick,
} from '../../lib/publicBoard';

function Pills<V extends string>({ options, value, onChange }: { options: { label: string; value: V }[]; value: V; onChange: (v: V) => void }) {
  const c = useColors();
  return (
    <Card style={{ flexDirection: 'row', gap: 6, padding: 6 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)}
            style={{ flex: 1, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ink : 'transparent' }}>
            <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: on ? c.paper : c.ink }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </Card>
  );
}

function JoinCard({ initial, onJoined }: { initial: PublicMe; onJoined: (p: PublicMe) => void }) {
  const c = useColors();
  const { me } = useAuth();
  const { t, locale } = useT();
  const country = initial.country ?? phoneCountry();
  const [nick, setNick] = useState(initial.nickname ?? suggestNick(me?.name));
  const [free, setFree] = useState<boolean | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = NICK_RE.test(nick);

  // Check the nickname a moment after typing stops.
  useEffect(() => {
    setFree(null);
    if (!valid) return;
    const id = setTimeout(() => { nicknameFree(nick).then(setFree).catch(() => setFree(null)); }, 400);
    return () => clearTimeout(id);
  }, [nick, valid]);

  async function join() {
    if (!valid) { setMsg(t.nickBad); return; }
    setBusy(true); setMsg('');
    try { onJoined(await setPublic(true, nick, country)); } catch (e) { setMsg(errorIn(t, e)); }
    setBusy(false);
  }

  const hint = !nick ? t.nickHint : !valid ? t.nickBad : free === false ? t.nickTaken : free ? t.nickFree : t.nickHint;
  return (
    <View style={{ gap: 14 }}>
      <T muted>{t.boardJoinBody}</T>
      <View style={{ gap: 8 }}>
        <Label>{t.nickname}</Label>
        <Input value={nick} onChangeText={(v) => setNick(v.replace(/\s/g, ''))} autoCapitalize="none" autoCorrect={false} maxLength={20} placeholder="heatedmicrowave" />
        <T size={13} color={free === false || (!!nick && !valid) ? c.red : c.muted}>{hint}</T>
      </View>
      {!!country && <T muted size={14}>{t.countryFrom(countryName(country, locale))}</T>}
      {!!msg && <T color={c.red}>{msg}</T>}
      <Button title={t.boardJoinBtn} onPress={join} busy={busy} />
    </View>
  );
}

export default function Board() {
  const c = useColors();
  const { t, locale } = useT();
  const insets = useSafeAreaInsets();
  const [pub, setPub] = useState<PublicMe | null>(null);
  const [where, setWhere] = useState<'world' | 'country'>('world');
  const [period, setPeriod] = useState<Period>('week');
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [msg, setMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await loadPublicMe();
      setPub(p);
      if (p.public_board) setRows(await loadBoard(period, where === 'country' ? p.country : null));
      setMsg('');
    } catch (e) {
      setMsg(errorIn(t, e));
    }
  }, [period, where, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function leave() {
    Alert.alert(t.boardLeaveQ, undefined, [
      { text: t.cancel, style: 'cancel' },
      { text: t.leave, style: 'destructive', onPress: async () => {
        try { setPub(await setPublic(false)); setRows([]); } catch (e) { setMsg(errorIn(t, e)); }
      } },
    ]);
  }

  const top = rows.filter((r) => r.rank <= 100);
  const meBelow = rows.find((r) => r.is_me && r.rank > 100);
  const meOn = rows.some((r) => r.is_me);

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 32, gap: 14 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl tintColor={c.ink} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <View>
        <Title size={34}>{t.tabBoard}</Title>
        {pub?.public_board && !!pub.nickname && <T muted size={14}>{t.boardAs(pub.nickname)}</T>}
      </View>
      {!!msg && <T color={c.red}>{msg}</T>}

      {pub && !pub.public_board && <JoinCard initial={pub} onJoined={() => { load(); }} />}

      {pub?.public_board && (
        <>
          <Pills value={where} onChange={setWhere} options={[
            { label: t.boardWorld, value: 'world' },
            ...(pub.country ? [{ label: countryName(pub.country, locale), value: 'country' as const }] : []),
          ]} />
          <Pills value={period} onChange={setPeriod} options={[
            { label: t.periods[0], value: 'today' }, { label: t.periods[1], value: 'week' }, { label: t.periods[2], value: 'month' },
          ]} />

          <Card style={{ padding: 0 }}>
            {top.length === 0 && <View style={{ padding: 16 }}><T muted>{t.boardEmpty}</T></View>}
            {[...top, ...(meBelow ? [meBelow] : [])].map((r, i) => (
              <View key={`${r.rank}-${r.nickname}`}>
                {meBelow === r && <View style={{ paddingVertical: 6, alignItems: 'center', borderTopWidth: 1, borderColor: c.hair }}><T muted>···</T></View>}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 52, borderTopWidth: i && meBelow !== r ? 1 : 0, borderColor: c.hair, backgroundColor: r.is_me ? '#FBEDE6' : undefined }}>
                  <Text style={{ width: 34, fontSize: 17, fontWeight: '800', color: r.rank <= 3 ? c.red : c.muted, fontVariant: ['tabular-nums'] }}>{r.rank}</Text>
                  <View style={{ flex: 1 }}>
                    <T bold>{r.nickname}{r.is_me ? ` (${t.you})` : ''}</T>
                    {where === 'world' && !!r.country && <T muted size={12}>{countryName(r.country, locale)}</T>}
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink, fontVariant: ['tabular-nums'] }}>{fmt(r.steps)}</Text>
                </View>
              </View>
            ))}
          </Card>
          {!meOn && top.length > 0 && <T muted size={14}>{t.boardNotYou}</T>}

          <T muted size={13}>{t.boardFair}</T>
          <Pressable onPress={leave} style={{ alignItems: 'center', padding: 12 }} hitSlop={8}>
            <Text style={{ color: c.red, fontSize: 15, fontWeight: '600' }}>{t.boardLeave}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
