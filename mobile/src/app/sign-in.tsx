import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Button, Input, Label, Numeral, Section, T, useColors } from '../components/ui';
import { signInRedirect, useAuth } from '../lib/auth';
import { errorIn, useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';

// Email link sign-in: no passwords. Supabase's default email works as is.
export default function SignIn() {
  const c = useColors();
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const { session } = useAuth();

  async function sendLink() {
    setBusy(true); setMsg('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: signInRedirect } });
    setBusy(false);
    if (error) setMsg(errorIn(t, error)); else setSent(true);
  }
  if (session) return <Redirect href="/" />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 96 }} keyboardShouldPersistTaps="handled">
        <View style={{ borderWidth: 2, borderColor: c.ink, padding: 16, marginBottom: 40 }}>
          <Label color={c.red}>Step Competition</Label>
          <Numeral size={112}>10,000</Numeral>
          <T muted>{t.tagline}</T>
        </View>
        <Section label={sent ? t.linkSent(email.trim()) : t.signIn}>
          {!sent ? (
            <>
              <Input value={email} onChangeText={setEmail} placeholder={t.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              <Button title={t.emailMe} onPress={sendLink} busy={busy} />
            </>
          ) : (
            <>
              <T>{t.openEmail}</T>
              <Button title={t.differentEmail} kind="plain" onPress={() => setSent(false)} />
            </>
          )}
          {!!msg && <T color={c.red}>{msg}</T>}
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
