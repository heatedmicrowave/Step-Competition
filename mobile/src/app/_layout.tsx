import { BarlowCondensed_500Medium, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, useFonts } from '@expo-google-fonts/barlow-condensed';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View } from 'react-native';
import { font, useColors } from '../components/ui';
import { AuthProvider } from '../lib/auth';

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  const c = useColors();
  const [loaded] = useFonts({ BarlowCondensed_500Medium, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  const base = dark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: c.bg, card: c.bg, text: c.ink, border: c.hair, primary: c.red } };

  return (
    <ThemeProvider value={theme}>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
            headerTintColor: c.ink,
            headerTitleStyle: { fontFamily: font.heading, fontSize: 20 },
            contentStyle: { backgroundColor: c.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: '' }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="competition/[id]" options={{ title: '' }} />
          <Stack.Screen name="new" options={{ title: 'NEW COMPETITION', presentation: 'modal' }} />
          <Stack.Screen name="join" options={{ title: 'JOIN', presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ title: 'YOU' }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
