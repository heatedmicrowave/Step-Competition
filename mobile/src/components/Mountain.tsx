// The mountain behind the app. One backdrop sits under every screen; each screen says where it
// wants it (front and centre on Today, pushed aside and faded on forms, close up with everyone's
// dot on the trail inside a challenge) and the backdrop glides there.
import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import type { CourseId } from '../lib/courses';

// Every drawing lives in a 390 × 520 box.
const VW = 390, VH = 520;
const GROUND = '#2A241F', SHADE = '#8E7D69', LIT = '#E9DCC6', SNOW = '#FBF6EC', SKY = '#1B1714', SEA = '#1F2B33', ACCENT = '#E0683A';

type Art = {
  shapes: { points: string; fill: string; opacity?: number }[];
  /** The trail from the start to the top (or the end of the road), in drawing coordinates. */
  trail: [number, number][];
  labels?: { x: number; y: number; text: string; anchor?: 'start' | 'end' }[];
  flag?: boolean;
  /** Draw the sea behind it (routes). */
  sea?: boolean;
};

const ARTS: Record<Exclude<CourseId, 'classic'>, Art> = {
  matterhorn: {
    shapes: [
      { points: '-20,520 40,430 95,380 120,330 150,250 170,170 185,110 194,66 199,48 208,38 216,42 220,56 228,92 246,150 262,210 290,270 318,330 350,380 410,450 410,520', fill: SHADE },
      { points: '-20,520 40,430 95,380 120,330 150,250 170,170 185,110 194,66 199,48 208,38 206,90 200,150 190,230 176,320 156,420 132,520', fill: LIT },
      { points: '194,66 199,48 208,38 216,42 220,56 226,84 214,92 206,80 200,96 190,90', fill: SNOW },
      { points: '150,250 170,170 180,150 186,176 178,214 166,236 158,262', fill: SNOW, opacity: 0.7 },
      { points: '-20,520 50,468 120,488 190,452 262,478 330,446 410,470 410,520', fill: GROUND },
    ],
    trail: [[110, 482], [160, 446], [132, 410], [176, 364], [152, 322], [188, 272], [170, 226], [196, 176], [184, 128], [200, 86], [207, 42]],
    flag: true,
  },
  vesuvius: {
    shapes: [
      { points: '-20,520 30,470 90,400 130,330 170,292 188,302 210,262 230,238 244,246 258,246 270,234 300,280 350,360 410,440 410,520', fill: SHADE },
      { points: '-20,520 30,470 90,400 130,330 170,292 188,302 210,262 230,238 236,300 228,380 210,460 196,520', fill: LIT },
      { points: '230,238 244,246 258,246 270,234 262,252 238,252', fill: GROUND },
      { points: '-20,520 60,476 140,494 220,470 300,490 410,462 410,520', fill: GROUND },
    ],
    trail: [[150, 486], [196, 452], [170, 412], [214, 372], [196, 334], [232, 300], [222, 270], [246, 248]],
    flag: true,
  },
  half_dome: {
    shapes: [
      { points: '-20,520 40,470 100,400 150,330 190,284 230,254 270,240 300,242 312,252 314,300 318,380 330,450 410,480 410,520', fill: LIT },
      { points: '-20,520 40,470 100,400 150,330 190,284 230,254 232,300 200,380 160,460 140,520', fill: SHADE },
      { points: '312,252 314,300 318,380 330,450 300,450 296,380 300,300', fill: SNOW, opacity: 0.55 },
      { points: '-20,520 70,480 150,496 230,474 320,492 410,470 410,520', fill: GROUND },
    ],
    trail: [[90, 488], [134, 446], [116, 410], [168, 360], [156, 330], [206, 296], [240, 268], [270, 250], [296, 243]],
    flag: true,
  },
  big_sur: {
    shapes: [
      { points: '140,0 410,0 410,520 300,520 280,470 250,430 230,370 200,330 190,270 160,220 150,160 130,110 120,50', fill: SHADE },
      { points: '140,0 175,0 170,60 182,110 200,170 222,226 236,282 258,330 282,380 300,430 326,480 340,520 300,520 280,470 250,430 230,370 200,330 190,270 160,220 150,160 130,110 120,50', fill: LIT },
    ],
    trail: [[150, 12], [150, 60], [164, 110], [180, 160], [204, 214], [220, 268], [234, 318], [258, 368], [280, 418], [304, 468], [326, 512]],
    labels: [{ x: 112, y: 22, text: 'Carmel', anchor: 'end' }, { x: 292, y: 512, text: 'San Simeon', anchor: 'end' }],
    sea: true,
  },
};

export function artFor(id: CourseId): Exclude<CourseId, 'classic'> {
  return id === 'classic' ? 'matterhorn' : id;
}

export type Climber = { id: string; initial: string; color: string; frac: number };
export type Pose = 'home' | 'aside' | 'climb';
type Scene = { pose: Pose; art?: Exclude<CourseId, 'classic'>; climbers?: Climber[] };

/** A point `frac` (0–1) of the way along a trail. */
function along(trail: [number, number][], frac: number) {
  const seg = trail.slice(1).map((p, i) => Math.hypot(p[0] - trail[i][0], p[1] - trail[i][1]));
  let left = Math.max(0, Math.min(1, frac)) * seg.reduce((a, b) => a + b, 0);
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i]) {
      const k = seg[i] ? left / seg[i] : 0;
      return { x: trail[i][0] + (trail[i + 1][0] - trail[i][0]) * k, y: trail[i][1] + (trail[i + 1][1] - trail[i][1]) * k };
    }
    left -= seg[i];
  }
  const end = trail[trail.length - 1];
  return { x: end[0], y: end[1] };
}

