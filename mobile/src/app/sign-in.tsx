import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Button, Input, Label, Numeral, Section, T, useColors } from '../components/ui';
import { useAuth } from '../lib/auth';
import { errorText, supabase } from '../lib/supabase';

// Email + 6-digit code. No passwords, no links to tap.
export default function SignIn() {
  const c = useColors();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const { session } = useAuth();

  async function sendCode() {
    setBusy(true); setMsg('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setBusy(false);
    if (error) setMsg(errorText(error)); else setSent(true);
  }
  async function verify() {
    setBusy(true); setMsg('');
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setMsg(errorText(error));
  }

  if (session) return <Redirect href="/" />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 96 }} keyboardShouldPersistTaps="handled">
        <View style={{ borderWidth: 2, borderColor: c.ink, padding: 16, marginBottom: 40 }}>
          <Label color={c.red}>Step Competition</Label>
          <Numeral size={112}>10,000</Numeral>
          <T muted>Steps against your friends, whatever watch they wear.</T>
        </View>
        <Section label={sent ? `Code sent to ${email.trim()}` : 'Sign in'}>
          {!sent ? (
            <>
              <Input value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              <Button title="Send code" onPress={sendCode} busy={busy} />
            </>
          ) : (
            <>
              <Input value={code} onChangeText={setCode} placeholder="000000" keyboardType="number-pad" autoComplete="one-time-code" maxLength={8}
                style={{ fontSize: 28, letterSpacing: 8, textAlign: 'center' }} />
              <Button title="Sign in" onPress={verify} busy={busy} />
              <Button title="Different email" kind="plain" onPress={() => { setSent(false); setCode(''); }} />
            </>
          )}
          {!!msg && <T color={c.red}>{msg}</T>}
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
