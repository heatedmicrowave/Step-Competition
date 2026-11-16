import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { MountainArt } from '../components/Mountain';
import { Button, Input, Section, T, Title, useColors } from '../components/ui';
import { signInRedirect, useAuth } from '../lib/auth';
import { errorIn, useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';

// Email sign-in, no passwords: tap the link in the email, or type the code from it.
export default function SignIn() {
  const c = useColors();
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [code, setCode] = useState('');
  const { session } = useAuth();

  async function sendLink() {
    setBusy(true); setMsg('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: signInRedirect } });
    setBusy(false);
    if (error) setMsg(errorIn(t, error)); else setSent(true);
  }
  // The same email carries a code: typing it works even when the link doesn't (mail apps that pre-open
  // links use them up, or the email is read on another device).
  async function submitCode() {
    const token = code.replace(/\D/g, '');
    if (token.length < 6) return;
    setBusy(true); setMsg('');
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' });
    setBusy(false);
    if (error) setMsg(t.badCode);
  }
  if (session) return <Redirect href="/" />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 72 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: 220, borderRadius: 28, overflow: 'hidden', backgroundColor: '#1B1714', marginBottom: 20 }}>
          <MountainArt art="matterhorn" viewBox="0 20 390 400" slice />
        </View>
        <Title size={40}>Pass1</Title>
        <T muted style={{ marginBottom: 32 }}>{t.tagline}</T>
        <Section label={sent ? t.linkSent(email.trim()) : t.signIn}>
          {!sent ? (
            <>
              <Input value={email} onChangeText={setEmail} placeholder={t.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              <Button title={t.emailMe} onPress={sendLink} busy={busy} />
            </>
          ) : (
            <>
              <T>{t.openEmail}</T>
              <T muted>{t.orCode}</T>
              <Input value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={8} />
              <Button title={t.codeBtn} onPress={submitCode} busy={busy} />
              <Button title={t.differentEmail} kind="plain" onPress={() => { setSent(false); setCode(''); }} />
            </>
          )}
          {!!msg && <T color={c.red}>{msg}</T>}
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
