import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, useColorScheme, View, ViewProps } from 'react-native';

const light = { bg: '#f6f6f3', card: '#ffffff', text: '#1b1b1b', muted: '#6b6b6b', line: '#e4e4df', accent: '#1f7a4d', gold: '#c99a1a', danger: '#c0392b' };
const dark = { bg: '#121212', card: '#1d1d1d', text: '#f0f0f0', muted: '#9a9a9a', line: '#2e2e2e', accent: '#4cc38a', gold: '#e3b84a', danger: '#ff6b5b' };
export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export function Card({ style, ...rest }: ViewProps) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }, style]} {...rest} />;
}

export function T({ muted, size = 16, bold, color, children, style }: { muted?: boolean; size?: number; bold?: boolean; color?: string; children: React.ReactNode; style?: any }) {
  const c = useColors();
  return <Text style={[{ color: color ?? (muted ? c.muted : c.text), fontSize: size, fontWeight: bold ? '700' : '400' }, style]}>{children}</Text>;
}

export function Button({ title, onPress, busy, kind = 'primary' }: { title: string; onPress: () => void; busy?: boolean; kind?: 'primary' | 'plain' }) {
  const c = useColors();
  const primary = kind === 'primary';
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: primary ? c.accent : 'transparent', borderColor: primary ? c.accent : c.line, opacity: pressed || busy ? 0.6 : 1 }]}
    >
      {busy ? <ActivityIndicator color={primary ? '#fff' : c.text} /> : <Text style={{ color: primary ? '#fff' : c.text, fontWeight: '600', fontSize: 16 }}>{title}</Text>}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const c = useColors();
  return <TextInput placeholderTextColor={c.muted} {...props} style={[styles.input, { color: c.text, borderColor: c.line, backgroundColor: c.card }, props.style]} />;
}

export const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14, gap: 10 },
  button: { borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
});

export const fmt = (n: number) => n.toLocaleString();
