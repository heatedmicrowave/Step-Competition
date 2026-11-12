import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Input, Label, Section, T, useColors } from '../components/ui';
import { errorIn, useT } from '../lib/i18n';
import { isoDay, supabase } from '../lib/supabase';

// Lengths in days; their names come from t.lengths, in the same order.
const LENGTHS = [1, 2, 7, 14, 30, 90];

export default function NewCompetition() {
  const c = useColors();
  const { t, locale } = useT();
  const [name, setName] = useState('');
  const [startsToday, setStartsToday] = useState(true);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const start = new Date(); if (!startsToday) start.setDate(start.getDate() + 1);
  const end = new Date(start); end.setDate(end.getDate() + days - 1);
  const day = (d: Date) => d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });

  async function create() {
    setBusy(true); setMsg('');
    const { data, error } = await supabase.rpc('app_create_competition', { p_name: name, p_start: isoDay(start), p_end: isoDay(end) });
    setBusy(false);
    if (error) { setMsg(errorIn(t, error)); return; }
    router.replace({ pathname: '/competition/[id]', params: { id: (data as { id: string }[])[0].id } });
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Section label={t.name}>
        <Input value={name} onChangeText={setName} placeholder={t.compNamePlaceholder} />
      </Section>
      <Section label={t.starts}>
        <Choices options={[{ label: t.today, value: 1 }, { label: t.tomorrow, value: 0 }]} value={startsToday ? 1 : 0} onChange={(v) => setStartsToday(v === 1)} />
      </Section>
      <Section label={t.length}>
        <Choices options={LENGTHS.map((d, i) => ({ label: t.lengths[i], value: d }))} value={days} onChange={setDays} />
        <Label>{day(start)} – {day(end)}</Label>
      </Section>
      <Button title={t.startBtn} onPress={create} busy={busy} />
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
