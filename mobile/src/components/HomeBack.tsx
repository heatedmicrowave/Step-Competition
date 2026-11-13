// A small "‹" above a page's title that goes back to the mountain (there is no tab bar any more).
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useColors } from './ui';

export function HomeBack() {
  const c = useColors();
  return (
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))} hitSlop={14} style={{ alignSelf: 'flex-start', marginLeft: -4, marginBottom: 6 }} accessibilityLabel="Back">
      <Text style={{ fontSize: 34, lineHeight: 36, color: c.ink, fontWeight: '300' }}>‹</Text>
    </Pressable>
  );
}
