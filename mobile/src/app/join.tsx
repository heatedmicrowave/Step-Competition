import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Input, Section, T, useColors } from '../components/ui';
import { errorIn, useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';

export default function Join() {
  const c = useColors();
  const { t } = useT();
  // An invite link (stepcompetition://join?code=ABC123) opens this screen with the code filled in.
  const params = useLocalSearchParams<{ code?: string }>();
  const fromLink = String(params.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const [code, setCode] = useState(fromLink);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // Came from a link: join straight away.
  useEffect(() => { if (fromLink.length === 6) join(fromLink); }, [fromLink]); // eslint-disable-line react-hooks/exhaustive-deps

  async function join(c = code) {
    setBusy(true); setMsg('');
    const { data, error } = await supabase.rpc('app_join_competition', { p_code: c });
    setBusy(false);
    if (error) { setMsg(errorIn(t, error)); return; }
    router.replace({ pathname: '/competition/[id]', params: { id: data as string } });
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Section label={t.inviteCode}>
        <Input value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="ABC123" autoCapitalize="characters" autoCorrect={false} maxLength={6}
          style={{ fontSize: 34, letterSpacing: 10, textAlign: 'center' }} />
        <Button title={t.join} onPress={() => join()} busy={busy} />
        {!!msg && <T color={c.red}>{msg}</T>}
      </Section>
    </ScrollView>
  );
}
