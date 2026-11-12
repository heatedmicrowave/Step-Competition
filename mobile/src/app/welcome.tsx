import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Heading, Input, Label, Section, T, useColors } from '../components/ui';
import { useAuth } from '../lib/auth';
import { healthAvailable } from '../lib/health';
import { errorText } from '../lib/supabase';
import { connectHealth } from '../lib/sync';

// First run: one field and one button. Everything else is worked out for you.
export default function Welcome() {
  const c = useColors();
  const { reloadMe } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function go() {
    if (!name.trim()) { setMsg('Add a name first.'); return; }
    setBusy(true); setMsg('');
    try {
      await reloadMe(name.trim());
      if (healthAvailable()) await connectHealth();
      await reloadMe();
      router.replace('/');
    } catch (e) {
      setMsg(errorText(e));
    }
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 96 }} keyboardShouldPersistTaps="handled">
        <Label color={c.red}>Almost there</Label>
        <Heading size={44}>What should we call you?</Heading>
        <Section style={{ marginTop: 28 }}>
          <Input value={name} onChangeText={setName} placeholder="Name on the leaderboard" autoFocus returnKeyType="go" onSubmitEditing={go} />
          <Button title={healthAvailable() ? 'Connect my steps' : 'Continue'} onPress={go} busy={busy} />
          {healthAvailable() && <T muted size={14}>Next, Apple asks to share your steps. Tap Allow. We find your watch from there.</T>}
          {!!msg && <T color={c.red}>{msg}</T>}
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
