import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '../lib/auth';

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
          <Stack.Screen name="index" options={{ title: 'Step Competition' }} />
          <Stack.Screen name="sign-in" options={{ title: 'Sign in', headerBackVisible: false }} />
          <Stack.Screen name="competition/[id]" options={{ title: '' }} />
          <Stack.Screen name="new" options={{ title: 'New competition', presentation: 'modal' }} />
          <Stack.Screen name="join" options={{ title: 'Join with a code', presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ title: 'You and your watch' }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
