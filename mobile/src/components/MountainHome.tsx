// The home screen as the mountain: the real Matterhorn in 3D, full screen. Three places on it are
// the way in: Zermatt (base camp: you and your watch), the Hörnli Hut (your challenges) and the
// summit (the public board). Tap one and the camera flies there and its panel slides up. The view
// stays still until you tap: no forced panning.
import { Camera, LineLayer, MapView, MarkerView, RasterDemSource, ShapeSource, Terrain } from '@rnmapbox/maps';
import { MAP_PROPS, MapLook, PAGE } from './mapLook';
import { SCENES } from '../lib/places';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwissPhotos } from './SwissPhotos';
import { fmt, useColors } from './ui';

export type Place = 'base' | 'hut' | 'summit';

const ACCENT = '#E0683A';
// The whole mountain, tilted, as in the challenge view.
const HOME = { lon: 7.6905, lat: 45.9905, zoom: 12.3, pitch: 72, heading: 245 };
// Close-ups look down more than the overview: a steep tilt shows the far, blurry horizon.
const PLACES: Record<Place, { lon: number; lat: number; zoom: number; pitch: number; heading: number }> = {
  base:   { lon: 7.7491, lat: 46.0207, zoom: 14.6, pitch: 50, heading: 235 },
  hut:    { lon: 7.6731, lat: 45.9822, zoom: 14.8, pitch: 55, heading: 245 },
  summit: { lon: 7.6586, lat: 45.9764, zoom: 14.6, pitch: 58, heading: 250 },
};

const TRAIL = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const,
  coordinates: (SCENES.matterhorn?.spots ?? []).map((s) => [s.lon, s.lat]) } };

export function MountainHome({ steps, sub, labels, panels }: {
  /** Today's steps (null while loading). */
  steps: number | null;
  /** The small line under the number: device and sync time. */
  sub: string;
  /** Each place's name and what it holds, e.g. ["Hörnli Hut", "Your challenges"]. */
  labels: Record<Place, [string, string]>;
  panels: Record<Place, ReactNode>;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState<Place | null>(null);
  // Until the first tap the camera just sits on the whole mountain (no animation on open).
  const [moved, setMoved] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, { toValue: open ? 1 : 0, duration: 260, useNativeDriver: true }).start();
  }, [open]);

  const cam = open ? PLACES[open] : HOME;
  const panelH = Math.round(height * 0.55);

  return (
    <View style={{ flex: 1, backgroundColor: PAGE }}>
      <MapView style={{ flex: 1 }} {...MAP_PROPS} onPress={() => setOpen(null)}>
        <MapLook />
        <Camera
          defaultSettings={{ centerCoordinate: [HOME.lon, HOME.lat], zoomLevel: HOME.zoom, pitch: HOME.pitch, heading: HOME.heading }}
          {...(moved ? { centerCoordinate: [cam.lon, cam.lat], zoomLevel: cam.zoom, pitch: cam.pitch, heading: cam.heading,
            // Keep the place in the visible part above the panel.
            padding: { paddingTop: 0, paddingLeft: 0, paddingRight: 0, paddingBottom: open ? panelH - 40 : 0 } } : {})}
          animationMode="flyTo" animationDuration={850} />
        <RasterDemSource id="home-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={514} maxZoomLevel={14}>
          <Terrain style={{ exaggeration: 1.15 }} />
        </RasterDemSource>
        <SwissPhotos id="home" />
        {/* The normal route up, as in the Matterhorn challenge. */}
        <ShapeSource id="home-trail" shape={TRAIL}>
          <LineLayer id="home-trail-line" style={{ lineColor: ACCENT, lineWidth: 2, lineOpacity: 0.9, lineDasharray: [1, 2], lineCap: 'round' }} />
        </ShapeSource>

        {(Object.keys(PLACES) as Place[]).map((p) => (
          <MarkerView key={p} coordinate={[PLACES[p].lon, PLACES[p].lat]} anchor={{ x: 0, y: 1 }} allowOverlap>
            <Pressable onPress={() => { setMoved(true); setOpen(open === p ? null : p); }} hitSlop={12}
              style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <View style={{ width: 1.5, height: 26, backgroundColor: '#FFFFFF' }}>
                <View style={{ position: 'absolute', left: 1.5, top: 0, width: 0, height: 0, borderTopWidth: 5, borderBottomWidth: 5, borderLeftWidth: 11, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: ACCENT }} />
              </View>
              <View style={{ marginLeft: 12, marginBottom: 12, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9,
                backgroundColor: open === p ? ACCENT : 'rgba(23,20,18,0.55)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{labels[p][0]}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500' }}>{labels[p][1]}</Text>
              </View>
            </Pressable>
          </MarkerView>
        ))}
      </MapView>

      {/* Today's steps, floating at the top. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, alignItems: 'flex-start' }}>
        <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: 'rgba(23,20,18,0.55)' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 40, lineHeight: 44, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -1 }}>
            {steps === null ? '—' : fmt(steps)}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '500' }}>{sub}</Text>
        </View>
      </View>

      {/* The place's panel. */}
      <Animated.View pointerEvents={open ? 'auto' : 'none'}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: panelH,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [panelH + 20, 0] }) }] }}>
        <Panel onClose={() => setOpen(null)}>{open ? panels[open] : null}</Panel>
      </Animated.View>
    </View>
  );
}

function Panel({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
      <Pressable onPress={onClose} hitSlop={10} style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 6 }}>
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: c.rule }} />
      </Pressable>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: 28 }}>{children}</ScrollView>
    </View>
  );
}
