// "X just passed you" notifications. The phone asks once for permission, then gives the server
// its Expo push address; the server (supabase/007_passed_you.sql) sends the notice when someone
// overtakes you in a challenge. Tapping it opens that challenge.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { useAuth } from './auth';
import { Lang, useT } from './i18n';
import { supabase } from './supabase';

// Show the banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// iOS doesn't let an app switch its own notification permission off, so "off" is ours: we remember
// it on the phone and swap the server's push address for a dead one, so nothing gets sent.
const OFF_KEY = 'alerts.off';
const NO_PUSH = 'ExpoPushToken[off]';

/** Whether notices are on: iOS allows them and you haven't switched them off in the app. */
export async function alertsOn() {
  const perm = await Notifications.getPermissionsAsync();
  return perm.granted && !(await AsyncStorage.getItem(OFF_KEY));
}

/** The mailbox flag: flips notices on/off in the app. Only opens iOS Settings if iOS itself blocks them. */
export async function toggleAlerts(lang: Lang) {
  if (await alertsOn()) {
    await AsyncStorage.setItem(OFF_KEY, '1');
    await supabase.rpc('app_set_push_token', { p_token: NO_PUSH, p_lang: lang });
    return;
  }
  await AsyncStorage.removeItem(OFF_KEY);
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted && !perm.canAskAgain) { Linking.openSettings(); return; }
  await register(lang);
}

export async function register(lang: Lang) {
  if (await AsyncStorage.getItem(OFF_KEY)) return;
  const now = await Notifications.getPermissionsAsync();
  const perm = now.granted || !now.canAskAgain ? now : await Notifications.requestPermissionsAsync();
  if (!perm.granted) return;
  const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await supabase.rpc('app_set_push_token', { p_token: token, p_lang: lang });
}

/** Signs this phone up for notices once you're signed in, and opens a challenge when one is tapped. */
export function usePush() {
  const { me } = useAuth();
  const { lang } = useT();

  useEffect(() => {
    if (me) register(lang).catch(() => {});
  }, [me?.id, lang]);

  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const id = (last?.notification.request.content.data as any)?.competition;
    if (id && typeof id === 'string') router.push(`/competition/${id}`);
  }, [last]);
}
