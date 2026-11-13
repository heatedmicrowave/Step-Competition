// Every challenge you can start, plus the ones you're in (running first, then finished).
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompCard } from '../../components/CompCard';
import { CourseThumb } from '../../components/Mountain';
import { Button, Label, Section, T, Title, useColors } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { COURSES, size } from '../../lib/courses';
import { useT } from '../../lib/i18n';
import { COMP_FIELDS } from '../../lib/standings';
import { Competition, isoDay, supabase } from '../../lib/supabase';

export default function Challenges() {
  const c = useColors();
  const { me } = useAuth();
  const { t, lang, locale } = useT();
  const insets = useSafeAreaInsets();
  const [comps, setComps] = useState<Competition[]>([]);

  useFocusEffect(useCallback(() => {
    if (!me) return;
    supabase.from('competitions').select(`${COMP_FIELDS}, competition_players!inner(player_id)`)
      .eq('competition_players.player_id', me.id).order('end_day', { ascending: false })
      .then(({ data }) => { if (data) setComps(data as unknown as Competition[]); });
  }, [me?.id]));

  const now = isoDay(new Date());
  const live = comps.filter((x) => x.end_day >= now);
  const past = comps.filter((x) => x.end_day < now);
  const kinds = [['climb', 0], ['route', 1], ['classic', 2]] as const;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 32 }}>
      <View style={{ marginBottom: 16 }}><Title size={34}>{t.tabChallenges}</Title></View>

      {kinds.map(([k, i]) => (
        <Section key={k} label={t.kinds[i]}>
          {COURSES.filter((x) => x.kind === k).map((x) => (
            <Pressable key={x.id} disabled={x.soon} onPress={() => router.push({ pathname: '/new', params: { course: x.id } })}
              style={({ pressed }) => ({ backgroundColor: c.paper, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: x.soon ? 0.5 : pressed ? 0.7 : 1 })}>
              <CourseThumb id={x.id} width={72} height={56} radius={12} />
              <View style={{ flex: 1 }}>
                <T bold size={17}>{t.courseNames[x.id][0]}</T>
                <T muted size={13}>{t.courseNames[x.id][1]}</T>
              </View>
              {x.soon ? <Label>{t.comingSoon}</Label> : x.kind !== 'classic' && <Label color={c.red}>{size(x, lang, locale)}</Label>}
            </Pressable>
          ))}
        </Section>
      ))}

      <View style={{ marginBottom: 26 }}><Button title={t.joinCode} kind="plain" onPress={() => router.push('/join')} /></View>

      {live.length > 0 && <Section label={t.running}>{live.map((x) => <CompCard key={x.id} comp={x} />)}</Section>}
      {past.length > 0 && <Section label={t.finished}>{past.map((x) => <CompCard key={x.id} comp={x} />)}</Section>}
    </ScrollView>
  );
}
