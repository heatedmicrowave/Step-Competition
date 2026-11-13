import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Input, Section, T, useColors } from '../components/ui';
import { useScene } from '../components/Mountain';
import { errorIn, useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';

export default function Join() {
  const c = useColors();
  const { t } = useT();
  useScene({ pose: 'aside' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function join() {
    setBusy(true); setMsg('');
    const { data, error } = await supabase.rpc('app_join_competition', { p_code: code });
    setBusy(false);
    if (error) { setMsg(errorIn(t, error)); return; }
    router.replace({ pathname: '/competition/[id]', params: { id: data as string } });
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Section label={t.inviteCode}>
        <Input value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="ABC123" autoCapitalize="characters" autoCorrect={false} maxLength={6}
          style={{ fontSize: 34, letterSpacing: 10, textAlign: 'center' }} />
        <Button title={t.join} onPress={join} busy={busy} />
        {!!msg && <T color={c.red}>{msg}</T>}
      </Section>
    </ScrollView>
  );
}
