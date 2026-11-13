// The challenges you can pick. A climb turns steps into altitude, a route into distance; the
// first to the top (or the end of the road) wins, and if nobody gets there, the furthest does.
// "classic" is the plain most-steps race.
import type { Lang } from './i18n';

export type CourseId = 'classic' | 'vesuvius' | 'half_dome' | 'matterhorn' | 'big_sur';
export type Course = {
  id: CourseId;
  kind: 'climb' | 'route' | 'classic';
  /** Steps it takes one player to finish. */
  goal: number;
  /** Climbs: altitude in metres at the start and the top. Routes: 0 and the length in km. */
  from: number;
  to: number;
  /** Drawn world not ready yet: shown, but can't be started. */
  soon?: boolean;
};

export const COURSES: Course[] = [
  { id: 'vesuvius', kind: 'climb', goal: 60_000, from: 0, to: 1281 },
  { id: 'half_dome', kind: 'climb', goal: 100_000, from: 1220, to: 2694, soon: true },
  { id: 'matterhorn', kind: 'climb', goal: 150_000, from: 1620, to: 4478 },
  // Highway 1, Carmel to San Simeon: about 90 miles, at roughly 2,000 steps a mile.
  { id: 'big_sur', kind: 'route', goal: 180_000, from: 0, to: 145, soon: true },
  { id: 'classic', kind: 'classic', goal: 0, from: 0, to: 0 },
];

export function course(id: string | null | undefined): Course {
  return COURSES.find((c) => c.id === id) ?? COURSES[COURSES.length - 1];
}

/** How far along a player is, 0 to 1. */
export function progress(c: Course, steps: number) {
  return c.goal ? Math.min(1, steps / c.goal) : 0;
}

/** Where a player is, in the units people expect: feet and miles in English, metres and km elsewhere. */
export function position(c: Course, steps: number, lang: Lang, locale?: string) {
  const v = c.from + (c.to - c.from) * progress(c, steps);
  return measure(c, v, lang, locale);
}

export function measure(c: Course, v: number, lang: Lang, locale?: string) {
  const imperial = lang === 'en';
  if (c.kind === 'climb') {
    const n = imperial ? v * 3.28084 : v;
    return `${Math.round(n).toLocaleString(locale)} ${imperial ? 'ft' : 'm'}`;
  }
  const n = imperial ? v * 0.621371 : v;
  return `${n.toFixed(n < 10 ? 1 : 0)} ${imperial ? 'mi' : 'km'}`;
}

/** The top of a climb or the length of a route, e.g. "4,478 m". */
export function size(c: Course, lang: Lang, locale?: string) {
  return measure(c, c.to, lang, locale);
}
