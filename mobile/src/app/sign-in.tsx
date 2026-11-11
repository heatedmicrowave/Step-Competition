import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Button, Input, Label, Numeral, Section, T, useColors } from '../components/ui';
import { signInRedirect, useAuth } from '../lib/auth';
import { errorText, supabase } from '../lib/supabase';

// Email link sign-in: no passwords. Supabase's default email works as is.
export default function SignIn() {
  const c = useColors();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const { session } = useAuth();

  async function sendLink() {
    setBusy(true); setMsg('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: signInRedirect } });
    setBusy(false);
    if (error) setMsg(errorText(error)); else setSent(true);
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
        <Section label={sent ? `Link sent to ${email.trim()}` : 'Sign in'}>
          {!sent ? (
            <>
              <Input value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              <Button title="Email me a link" onPress={sendLink} busy={busy} />
            </>
          ) : (
            <>
              <T>Open the email on this phone and tap Sign in. It brings you straight back here.</T>
              <Button title="Different email" kind="plain" onPress={() => setSent(false)} />
            </>
          )}
          {!!msg && <T color={c.red}>{msg}</T>}
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
