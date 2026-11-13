// One of your competitions as a card: its picture, days left, and where you stand.
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { course, position, progress } from '../lib/courses';
import { useT } from '../lib/i18n';
import { daysLeftOf, loadStandings, Standing } from '../lib/standings';
import { Competition } from '../lib/supabase';
import { CourseThumb } from './Mountain';
import { Bar, fmt, Label, T, Title, useColors } from './ui';

export function CompCard({ comp }: { comp: Competition }) {
  const c = useColors();
  const { me } = useAuth();
  const { t, lang, locale } = useT();
  const [board, setBoard] = useState<Standing[] | null>(null);
  useEffect(() => { loadStandings(comp).then(setBoard).catch(() => setBoard([])); }, [comp.id]);

  const cs = course(comp.course);
  const { left, upcoming, over } = daysLeftOf(comp);
  const short = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const when = upcoming ? t.startsOn(short(comp.start_day)) : over ? short(comp.end_day) : left === 1 ? t.lastDay : t.daysLeft(left);
  const rank = board ? board.findIndex((p) => p.id === me?.id) : -1;
  const mine = rank >= 0 ? board![rank] : null;
  const leader = board?.[0];
  const journey = cs.kind !== 'classic';
  const line = !mine ? ''
    : journey ? `#${rank + 1} · ${position(cs, mine.total, lang, locale)}`
    : `#${rank + 1} · ${fmt(mine.total)}`;

  return (
    <Link href={{ pathname: '/competition/[id]', params: { id: comp.id } }} asChild>
      <Pressable style={({ pressed }) => ({ backgroundColor: c.paper, borderRadius: 20, padding: 14, flexDirection: 'row', gap: 14, alignItems: 'center', opacity: pressed ? 0.7 : 1 })}>
        <CourseThumb id={cs.id} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <View style={{ flex: 1 }}><Title size={17}>{comp.name}</Title></View>
            <Label>{when}</Label>
          </View>
          <Bar value={mine ? (journey ? progress(cs, mine.total) : leader && leader.total ? mine.total / leader.total : 0) : 0} />
          <T muted size={13}>{line || t.courseNames[cs.id][0]}</T>
        </View>
      </Pressable>
    </Link>
  );
}
