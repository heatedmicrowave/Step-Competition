// Start a challenge: the course comes from the card you tapped; pick when and how long.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { CourseThumb } from '../components/Mountain';
import { Button, Card, Input, Label, Section, T, Title, useColors } from '../components/ui';
import { course, size } from '../lib/courses';
import { errorIn, useT } from '../lib/i18n';
import { isoDay, supabase } from '../lib/supabase';

// Lengths in days; their names come from t.lengths, in the same order.
const LENGTHS = [1, 2, 7, 14, 30, 90];

export default function NewCompetition() {
  const c = useColors();
  const { t, locale, lang } = useT();
  const params = useLocalSearchParams<{ course?: string }>();
  const cs = course(params.course);
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
    const { data, error } = await supabase.rpc('app_create_competition', { p_name: name.trim() || t.courseNames[cs.id][0], p_start: isoDay(start), p_end: isoDay(end), p_course: cs.id });
    setBusy(false);
    if (error) { setMsg(errorIn(t, error)); return; }
    router.replace({ pathname: '/competition/[id]', params: { id: (data as { id: string }[])[0].id } });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <View style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 14 }}>
        <CourseThumb id={cs.id} width="100%" height={180} radius={24} />
      </View>
      <Title size={30}>{t.courseNames[cs.id][0]}</Title>
      <T muted style={{ marginBottom: 24 }}>
        {t.courseNames[cs.id][1]}{cs.kind === 'climb' ? ` · ${t.top(size(cs, lang, locale))}` : cs.kind === 'route' ? ` · ${size(cs, lang, locale)}` : ''}
      </T>

      <Section label={t.name}>
        <Input value={name} onChangeText={setName} placeholder={t.courseNames[cs.id][0]} />
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

/** Pills in a white card; the chosen one is filled. */
function Choices({ options, value, onChange }: { options: { label: string; value: number }[]; value: number; onChange: (v: number) => void }) {
  const c = useColors();
  return (
    <Card style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 6 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)}
            style={{ flexGrow: 1, minWidth: '30%', height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ink : 'transparent' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: on ? c.paper : c.ink }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </Card>
  );
}
