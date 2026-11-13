// Real places along each challenge, for the 3D map. A climb's spots carry their real altitude in
// metres; a route's carry their distance along the road in km. Players sit between them by how
// far they have come, so a flag at 3,260 m is reached at the same moment the altitude reads 3,260 m.
// Coordinates come from Wikipedia where it has them; the huts, Sub Dome, Bixby Bridge, Point Lobos
// and the Vesuvius spots were placed by hand and checked against elevation data.
import type { Course, CourseId } from './courses';

/** `left`: the label sits left of the pole, for flags that would otherwise cover a neighbour's label. */
export type Spot = { name: string; lat: number; lon: number; at: number; flag?: boolean; left?: boolean };
export type Scene = {
  spots: Spot[];
  /** Where the camera starts: looking at the whole climb or route. */
  camera: { lat: number; lon: number; zoom: number; pitch: number; heading: number };
};

export const SCENES: Partial<Record<CourseId, Scene>> = {
  matterhorn: {
    spots: [
      { name: 'Zermatt', lat: 46.0207, lon: 7.7491, at: 1620, flag: true },
      { name: 'Furi', lat: 46.0039, lon: 7.7339, at: 1867 },
      { name: 'Schwarzsee', lat: 45.9908, lon: 7.7069, at: 2583, flag: true },
      { name: 'Hörnli Hut', lat: 45.9822, lon: 7.6731, at: 3260, flag: true },
      { name: 'Solvay Hut', lat: 45.9792, lon: 7.6648, at: 4003, flag: true, left: true },
      { name: 'Matterhorn', lat: 45.9764, lon: 7.6586, at: 4478, flag: true },
    ],
    camera: { lat: 45.9905, lon: 7.6905, zoom: 12.3, pitch: 72, heading: 245 },
  },
  vesuvius: {
    spots: [
      { name: 'Herculaneum', lat: 40.8060, lon: 14.3482, at: 20, flag: true },
      { name: 'Vesuvius Observatory', lat: 40.8236, lon: 14.4011, at: 608, flag: true },
      { name: 'Gran Cono trailhead', lat: 40.8248, lon: 14.4207, at: 1000, flag: true },
      { name: 'Crater rim', lat: 40.8241, lon: 14.4242, at: 1170, flag: true },
      { name: 'Vesuvius', lat: 40.8214, lon: 14.4261, at: 1281, flag: true },
    ],
    camera: { lat: 40.8120, lon: 14.3790, zoom: 12.4, pitch: 70, heading: 65 },
  },
  half_dome: {
    spots: [
      { name: 'Happy Isles', lat: 37.7317, lon: -119.5587, at: 1220, flag: true },
      { name: 'Vernal Fall', lat: 37.7274, lon: -119.5438, at: 1525, flag: true },
      { name: 'Nevada Fall', lat: 37.7248, lon: -119.5334, at: 1810, flag: true },
      { name: 'Sub Dome', lat: 37.7480, lon: -119.5300, at: 2440, flag: true },
      { name: 'Half Dome', lat: 37.7460, lon: -119.5329, at: 2694, flag: true },
    ],
    camera: { lat: 37.7200, lon: -119.5600, zoom: 12.6, pitch: 68, heading: 45 },
  },
  big_sur: {
    spots: [
      { name: 'Carmel', lat: 36.5552, lon: -121.9233, at: 0, flag: true },
      { name: 'Point Lobos', lat: 36.5160, lon: -121.9400, at: 6 },
      { name: 'Bixby Bridge', lat: 36.3715, lon: -121.9017, at: 21, flag: true },
      { name: 'Point Sur Lighthouse', lat: 36.3063, lon: -121.9015, at: 31, flag: true },
      { name: 'Pfeiffer Big Sur', lat: 36.2500, lon: -121.7830, at: 42 },
      { name: 'McWay Falls', lat: 36.1578, lon: -121.6722, at: 60, flag: true },
      { name: 'Ragged Point', lat: 35.7597, lon: -121.3277, at: 121, flag: true },
      { name: 'Hearst Castle', lat: 35.6853, lon: -121.1678, at: 145, flag: true },
    ],
    camera: { lat: 36.0300, lon: -121.6800, zoom: 8.6, pitch: 55, heading: 330 },
  },
};

/** The [lon, lat] a player stands at after `steps`, between the two spots around them. */
export function spotAt(c: Course, scene: Scene, steps: number): [number, number] {
  const v = c.from + (c.to - c.from) * Math.min(1, Math.max(0, c.goal ? steps / c.goal : 0));
  const s = scene.spots;
  for (let i = 1; i < s.length; i++) {
    if (v <= s[i].at) {
      const k = Math.max(0, (v - s[i - 1].at) / Math.max(1e-9, s[i].at - s[i - 1].at));
      return [s[i - 1].lon + (s[i].lon - s[i - 1].lon) * k, s[i - 1].lat + (s[i].lat - s[i - 1].lat) * k];
    }
  }
  const last = s[s.length - 1];
  return [last.lon, last.lat];
}

/** Steps a player needs to reach a spot. */
export function stepsTo(c: Course, spot: Spot) {
  return Math.round(((spot.at - c.from) / (c.to - c.from)) * c.goal);
}
