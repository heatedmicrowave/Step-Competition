import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeBack } from '../../components/HomeBack';
import { Button, Card, Input, Section, T, Title, useColors } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { errorIn, Lang, LANG_NAMES, LANGS, LangChoice, useT } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';

export default function Account() {
  const c = useColors();
  const { me, reloadMe } = useAuth();
  const { t, choice, setChoice } = useT();
  const insets = useSafeAreaInsets();
  const [showOld, setShowOld] = useState(false);
  const [name, setName] = useState(me?.name === 'New player' ? '' : me?.name ?? '');
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  async function saveName() {
    if (!name.trim()) return;
    setBusy('name'); await reloadMe(name.trim()); setBusy('');
    setMsg(t.saved);
  }

  async function link() {
    setBusy('link'); setMsg('');
    const { error } = await supabase.rpc('app_link_player', { p_key: key.trim() });
    setBusy('');
    if (error) { setMsg(errorIn(t, error)); return; }
    await reloadMe();
    setMsg(t.linked);
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <HomeBack />
      <View style={{ marginBottom: 16 }}><Title size={34}>{t.tabAccount}</Title></View>

      <Section label={t.nameOnBoard}>
        <Input value={name} onChangeText={setName} placeholder={t.namePlaceholder} />
        <Button title={t.save} onPress={saveName} busy={busy === 'name'} />
      </Section>

      <Section label={t.yourDevice}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T bold>{me?.device_label ?? t.notConnectedYet}</T>
          <Pressable onPress={() => router.push('/welcome')} hitSlop={10}>
            <Text style={{ color: c.red, fontSize: 16, fontWeight: '600' }}>{t.changeDevice}</Text>
          </Pressable>
        </Card>
      </Section>

      <Section label={t.language}>
        <Card style={{ padding: 0 }}>
          {(['auto', ...LANGS] as LangChoice[]).map((l, i) => (
            <Pressable key={l} onPress={() => setChoice(l)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, minHeight: 50, borderTopWidth: i ? 1 : 0, borderColor: c.hair }}>
              <T>{l === 'auto' ? t.langAuto : LANG_NAMES[l as Lang]}</T>
              {choice === l && <Text style={{ color: c.red, fontSize: 18, fontWeight: '700' }}>✓</Text>}
            </Pressable>
          ))}
        </Card>
      </Section>

      {!!msg && <T style={{ marginBottom: 14 }}>{msg}</T>}
      <Button title={t.signOut} kind="plain" onPress={async () => { await supabase.auth.signOut(); router.replace('/sign-in'); }} />

      <Pressable onPress={() => setShowOld(!showOld)} style={{ marginTop: 28, alignItems: 'center' }} hitSlop={10}>
        <T muted size={14}>{t.oldSite}</T>
      </Pressable>
      {showOld && (
        <View style={{ gap: 10, marginTop: 12 }}>
          <T muted size={14}>{t.websiteBody}</T>
          <Input value={key} onChangeText={setKey} placeholder={t.secretKey} autoCapitalize="none" autoCorrect={false} />
          <Button title={t.link} kind="plain" onPress={link} busy={busy === 'link'} />
        </View>
      )}
    </ScrollView>
  );
}
