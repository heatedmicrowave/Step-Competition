import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, Card, fmt, Input, T, useColors } from '../components/ui';
import { useAuth } from '../lib/auth';
import { askForStepAccess, brandOf, healthAvailable, listStepSources, StepSource } from '../lib/health';
import { errorText, supabase } from '../lib/supabase';
import { getChosenSource, setChosenSource, syncSteps } from '../lib/sync';

export default function Settings() {
  const c = useColors();
  const { me, reloadMe } = useAuth();
  const [name, setName] = useState(me?.name === 'New player' ? '' : me?.name ?? '');
  const [sources, setSources] = useState<StepSource[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => { getChosenSource().then(setChosen); }, []);

  async function saveName() {
    if (!name.trim()) return;
    setBusy('name'); await reloadMe(name.trim()); setBusy('');
    if (!sources && healthAvailable()) connect();
    else router.replace('/');
  }

  async function connect() {
    setBusy('health'); setMsg('');
    try {
      await askForStepAccess();
      const list = await listStepSources();
      setSources(list);
      if (list.length === 0) setMsg('No steps found in Apple Health yet. In Health, check that your watch app (Garmin Connect, Oura, WHOOP…) is allowed to write Steps.');
    } catch (e) { setMsg(errorText(e)); }
    setBusy('');
  }

  async function pick(s: StepSource | null) {
    setChosen(s?.bundleId ?? null);
    await setChosenSource(s?.bundleId ?? null);
    const { error } = await supabase.rpc('app_set_source', {
      p_source: s ? brandOf(s.bundleId, s.name) : 'apple_health',
      p_device_label: s ? s.name : 'Apple Health',
    });
    if (error) { setMsg(errorText(error)); return; }
    await reloadMe();
    try { await syncSteps(); setMsg('Saved and synced.'); } catch (e) { setMsg(errorText(e)); }
  }

  async function link() {
    setBusy('link'); setMsg('');
    const { error } = await supabase.rpc('app_link_player', { p_key: key.trim() });
    setBusy('');
    if (error) { setMsg(errorText(error)); return; }
    await reloadMe();
    setMsg('Linked. Your website history and competitions are now on this account.');
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Card>
        <T bold>Your name on leaderboards</T>
        <Input value={name} onChangeText={setName} placeholder="e.g. Heated microwave" />
        <Button title="Save" onPress={saveName} busy={busy === 'name'} />
      </Card>

      <Card>
        <T bold>Where your steps come from</T>
        {healthAvailable() ? (
          <>
            <T muted size={14}>Your watch app writes steps into Apple Health; pick it here so we count only its steps. Works for Garmin, Oura, WHOOP, Polar, Coros, Suunto, Xiaomi, Amazfit, Huawei, Apple Watch and more.</T>
            <Button title={sources ? 'Refresh list' : 'Connect Apple Health'} onPress={connect} busy={busy === 'health'} />
            {sources && (
              <>
                <SourceRow label="All of Apple Health" detail="Apple's combined total" selected={chosen === null} onPress={() => pick(null)} />
                {sources.map((s) => (
                  <SourceRow key={s.bundleId} label={s.name} detail={`${fmt(s.todaySteps)} today`} selected={chosen === s.bundleId} onPress={() => pick(s)} />
                ))}
              </>
            )}
          </>
        ) : (
          <T muted size={14}>Apple Health isn't available here. Android (Health Connect) and Fitbit are coming.</T>
        )}
      </Card>

      <Card>
        <T bold>Coming from the website?</T>
        <T muted size={14}>Paste your old secret key to bring your step history and competitions into this account.</T>
        <Input value={key} onChangeText={setKey} placeholder="Secret key" autoCapitalize="none" autoCorrect={false} />
        <Button title="Link" kind="plain" onPress={link} busy={busy === 'link'} />
      </Card>

      {!!msg && <T style={{ marginBottom: 14 }}>{msg}</T>}
      <View style={{ gap: 10 }}>
        <Button title="Done" onPress={() => router.replace('/')} />
        <Button title="Sign out" kind="plain" onPress={async () => { await supabase.auth.signOut(); router.replace('/sign-in'); }} />
      </View>
    </ScrollView>
  );
}

function SourceRow({ label, detail, selected, onPress }: { label: string; detail: string; selected: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: c.line }}>
      <View style={{ flex: 1 }}><T>{label}</T><T muted size={13}>{detail}</T></View>
      <T size={20} color={c.accent}>{selected ? '●' : '○'}</T>
    </Pressable>
  );
}
