import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Card, Input, T, useColors } from '../components/ui';
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
    // On success the auth listener sends us to the home screen.
  }

  if (session) return <Redirect href="/" />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 32 }} keyboardShouldPersistTaps="handled">
        <T size={30} bold>👟 Step Competition</T>
        <T muted style={{ marginTop: 6, marginBottom: 24 }}>Race your friends on steps, whatever watch they wear.</T>
        <Card>
          {!sent ? (
            <>
              <T bold>Your email</T>
              <Input value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              <Button title="Send me a code" onPress={sendCode} busy={busy} />
            </>
          ) : (
            <>
              <T bold>Enter the code we emailed to {email.trim()}</T>
              <Input value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" autoComplete="one-time-code" maxLength={8} />
              <Button title="Sign in" onPress={verify} busy={busy} />
              <Button title="Use a different email" kind="plain" onPress={() => { setSent(false); setCode(''); }} />
            </>
          )}
          {!!msg && <T color={c.danger}>{msg}</T>}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
