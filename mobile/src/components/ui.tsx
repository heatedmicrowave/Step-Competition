// Visual language: dusk in the Alps. A dark warm ground, cream ink, one terracotta accent, and
// the Matterhorn living behind the screens. Big condensed numerals, hard rules, no emoji.
// One theme on purpose: the mountain art is drawn for this ground.
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewProps } from 'react-native';

// `red` is the accent (terracotta); the name stays so screens don't care which accent we pick.
const dusk = { bg: '#1B1714', paper: '#241F1B', ink: '#F3EADB', muted: '#A69B8A', rule: '#F3EADB', hair: '#3A322B', red: '#E0683A', onRed: '#1B1714' };
export type Colors = typeof dusk;

export const font = {
  numeral: 'BarlowCondensed_700Bold',
  heading: 'BarlowCondensed_600SemiBold',
  label: 'BarlowCondensed_500Medium',
};

export function useColors(): Colors {
  return dusk;
}

/** A block that starts with a heavy rule and a small uppercase label, like a section of a results sheet. */
export function Section({ label, style, children, ...rest }: ViewProps & { label?: string }) {
  const c = useColors();
  return (
    <View style={[{ borderTopWidth: 2, borderColor: c.rule, paddingTop: 10, marginBottom: 28, gap: 10 }, style]} {...rest}>
      {label ? <Label>{label}</Label> : null}
      {children}
    </View>
  );
}

export function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  const c = useColors();
  return <Text style={{ fontFamily: font.label, fontSize: 14, letterSpacing: 1.6, textTransform: 'uppercase', color: color ?? c.muted }}>{children}</Text>;
}

export function Numeral({ children, size = 64, color }: { children: React.ReactNode; size?: number; color?: string }) {
  const c = useColors();
  return <Text style={{ fontFamily: font.numeral, fontSize: size, lineHeight: size * 1.02, color: color ?? c.ink, fontVariant: ['tabular-nums'], letterSpacing: -0.5 }}>{children}</Text>;
}

export function Heading({ children, size = 30 }: { children: React.ReactNode; size?: number }) {
  const c = useColors();
  return <Text style={{ fontFamily: font.heading, fontSize: size, lineHeight: size * 1.05, color: c.ink, textTransform: 'uppercase', letterSpacing: 0.3 }}>{children}</Text>;
}

export function T({ muted, size = 16, bold, color, children, style }: { muted?: boolean; size?: number; bold?: boolean; color?: string; children: React.ReactNode; style?: any }) {
  const c = useColors();
  return <Text style={[{ color: color ?? (muted ? c.muted : c.ink), fontSize: size, lineHeight: size * 1.35, fontWeight: bold ? '600' : '400' }, style]}>{children}</Text>;
}

export function Button({ title, onPress, busy, kind = 'primary' }: { title: string; onPress: () => void; busy?: boolean; kind?: 'primary' | 'plain' | 'selected' }) {
  const c = useColors();
  const solid = kind !== 'plain';
  const bg = kind === 'primary' ? c.red : kind === 'selected' ? c.ink : 'transparent';
  const fg = kind === 'primary' ? c.onRed : kind === 'selected' ? c.bg : c.ink;
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, borderColor: solid ? bg : c.ink, opacity: pressed || busy ? 0.7 : 1 }]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontFamily: font.heading, fontSize: 19, letterSpacing: 1.2, textTransform: 'uppercase' }}>{title}</Text>}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const c = useColors();
  return <TextInput placeholderTextColor={c.muted} {...props} style={[styles.input, { color: c.ink, borderColor: c.ink, backgroundColor: c.paper }, props.style]} />;
}

export const styles = StyleSheet.create({
  button: { borderWidth: 1.5, borderRadius: 6, minHeight: 50, justifyContent: 'center', paddingVertical: 12, alignItems: 'center' },
  input: { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 12, fontSize: 17 },
});

export const fmt = (n: number) => n.toLocaleString();
/** "1" -> "01", like a bib or a lane. */
export const pad2 = (n: number) => String(n).padStart(2, '0');
