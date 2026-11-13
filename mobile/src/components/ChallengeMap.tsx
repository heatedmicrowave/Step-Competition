// The real place, in 3D: satellite photos on real terrain, real landmarks as flags, and
// everyone's dot on the trail. Without a Mapbox token the challenge screen keeps the drawn mountain.
// The token lives in the EXPO_PUBLIC_MAPBOX_TOKEN environment variable on expo.dev (production), not
// in the repo, so GitHub's secret scanning stays happy and nobody can copy it from the code.
import Mapbox, { Camera, LineLayer, MapView, MarkerView, RasterDemSource, ShapeSource, Terrain } from '@rnmapbox/maps';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MAP_PROPS, MapLook } from './mapLook';
import { Course, measure } from '../lib/courses';
import type { Lang } from '../lib/i18n';
import { SCENES, spotAt, stepsTo } from '../lib/places';
import { SwissPhotos } from './SwissPhotos';

const TOKEN: string | undefined = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || undefined;
if (TOKEN) Mapbox.setAccessToken(TOKEN);

export const hasMap = (c: Course) => !!TOKEN && !!SCENES[c.id];
/** True when the build has a Mapbox token, so the 3D maps (and the mountain home) can show. */
export const MAP_ON = !!TOKEN;

export type MapClimber = { id: string; initial: string; color: string; steps: number; you?: boolean };

const ACCENT = '#E0683A';
const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

export function ChallengeMap({ course, climbers, lang, locale, stepsWord }: {
  course: Course; climbers: MapClimber[]; lang: Lang; locale?: string; stepsWord: string;
}) {
  const scene = SCENES[course.id];
  // A tapped flag shows its details; otherwise only the next landmark ahead of you is named.
  const [picked, setPicked] = useState<string | null>(null);
  if (!TOKEN || !scene) return null;
  const { camera } = scene;
  const trail = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: scene.spots.map((s) => [s.lon, s.lat]) } };
  const flags = scene.spots.filter((s) => s.flag);
  const mine = climbers.find((p) => p.you)?.steps ?? 0;
  const next = flags.find((s) => stepsTo(course, s) > mine) ?? flags[flags.length - 1];

  return (
    <MapView style={{ flex: 1 }} {...MAP_PROPS} onPress={() => setPicked(null)}
      // Above the bottom fade, so Mapbox's logo and credit stay visible as their terms require.
      logoPosition={{ bottom: 44, left: 22 }} attributionPosition={{ bottom: 44, right: 22 }}>
      <MapLook />
      <Camera centerCoordinate={[camera.lon, camera.lat]} zoomLevel={camera.zoom} pitch={camera.pitch} heading={camera.heading} animationDuration={0} />
      <RasterDemSource id="pass1-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={514} maxZoomLevel={14}>
        <Terrain style={{ exaggeration: 1.15 }} />
      </RasterDemSource>

      {course.id === 'matterhorn' && <SwissPhotos id="pass1" />}

      <ShapeSource id="pass1-trail" shape={trail}>
        <LineLayer id="pass1-trail-line" style={{ lineColor: ACCENT, lineWidth: 2, lineOpacity: 0.9, lineDasharray: [1, 2], lineCap: 'round' }} />
      </ShapeSource>

      {flags.map((s) => {
        const named = picked ? picked === s.name : next === s;
        return (
          <MarkerView key={s.name} coordinate={[s.lon, s.lat]} anchor={{ x: s.left ? 1 : 0, y: 1 }} allowOverlap>
            <Pressable onPress={() => setPicked(picked === s.name ? null : s.name)} hitSlop={14}
              style={{ flexDirection: s.left ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              <View style={{ width: 1.5, height: 22, backgroundColor: '#FFFFFF' }}>
                <View style={{ position: 'absolute', left: 1.5, top: 0, width: 0, height: 0, borderTopWidth: 4, borderBottomWidth: 4, borderLeftWidth: 9, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: ACCENT }} />
              </View>
              {named && (
                <View style={{ marginLeft: s.left ? 0 : 11, marginRight: s.left ? 5 : 0, marginBottom: 10, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: 'rgba(23,20,18,0.55)' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>{s.name}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 10, fontVariant: ['tabular-nums'] }}>
                    {measure(course, s.at, lang, locale)} · {k(stepsTo(course, s))} {stepsWord}
                  </Text>
                </View>
              )}
            </Pressable>
          </MarkerView>
        );
      })}

      {climbers.map((p) => (
        <MarkerView key={p.id} coordinate={spotAt(course, scene, p.steps)} anchor={{ x: 0.5, y: 0.5 }} allowOverlap isSelected={p.you}>
          <View pointerEvents="none" style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: p.color, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: p.you ? '#FFFFFF' : '#171412' }}>{p.initial}</Text>
          </View>
        </MarkerView>
      ))}
    </MapView>
  );
}
