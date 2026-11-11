import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Card, Input, T, useColors } from '../components/ui';
import { errorText, isoDay, supabase } from '../lib/supabase';

const LENGTHS = [
  { label: '1 day', days: 1 }, { label: 'Weekend', days: 2 }, { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 }, { label: '1 month', days: 30 }, { label: '3 months', days: 90 },
];

export default function NewCompetition() {
  const c = useColors();
  const [name, setName] = useState('');
  const [startsToday, setStartsToday] = useState(true);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const start = new Date(); if (!startsToday) start.setDate(start.getDate() + 1);
  const end = new Date(start); end.setDate(end.getDate() + days - 1);

  async function create() {
    setBusy(true); setMsg('');
    const { data, error } = await supabase.rpc('app_create_competition', { p_name: name, p_start: isoDay(start), p_end: isoDay(end) });
    setBusy(false);
    if (error) { setMsg(errorText(error)); return; }
    router.replace({ pathname: '/competition/[id]', params: { id: (data as { id: string }[])[0].id } });
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Card>
        <T bold>Name</T>
        <Input value={name} onChangeText={setName} placeholder="e.g. November showdown" />
      </Card>
      <Card>
        <T bold>Starts</T>
        <Button title="Today" kind={startsToday ? 'primary' : 'plain'} onPress={() => setStartsToday(true)} />
        <Button title="Tomorrow" kind={!startsToday ? 'primary' : 'plain'} onPress={() => setStartsToday(false)} />
      </Card>
      <Card>
        <T bold>How long</T>
        {LENGTHS.map((l) => <Button key={l.days} title={l.label} kind={days === l.days ? 'primary' : 'plain'} onPress={() => setDays(l.days)} />)}
        <T muted>{isoDay(start)} → {isoDay(end)}</T>
      </Card>
      <Button title="Create" onPress={create} busy={busy} />
      {!!msg && <T color={c.danger}>{msg}</T>}
    </ScrollView>
  );
}
