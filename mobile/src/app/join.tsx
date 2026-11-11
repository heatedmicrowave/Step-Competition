import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Input, T, useColors } from '../components/ui';
import { errorText, supabase } from '../lib/supabase';

export default function Join() {
  const c = useColors();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function join() {
    setBusy(true); setMsg('');
    const { data, error } = await supabase.rpc('app_join_competition', { p_code: code });
    setBusy(false);
    if (error) { setMsg(errorText(error)); return; }
    router.replace({ pathname: '/competition/[id]', params: { id: data as string } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: 16 }}>
      <Card>
        <T bold>Invite code</T>
        <Input value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="ABC123" autoCapitalize="characters" autoCorrect={false} maxLength={6}
          style={{ fontSize: 28, letterSpacing: 6, textAlign: 'center' }} />
        <Button title="Join" onPress={join} busy={busy} />
        {!!msg && <T color={c.danger}>{msg}</T>}
      </Card>
    </View>
  );
}