/** Climbers who are at nearly the same spot get nudged sideways so every dot stays visible. */
function placed(art: Art, climbers: Climber[]) {
  const out: { c: Climber; x: number; y: number }[] = [];
  for (const c of [...climbers].sort((a, b) => a.frac - b.frac)) {
    let { x, y } = along(art.trail, c.frac);
    while (out.some((o) => Math.hypot(o.x - x, o.y - y) < 20)) x += 18;
    out.push({ c, x, y });
  }
  return out;
}

export function MountainArt({ art, climbers = [], showTrail }: { art: Exclude<CourseId, 'classic'>; climbers?: Climber[]; showTrail?: boolean }) {
  const a = ARTS[art];
  const top = a.trail[a.trail.length - 1];
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`}>
      {a.sea && <Rect x={-20} y={0} width={VW + 40} height={VH} fill={SEA} />}
      {a.shapes.map((s, i) => <Polygon key={i} points={s.points} fill={s.fill} opacity={s.opacity ?? 1} />)}
      {showTrail && (
        <G>
          <Polyline points={a.trail.map((p) => p.join(',')).join(' ')} fill="none" stroke={SKY} strokeWidth={2.5} strokeDasharray="1 7" strokeLinecap="round" />
          {a.flag ? (
            <G>
              <Line x1={top[0]} y1={top[1]} x2={top[0]} y2={top[1] - 22} stroke={SKY} strokeWidth={2} />
              <Polygon points={`${top[0]},${top[1] - 22} ${top[0] + 15},${top[1] - 17} ${top[0]},${top[1] - 12}`} fill={ACCENT} />
            </G>
          ) : <Circle cx={top[0]} cy={top[1]} r={5} fill={ACCENT} />}
          {a.labels?.map((l) => <SvgText key={l.text} x={l.x} y={l.y} fill={LIT} fontSize={13} fontFamily="BarlowCondensed_600SemiBold" textAnchor={l.anchor ?? 'start'}>{l.text.toUpperCase()}</SvgText>)}
          {placed(a, climbers).map(({ c, x, y }) => (
            <G key={c.id}>
              <Circle cx={x} cy={y} r={12} fill={c.color} stroke={SKY} strokeWidth={2.5} />
              <SvgText x={x} y={y + 4.5} fill={SKY} fontSize={13} fontFamily="BarlowCondensed_700Bold" textAnchor="middle">{c.initial}</SvgText>
            </G>
          ))}
        </G>
      )}
    </Svg>
  );
}

const SceneContext = createContext<(s: Scene) => void>(() => {});

/** The backdrop plus the screens on top of it. */
export function Backdrop({ children }: { children: React.ReactNode }) {
  const { width: W, height: SH } = useWindowDimensions();
  const A = (W * VH) / VW;
  const box = A + 600; // the drawing plus ground below it, so it never shows a gap
  const [scene, setScene] = useState<Scene>({ pose: 'home', art: 'matterhorn' });
  const [art, setArt] = useState<Exclude<CourseId, 'classic'>>('matterhorn');
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(SH)).current;
  const s = useRef(new Animated.Value(1)).current;
  const o = useRef(new Animated.Value(0)).current;

  const target = useCallback((pose: Pose) => {
    // Where the drawing's top-left corner should land, and at what size.
    const p = pose === 'home' ? { left: 0, top: SH - A * 0.88, scale: 1, opacity: 1 }
      : pose === 'climb' ? { left: 0, top: 44, scale: 1, opacity: 1 }
      : { left: W * 0.38, top: SH - A * 0.5, scale: 0.75, opacity: 0.22 };
    // React Native scales around the centre of the box; shift so the top-left lands where we want.
    return { x: p.left - (W / 2) * (1 - p.scale), y: p.top - (box / 2) * (1 - p.scale), scale: p.scale, opacity: p.opacity };
  }, [W, SH, A, box]);

  useEffect(() => {
    const want = scene.art ?? 'matterhorn';
    const t = target(scene.pose);
    const move = () => Animated.parallel([
      Animated.timing(x, { toValue: t.x, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(y, { toValue: t.y, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(s, { toValue: t.scale, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(o, { toValue: t.opacity, duration: 450, useNativeDriver: true }),
    ]).start();
    if (want !== art) {
      Animated.timing(o, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => { setArt(want); move(); });
    } else move();
  }, [scene.pose, scene.art, target]);

  const set = useCallback((next: Scene) => setScene(next), []);
  return (
    <SceneContext.Provider value={set}>
      <View style={{ flex: 1, backgroundColor: SKY }}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { width: W, height: box, opacity: o, transform: [{ translateX: x }, { translateY: y }, { scale: s }] }]}>
          <View style={{ width: W, height: A }}>
            <MountainArt art={art} climbers={scene.climbers} showTrail={scene.pose === 'climb'} />
          </View>
          <View style={{ flex: 1, backgroundColor: ARTS[art].sea ? SHADE : GROUND }} />
        </Animated.View>
        {children}
      </View>
    </SceneContext.Provider>
  );
}

/** Call from a screen: where the mountain should be while this screen is showing. */
export function useScene(scene: Scene) {
  const set = useContext(SceneContext);
  const key = JSON.stringify(scene);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  useFocusEffect(useCallback(() => { set(sceneRef.current); }, [key, set]));
}

/** How tall the drawing is on this screen, so a screen can leave room to see it. */
export function useArtHeight() {
  const { width } = useWindowDimensions();
  return useMemo(() => (width * VH) / VW, [width]);
}

/** Dot colours: you are always the accent; everyone else gets one of these, told apart by lightness too. */
export const CLIMBER_COLORS = ['#F3EADB', '#7FA7BF', '#B7C98F', '#C9A0DC', '#D9B36C', '#8FC9B9'];
export const YOU_COLOR = ACCENT;
