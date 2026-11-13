import { BarlowCondensed_500Medium, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, useFonts } from '@expo-google-fonts/barlow-condensed';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useColors } from '../components/ui';
import { AuthProvider } from '../lib/auth';
import { LanguageProvider, useT } from '../lib/i18n';
import { usePush } from '../lib/push';

export default function RootLayout() {
  const c = useColors();
  const [loaded] = useFonts({ BarlowCondensed_500Medium, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: c.bg, card: c.bg, text: c.ink, border: c.rule, primary: c.red } };

  return (
    <ThemeProvider value={theme}>
      <LanguageProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Screens />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function Screens() {
  const c = useColors();
  const { t } = useT();
  usePush();
  return (
        <Stack
          screenOptions={{
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
            headerTintColor: c.ink,
            headerTitleStyle: { fontSize: 17, fontWeight: '600' },
            headerStyle: { backgroundColor: c.bg },
            contentStyle: { backgroundColor: c.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="competition/[id]" options={{ title: '' }} />
          <Stack.Screen name="new" options={{ title: '', presentation: 'modal' }} />
          <Stack.Screen name="join" options={{ title: t.joinCode, presentation: 'modal' }} />
        </Stack>
  );
}
