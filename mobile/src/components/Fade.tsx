// A soft fade from the page colour to clear, laid over the top or bottom edge of a map so the
// mountain melts into the screen instead of sitting in a box.
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { View } from 'react-native';

export function Fade({ edge, height, color }: { edge: 'top' | 'bottom'; height: number; color: string }) {
  const id = `fade-${edge}`;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, height, [edge]: 0 }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1={edge === 'top' ? '0' : '1'} x2="0" y2={edge === 'top' ? '1' : '0'}>
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="0.45" stopColor={color} stopOpacity={0.55} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
