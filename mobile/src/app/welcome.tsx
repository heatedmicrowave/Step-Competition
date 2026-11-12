import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, font, Heading, Input, Label, T, useColors } from '../components/ui';
import { useAuth } from '../lib/auth';
import { Device, DEVICES } from '../lib/devices';
import { healthAvailable } from '../lib/health';
import { errorText, supabase } from '../lib/supabase';
import { connectDevice } from '../lib/sync';

// First run: your name, then "What do you wear?" Tap it, approve once, you're in.
export default function Welcome() {
  const c = useColors();
  const { me, reloadMe } = useAuth();
  const [step, setStep] = useState<'name' | 'device' | 'fix'>(me && me.name !== 'New player' ? 'device' : 'name');
  const [name, setName] = useState('');
  const [device, setDevice] = useState<Device | null>(null);
  const [fix, setFix] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  async function saveName() {
    if (!name.trim()) { setMsg('Add a name first.'); return; }
    setBusy('name'); setMsg('');
    await reloadMe(name.trim());
    setBusy(null); setStep('device');
  }

  async function pick(d: Device) {
    setDevice(d); setMsg(''); setBusy(d.id);
    try {
      if (d.route === 'fitbit') {
        // Fitbit sign-in (Google) is the next piece to build. Remember the choice so we can prompt later.
        await supabase.rpc('app_set_source', { p_source: 'fitbit', p_device_label: 'Fitbit' });
        await reloadMe();
        setFix('Fitbit sign-in is coming in the next update. You can join and start competitions now, and your steps will show up once it lands.');
        setStep('fix');
      } else if (!healthAvailable()) {
        setFix("This phone doesn't have Apple Health. The Android version is coming.");
        setStep('fix');
      } else {
        const r = await connectDevice(d);
        if (r.ok) { await reloadMe(); router.replace('/'); }
        else { setFix(r.fix); setStep('fix'); }
      }
    } catch (e) {
      setMsg(errorText(e));
    }
    setBusy(null);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 88, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {step === 'name' && (
          <>
            <Label color={c.red}>1 of 2</Label>
            <Heading size={44}>What should we call you?</Heading>
            <View style={{ gap: 10, marginTop: 24 }}>
              <Input value={name} onChangeText={setName} placeholder="Name on the leaderboard" autoFocus returnKeyType="next" onSubmitEditing={saveName} />
              <Button title="Next" onPress={saveName} busy={busy === 'name'} />
            </View>
          </>
        )}

        {step === 'device' && (
          <>
            <Label color={c.red}>2 of 2</Label>
            <Heading size={44}>What do you wear?</Heading>
            <T muted style={{ marginTop: 6, marginBottom: 20 }}>Tap it. If Apple asks, tap Allow. That's it.</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DEVICES.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => (busy ? undefined : pick(d))}
                  style={({ pressed }) => ({
                    width: '48.5%', height: 88, borderWidth: 1.5, borderColor: c.ink, padding: 12, justifyContent: 'flex-end',
                    backgroundColor: busy === d.id ? c.ink : pressed ? c.hair : 'transparent',
                  })}
                >
                  <Text style={{ fontFamily: font.heading, fontSize: 24, textTransform: 'uppercase', color: busy === d.id ? c.bg : c.ink }}>
                    {busy === d.id ? 'Connecting…' : d.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            {me?.device_label && <View style={{ marginTop: 20 }}><Button title="Keep my current device" kind="plain" onPress={() => router.replace('/')} /></View>}
          </>
        )}

        {step === 'fix' && device && (
          <>
            <Label color={c.red}>{device.name}</Label>
            <Heading size={40}>One more thing</Heading>
            <T style={{ marginTop: 12, marginBottom: 24 }}>{fix}</T>
            <View style={{ gap: 10 }}>
              {device.route === 'apple_health' && healthAvailable() && device.id !== 'samsung' && (
                <Button title="I did it, check again" onPress={() => pick(device)} busy={busy === device.id} />
              )}
              {device.route === 'fitbit' && <Button title="Continue" onPress={() => router.replace('/')} />}
              <Button title="Pick a different device" kind="plain" onPress={() => setStep('device')} />
            </View>
          </>
        )}

        {!!msg && <T color={c.red} style={{ marginTop: 12 }}>{msg}</T>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
