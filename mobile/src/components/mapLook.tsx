// One look for every map in the app, so it reads as "our mountain", not an embedded map:
// photos softened and warmed toward the app's palette, a cream sky that melts into the page,
// and no spinning or tilting by hand.
import { Atmosphere, RasterLayer } from '@rnmapbox/maps';

/** Softer, slightly faded photo grade (less saturated, lifted shadows, gentler highlights). */
export const GRADE = {
  rasterSaturation: -0.32,
  rasterContrast: -0.06,
  rasterBrightnessMin: 0.06,
  rasterBrightnessMax: 0.96,
  rasterFadeDuration: 200,
};

/** The page colour; the sky and haze fade into it. */
export const PAGE = '#F4F1EC';

/** Props every MapView shares. */
export const MAP_PROPS = {
  styleURL: 'mapbox://styles/mapbox/satellite-v9',
  scaleBarEnabled: false,
  compassEnabled: false,
  rotateEnabled: false,
  pitchEnabled: false,
  logoPosition: { bottom: 6, left: 6 },
  attributionPosition: { bottom: 6, right: 6 },
} as const;

/** Grades the style's own photo layer and sets a warm, hazy sky. Put inside a MapView. */
export function MapLook() {
  return (
    <>
      <RasterLayer id="satellite" existing style={GRADE} />
      <Atmosphere style={{ color: PAGE, highColor: '#E8DCCB', horizonBlend: 0.14, spaceColor: PAGE, starIntensity: 0, range: [1.5, 9] }} />
    </>
  );
}
