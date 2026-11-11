import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Input, Label, Section, T, useColors } from '../components/ui';
import { errorText, isoDay, supabase } from '../lib/supabase';

const LENGTHS = [
  { label: '1 day', days: 1 }, { label: '2 days', days: 2 }, { label: '1 week', days: 7 },
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
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Section label="Name">
        <Input value={name} onChangeText={setName} placeholder="November showdown" />
      </Section>
      <Section label="Starts">
        <Choices options={[{ label: 'Today', value: 1 }, { label: 'Tomorrow', value: 0 }]} value={startsToday ? 1 : 0} onChange={(v) => setStartsToday(v === 1)} />
      </Section>
      <Section label="Length">
        <Choices options={LENGTHS.map((l) => ({ label: l.label, value: l.days }))} value={days} onChange={setDays} />
        <Label>{isoDay(start)} to {isoDay(end)}</Label>
      </Section>
      <Button title="Start" onPress={create} busy={busy} />
      {!!msg && <T color={c.red} style={{ marginTop: 10 }}>{msg}</T>}
    </ScrollView>
  );
}

function Choices({ options, value, onChange }: { options: { label: string; value: number }[]; value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => (
        <View key={o.value} style={{ width: '31%', flexGrow: 1 }}>
          <Button title={o.label} kind={o.value === value ? 'selected' : 'plain'} onPress={() => onChange(o.value)} />
        </View>
      ))}
    </View>
  );
}
