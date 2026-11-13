// "X just passed you" notifications. The phone asks once for permission, then gives the server
// its Expo push address; the server (supabase/007_passed_you.sql) sends the notice when someone
// overtakes you in a challenge. Tapping it opens that challenge.
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from './auth';
import { Lang, useT } from './i18n';
import { supabase } from './supabase';

// Show the banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function register(lang: Lang) {
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
