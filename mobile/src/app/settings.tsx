import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Input, Section, T, useColors } from '../components/ui';
import { useAuth } from '../lib/auth';
import { errorText, supabase } from '../lib/supabase';

export default function Settings() {
  const c = useColors();
  const { me, reloadMe } = useAuth();
  const [name, setName] = useState(me?.name === 'New player' ? '' : me?.name ?? '');
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  async function saveName() {
    if (!name.trim()) return;
    setBusy('name'); await reloadMe(name.trim()); setBusy('');
    setMsg('Saved.');
  }

  async function link() {
    setBusy('link'); setMsg('');
    const { error } = await supabase.rpc('app_link_player', { p_key: key.trim() });
    setBusy('');
    if (error) { setMsg(errorText(error)); return; }
    await reloadMe();
    setMsg('Linked. Your website history and competitions are now on this account.');
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Section label="Name on the leaderboard">
        <Input value={name} onChangeText={setName} placeholder="e.g. Heated microwave" />
        <Button title="Save" onPress={saveName} busy={busy === 'name'} />
      </Section>

      <Section label="Your device">
        <T>{me?.device_label ?? 'Not connected yet'}</T>
        <Button title="Change device" kind="plain" onPress={() => router.push('/welcome')} />
      </Section>

      <Section label="Used the website before?">
        <T muted size={14}>Paste your old secret key to bring over your history and competitions.</T>
        <Input value={key} onChangeText={setKey} placeholder="Secret key" autoCapitalize="none" autoCorrect={false} />
        <Button title="Link" kind="plain" onPress={link} busy={busy === 'link'} />
      </Section>

      {!!msg && <T style={{ marginBottom: 14 }}>{msg}</T>}
      <View style={{ gap: 10 }}>
        <Button title="Done" onPress={() => router.replace('/')} />
        <Button title="Sign out" kind="plain" onPress={async () => { await supabase.auth.signOut(); router.replace('/sign-in'); }} />
      </View>
    </ScrollView>
  );
}
