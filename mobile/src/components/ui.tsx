// Visual language: simple and modern. Warm off-white ground, white rounded cards, one terracotta
// accent, the phone's own font (SF Pro on iPhone) with big heavy numbers. The mountains appear as
// small dark illustrations inside cards. No outlines, no all-caps, no emoji.
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewProps } from 'react-native';

// Older names kept so every screen reads the same palette: `paper` = card, `red` = the accent,
// `rule`/`hair` = hairlines.
const palette = {
  bg: '#F4F1EC', paper: '#FFFFFF', ink: '#171412', muted: '#6F675E',
  rule: '#E6E0D6', hair: '#ECE6DD', red: '#C14A1F', onRed: '#FFFFFF',
  /** Behind the mountain drawings. */
  dusk: '#2A241F',
};
export type Colors = typeof palette;

// undefined = the system font.
export const font = { numeral: undefined, heading: undefined, label: undefined } as const;

export function useColors(): Colors {
  return palette;
}

/** A white rounded card. */
export function Card({ style, children, ...rest }: ViewProps) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.paper, borderRadius: 20, padding: 16 }, style]} {...rest}>{children}</View>;
}

/** A group with a small title above it. */
export function Section({ label, style, children, ...rest }: ViewProps & { label?: string }) {
  return (
    <View style={[{ marginBottom: 26, gap: 10 }, style]} {...rest}>
      {label ? <Title size={20}>{label}</Title> : null}
      {children}
    </View>
  );
}

export function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  const c = useColors();
  return <Text style={{ fontSize: 13, fontWeight: '500', color: color ?? c.muted }}>{children}</Text>;
}

export function Numeral({ children, size = 64, color }: { children: React.ReactNode; size?: number; color?: string }) {
  const c = useColors();
  return <Text style={{ fontSize: size, lineHeight: size * 1.05, fontWeight: '800', color: color ?? c.ink, fontVariant: ['tabular-nums'], letterSpacing: -size / 32 }}>{children}</Text>;
}

export function Title({ children, size = 28, color }: { children: React.ReactNode; size?: number; color?: string }) {
  const c = useColors();
  return <Text style={{ fontSize: size, lineHeight: size * 1.2, fontWeight: '700', color: color ?? c.ink, letterSpacing: size > 24 ? -0.5 : -0.2 }}>{children}</Text>;
}
/** Same as Title (older name). */
export const Heading = Title;

export function T({ muted, size = 16, bold, color, children, style }: { muted?: boolean; size?: number; bold?: boolean; color?: string; children: React.ReactNode; style?: any }) {
  const c = useColors();
  return <Text style={[{ color: color ?? (muted ? c.muted : c.ink), fontSize: size, lineHeight: size * 1.35, fontWeight: bold ? '600' : '400' }, style]}>{children}</Text>;
}

export function Button({ title, onPress, busy, kind = 'primary' }: { title: string; onPress: () => void; busy?: boolean; kind?: 'primary' | 'plain' | 'selected' }) {
  const c = useColors();
  const bg = kind === 'primary' ? c.red : kind === 'selected' ? c.ink : c.paper;
  const fg = kind === 'primary' ? c.onRed : kind === 'selected' ? c.paper : c.ink;
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: pressed || busy ? 0.75 : 1 }]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontSize: 16, fontWeight: '600' }}>{title}</Text>}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const c = useColors();
  return <TextInput placeholderTextColor={c.muted} {...props} style={[styles.input, { color: c.ink, backgroundColor: c.paper }, props.style]} />;
}

/** A thin progress bar. */
export function Bar({ value, color }: { value: number; color?: string }) {
  const c = useColors();
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: c.hair, overflow: 'hidden' }}>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: color ?? c.red, width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </View>
  );
}

export const styles = StyleSheet.create({
  button: { borderRadius: 25, minHeight: 50, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  input: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, fontSize: 17 },
});

export const fmt = (n: number) => n.toLocaleString();
/** "1" -> "01". */
export const pad2 = (n: number) => String(n).padStart(2, '0');
