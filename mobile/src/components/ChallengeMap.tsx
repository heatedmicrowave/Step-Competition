// The real place, in 3D: satellite photos on real terrain, real landmarks as flags, and
// everyone's dot on the trail. Without a Mapbox token the challenge screen keeps the drawn mountain.
// The token lives in the EXPO_PUBLIC_MAPBOX_TOKEN environment variable on expo.dev (production), not
// in the repo, so GitHub's secret scanning stays happy and nobody can copy it from the code.
import Mapbox, { Atmosphere, Camera, LineLayer, MapView, MarkerView, RasterDemSource, ShapeSource, Terrain } from '@rnmapbox/maps';
import { Text, View } from 'react-native';
import { Course, measure } from '../lib/courses';
import type { Lang } from '../lib/i18n';
import { SCENES, spotAt, stepsTo } from '../lib/places';

const TOKEN: string | undefined = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || undefined;
if (TOKEN) Mapbox.setAccessToken(TOKEN);

export const hasMap = (c: Course) => !!TOKEN && !!SCENES[c.id];

export type MapClimber = { id: string; initial: string; color: string; steps: number; you?: boolean };

const ACCENT = '#E0683A';
const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

export function ChallengeMap({ course, climbers, lang, locale, stepsWord }: {
  course: Course; climbers: MapClimber[]; lang: Lang; locale?: string; stepsWord: string;
}) {
  const scene = SCENES[course.id];
  if (!TOKEN || !scene) return null;
  const { camera } = scene;
  const trail = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: scene.spots.map((s) => [s.lon, s.lat]) } };

  return (
    <MapView
      style={{ flex: 1 }}
      styleURL="mapbox://styles/mapbox/satellite-v9"
      scaleBarEnabled={false}
      compassEnabled={false}
      logoPosition={{ bottom: 8, left: 8 }}
      attributionPosition={{ bottom: 8, right: 8 }}
    >
      {/* Plain satellite photos: the Standard satellite style came up empty on build 6. */}
      <Atmosphere style={{ color: '#3A3A4A', highColor: '#1E2233', horizonBlend: 0.08, spaceColor: '#0E1016', starIntensity: 0.15 }} />
      <Camera centerCoordinate={[camera.lon, camera.lat]} zoomLevel={camera.zoom} pitch={camera.pitch} heading={camera.heading} animationDuration={0} />
      <RasterDemSource id="pass1-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={514} maxZoomLevel={14}>
        <Terrain style={{ exaggeration: 1.15 }} />
      </RasterDemSource>

      <ShapeSource id="pass1-trail" shape={trail}>
        <LineLayer id="pass1-trail-line" style={{ lineColor: ACCENT, lineWidth: 2.5, lineDasharray: [1, 2], lineCap: 'round' }} />
      </ShapeSource>

      {scene.spots.filter((s) => s.flag).map((s) => (
        <MarkerView key={s.name} coordinate={[s.lon, s.lat]} anchor={{ x: s.left ? 1 : 0, y: 1 }} allowOverlap>
          <View style={{ flexDirection: s.left ? 'row-reverse' : 'row', alignItems: 'flex-end' }} pointerEvents="none">
            <View style={{ width: 2, height: 26, backgroundColor: '#FFFFFF' }}>
              <View style={{ position: 'absolute', left: 2, top: 0, width: 0, height: 0, borderTopWidth: 5, borderBottomWidth: 5, borderLeftWidth: 11, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: ACCENT }} />
            </View>
            <View style={{ marginLeft: s.left ? 0 : 12, marginRight: s.left ? 6 : 0, marginBottom: 12, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(16,14,13,0.72)' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{s.name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontVariant: ['tabular-nums'] }}>
                {measure(course, s.at, lang, locale)} · {k(stepsTo(course, s))} {stepsWord}
              </Text>
            </View>
          </View>
        </MarkerView>
      ))}

      {climbers.map((p) => (
        <MarkerView key={p.id} coordinate={spotAt(course, scene, p.steps)} anchor={{ x: 0.5, y: 0.5 }} allowOverlap isSelected={p.you}>
          <View pointerEvents="none" style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: p.color, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: p.you ? '#FFFFFF' : '#171412' }}>{p.initial}</Text>
          </View>
        </MarkerView>
      ))}
    </MapView>
  );
}
