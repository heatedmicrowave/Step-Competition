import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { MountainArt, useScene } from '../components/Mountain';
import { Button, font, Heading, Input, Label, Section, T, useColors } from '../components/ui';
import { Course, COURSES, CourseId, size } from '../lib/courses';
import { errorIn, useT } from '../lib/i18n';
import { isoDay, supabase } from '../lib/supabase';

// Lengths in days; their names come from t.lengths, in the same order.
const LENGTHS = [1, 2, 7, 14, 30, 90];

export default function NewCompetition() {
  const c = useColors();
  const { t, locale, lang } = useT();
  useScene({ pose: 'aside' });
  const [kind, setKind] = useState<Course['kind']>('climb');
  const [courseId, setCourseId] = useState<CourseId>('matterhorn');
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
    const { data, error } = await supabase.rpc('app_create_competition', { p_name: name.trim() || t.courseNames[courseId][0], p_start: isoDay(start), p_end: isoDay(end), p_course: courseId });
    setBusy(false);
    if (error) { setMsg(errorIn(t, error)); return; }
    router.replace({ pathname: '/competition/[id]', params: { id: (data as { id: string }[])[0].id } });
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Heading size={40}>{t.pickCourse}</Heading>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 14 }}>
        {(['climb', 'route', 'classic'] as const).map((k, i) => (
          <Pressable key={k} onPress={() => { setKind(k); setCourseId(COURSES.find((x) => x.kind === k)!.id); }}
            style={{ flex: 1, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: kind === k ? c.red : c.hair, backgroundColor: kind === k ? c.red : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: font.heading, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', color: kind === k ? c.onRed : c.ink }}>{t.kinds[i]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ gap: 10, marginBottom: 28 }}>
        {COURSES.filter((x) => x.kind === kind).map((x) => {
          const on = x.id === courseId;
          return (
            <Pressable key={x.id} onPress={() => setCourseId(x.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 6, borderWidth: 1.5, borderColor: on ? c.red : c.hair, backgroundColor: c.paper }}>
              <View style={{ width: 60, height: 60, borderRadius: 4, overflow: 'hidden', backgroundColor: c.bg }}>
                {x.id !== 'classic' && <MountainArt art={x.id} />}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Heading size={22}>{t.courseNames[x.id][0]}</Heading>
                <T muted size={13}>{t.courseNames[x.id][1]}</T>
              </View>
              {x.kind !== 'classic' && <Label color={c.red}>{size(x, lang, locale)}</Label>}
            </Pressable>
          );
        })}
      </View>
      <Section label={t.name}>
        <Input value={name} onChangeText={setName} placeholder={t.courseNames[courseId][0]} />
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
