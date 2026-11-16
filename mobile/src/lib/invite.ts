// Invite friends to a challenge: one native sheet. People you've been in a challenge with are added
// with one tap (they get a push); anyone else gets the invite link through the share sheet.
import { ActionSheetIOS, Alert, Share } from 'react-native';
import { errorIn, Strings } from './i18n';
import { inviteMessage } from './standings';
import { Competition, supabase } from './supabase';

type Person = { id: string; name: string; in_it: boolean };

export async function inviteFriends(comp: Pick<Competition, 'id' | 'name' | 'join_code'>, t: Strings, onAdded?: () => void) {
  const share = () => Share.share({ message: inviteMessage(t.shareMsg(comp.name, comp.join_code), comp.join_code) });
  const { data } = await supabase.rpc('app_people', { p_competition: comp.id });
  const people = ((data ?? []) as Person[]).filter((p) => !p.in_it).slice(0, 8);
  if (!people.length) { share(); return; }
  const options = [...people.map((p) => p.name), t.sendLink, t.cancel];
  ActionSheetIOS.showActionSheetWithOptions(
    { title: t.inviteWho(comp.name), message: t.inviteHint, options, cancelButtonIndex: options.length - 1 },
    async (i) => {
      if (i === people.length) { share(); return; }
      const p = people[i]; if (!p) return;
      const { error } = await supabase.rpc('app_add_friend', { p_competition: comp.id, p_player: p.id });
      if (error) { Alert.alert(errorIn(t, error)); return; }
      Alert.alert(t.addedFriend(p.name));
      onAdded?.();
    },
  );
}
