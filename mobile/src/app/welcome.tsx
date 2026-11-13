import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, font, Heading, Input, Label, T, useColors } from '../components/ui';
import { useScene } from '../components/Mountain';
import { useAuth } from '../lib/auth';
import { Device, deviceName, DEVICES, fixFor } from '../lib/devices';
import { healthAvailable } from '../lib/health';
import { errorText } from '../lib/supabase';
import { connectFitbit, fitbitError } from '../lib/fitbit';
import { useT } from '../lib/i18n';
import { connectDevice, setRoute } from '../lib/sync';

// First run: your name, then "What do you wear?" Tap it, approve once, you're in.
export default function Welcome() {
  const c = useColors();
  const { me, reloadMe } = useAuth();
  const { t } = useT();
  useScene({ pose: 'aside' });
  const [step, setStep] = useState<'name' | 'device' | 'fix'>(me && me.name !== 'New player' ? 'device' : 'name');
  const [name, setName] = useState('');
  const [device, setDevice] = useState<Device | null>(null);
  const [fix, setFix] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  async function saveName() {
    if (!name.trim()) { setMsg(t.addName); return; }
    setBusy('name'); setMsg('');
    await reloadMe(name.trim());
    setBusy(null); setStep('device');
  }

  async function pick(d: Device) {
    setDevice(d); setMsg(''); setBusy(d.id);
    try {
      if (d.route === 'fitbit') {
        const r = await connectFitbit();
        if (r.ok) { await setRoute('fitbit'); await reloadMe(); router.replace('/'); }
        else { setFix(fitbitError(t, r.code)); setStep('fix'); }
      } else if (!healthAvailable()) {
        setFix(t.noHealthPhone);
        setStep('fix');
      } else {
        const r = await connectDevice(d);
        if (r.ok) { await reloadMe(); router.replace('/'); }
        else { setFix(fixFor(t, d)); setStep('fix'); }
      }
    } catch (e) {
      setMsg(errorText(e));
    }
    setBusy(null);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 88, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {step === 'name' && (
          <>
            <Label color={c.red}>{t.stepOf(1, 2)}</Label>
            <Heading size={44}>{t.whatName}</Heading>
            <View style={{ gap: 10, marginTop: 24 }}>
              <Input value={name} onChangeText={setName} placeholder={t.nameOnBoard} autoFocus returnKeyType="next" onSubmitEditing={saveName} />
              <Button title={t.next} onPress={saveName} busy={busy === 'name'} />
            </View>
          </>
        )}

        {step === 'device' && (
          <>
            <Label color={c.red}>{t.stepOf(2, 2)}</Label>
            <Heading size={44}>{t.whatWear}</Heading>
            <T muted style={{ marginTop: 6, marginBottom: 20 }}>{t.tapAllow}</T>
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
                    {busy === d.id ? t.connecting : deviceName(t, d)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {me?.device_label && <View style={{ marginTop: 20 }}><Button title={t.keepDevice} kind="plain" onPress={() => router.replace('/')} /></View>}
          </>
        )}

        {step === 'fix' && device && (
          <>
            <Label color={c.red}>{deviceName(t, device)}</Label>
            <Heading size={40}>{t.oneMore}</Heading>
            <T style={{ marginTop: 12, marginBottom: 24 }}>{fix}</T>
            <View style={{ gap: 10 }}>
              {device.route === 'apple_health' && healthAvailable() && !device.androidOnly && (
                <Button title={t.checkAgain} onPress={() => pick(device)} busy={busy === device.id} />
              )}
              {device.route === 'fitbit' && <Button title={t.tryAgain} onPress={() => pick(device)} busy={busy === device.id} />}
              <Button title={t.pickDifferent} kind="plain" onPress={() => setStep('device')} />
            </View>
          </>
        )}

        {!!msg && <T color={c.red} style={{ marginTop: 12 }}>{msg}</T>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
