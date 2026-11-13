import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Input, Section, T, useColors } from '../components/ui';
import { useAuth } from '../lib/auth';
import { errorIn, Lang, LANG_NAMES, LANGS, LangChoice, useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const c = useColors();
  const { me, reloadMe } = useAuth();
  const { t, choice, setChoice } = useT();
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
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Section label={t.nameOnBoard}>
        <Input value={name} onChangeText={setName} placeholder={t.namePlaceholder} />
        <Button title={t.save} onPress={saveName} busy={busy === 'name'} />
      </Section>

      <Section label={t.yourDevice}>
        <T>{me?.device_label ?? t.notConnectedYet}</T>
        <Button title={t.changeDevice} kind="plain" onPress={() => router.push('/welcome')} />
      </Section>

      <Section label={t.language}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['auto', ...LANGS] as LangChoice[]).map((l) => (
            <View key={l} style={{ width: '48%', flexGrow: 1 }}>
              <Button title={l === 'auto' ? t.langAuto : LANG_NAMES[l as Lang]} kind={choice === l ? 'selected' : 'plain'} onPress={() => setChoice(l)} />
            </View>
          ))}
        </View>
      </Section>

      <Section label={t.websiteBefore}>
        <T muted size={14}>{t.websiteBody}</T>
        <Input value={key} onChangeText={setKey} placeholder={t.secretKey} autoCapitalize="none" autoCorrect={false} />
        <Button title={t.link} kind="plain" onPress={link} busy={busy === 'link'} />
      </Section>

      {!!msg && <T style={{ marginBottom: 14 }}>{msg}</T>}
      <View style={{ gap: 10 }}>
        <Button title={t.done} onPress={() => router.replace('/')} />
        <Button title={t.signOut} kind="plain" onPress={async () => { await supabase.auth.signOut(); router.replace('/sign-in'); }} />
      </View>
    </ScrollView>
  );
}
