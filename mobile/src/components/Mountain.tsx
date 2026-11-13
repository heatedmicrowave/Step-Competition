// The mountain and route drawings: small in cards, big with everyone's dot on the trail inside a
// challenge.
import { View } from 'react-native';
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

export function MountainArt({ art, climbers = [], showTrail, viewBox, slice }: {
  art: Exclude<CourseId, 'classic'>; climbers?: Climber[]; showTrail?: boolean;
  /** Crop to part of the 390 × 520 drawing, e.g. "40 180 330 200". */
  viewBox?: string;
  /** Fill the box and crop the overflow (thumbnails) rather than fitting inside it. */
  slice?: boolean;
}) {
  const a = ARTS[art];
  const top = a.trail[a.trail.length - 1];
  return (
    <Svg width="100%" height="100%" viewBox={viewBox ?? `0 0 ${VW} ${VH}`} preserveAspectRatio={slice ? 'xMidYMax slice' : 'xMidYMid meet'}>
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

/** Dot colours: you are always the accent; everyone else gets one of these, told apart by lightness too. */
export const CLIMBER_COLORS = ['#F3EADB', '#7FA7BF', '#B7C98F', '#C9A0DC', '#D9B36C', '#8FC9B9'];
export const YOU_COLOR = ACCENT;

// The part of each drawing a thumbnail shows.
const THUMB_BOX: Record<Exclude<CourseId, 'classic'>, string> = {
  matterhorn: '30 20 340 400', vesuvius: '30 200 340 300', half_dome: '30 200 340 300', big_sur: '80 100 260 300',
};

/** A small dark tile with the course's drawing (a podium for the classic race). */
export function CourseThumb({ id, width = 64, height = 64, radius = 14 }: { id: CourseId; width?: number | `${number}%`; height?: number; radius?: number }) {
  return (
    <View style={{ width, height, borderRadius: radius, backgroundColor: id === 'big_sur' ? SEA : GROUND, overflow: 'hidden' }}>
      {id === 'classic' ? (
        <Svg width="100%" height="100%" viewBox="0 0 64 64" preserveAspectRatio="xMidYMax meet">
          <Rect x={12} y={30} width={12} height={34} fill={SHADE} />
          <Rect x={26} y={18} width={12} height={46} fill={LIT} />
          <Rect x={40} y={38} width={12} height={26} fill={SHADE} />
          <Polygon points="28,12 32,8 36,12" fill={ACCENT} />
        </Svg>
      ) : <MountainArt art={id} viewBox={THUMB_BOX[id]} slice />}
    </View>
  );
}
