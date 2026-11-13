import { BarlowCondensed_500Medium, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, useFonts } from '@expo-google-fonts/barlow-condensed';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Backdrop } from '../components/Mountain';
import { font, useColors } from '../components/ui';
import { AuthProvider } from '../lib/auth';
import { LanguageProvider, useT } from '../lib/i18n';

export default function RootLayout() {
  const c = useColors();
  const [loaded] = useFonts({ BarlowCondensed_500Medium, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  // Screens are see-through so the mountain behind them shows.
  const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: 'transparent', card: c.bg, text: c.ink, border: c.hair, primary: c.red } };

  return (
    <ThemeProvider value={theme}>
      <LanguageProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Backdrop>
            <Screens />
          </Backdrop>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function Screens() {
  const c = useColors();
  const { t } = useT();
  return (
        <Stack
          screenOptions={{
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
            headerTintColor: c.ink,
            headerTitleStyle: { fontFamily: font.heading, fontSize: 20 },
            contentStyle: { backgroundColor: 'transparent' },
            headerTransparent: true,
            headerStyle: { backgroundColor: 'transparent' },
            // Screens cross-fade while the mountain glides to its next spot.
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" options={{ title: '' }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="competition/[id]" options={{ title: '' }} />
          <Stack.Screen name="new" options={{ title: t.titleNew }} />
          <Stack.Screen name="join" options={{ title: t.titleJoin }} />
          <Stack.Screen name="settings" options={{ title: t.titleYou }} />
        </Stack>
  );
}
