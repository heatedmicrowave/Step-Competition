// Who's where in a competition: everyone's total over its days, best first.
import { Competition, isoDay, supabase } from './supabase';

export type Player = { id: string; name: string; device_label: string | null; source: string };
export type Standing = Player & { total: number; today: number; last: string | null; byDay: Record<string, number> };

export async function loadStandings(comp: Competition): Promise<Standing[]> {
  const { data: members, error: e1 } = await supabase.from('competition_players').select('player_id').eq('competition_id', comp.id);
  if (e1) throw e1;
  const ids = members.map((r) => r.player_id as string);
  const [pRes, sRes] = await Promise.all([
    supabase.from('public_players').select('id, name, device_label, source').in('id', ids),
    supabase.from('daily_steps').select('player_id, day, steps, updated_at').in('player_id', ids).gte('day', comp.start_day).lte('day', comp.end_day),
  ]);
  if (pRes.error) throw pRes.error;
  if (sRes.error) throw sRes.error;
  const rows = sRes.data as { player_id: string; day: string; steps: number; updated_at: string }[];
  const today = isoDay(new Date());
  return (pRes.data as Player[]).map((p) => {
    const mine = rows.filter((r) => r.player_id === p.id);
    return {
      ...p,
      total: mine.reduce((a, r) => a + r.steps, 0),
      today: mine.find((r) => r.day === today)?.steps ?? 0,
      last: mine.reduce<string | null>((a, r) => (a && a > r.updated_at ? a : r.updated_at), null),
      byDay: Object.fromEntries(mine.map((r) => [r.day, r.steps])),
    };
  }).sort((a, b) => b.total - a.total);
}

export const COMP_FIELDS = 'id, name, start_day, end_day, join_code, course';

/** "4 days left", "Last day", "Starts Nov 20" or the end date, for a competition row. */
export function daysLeftOf(comp: Competition) {
  const now = isoDay(new Date());
  const left = Math.round((new Date(comp.end_day + 'T12:00:00').getTime() - new Date(now + 'T12:00:00').getTime()) / 86400000) + 1;
  return { now, left, upcoming: now < comp.start_day, over: now > comp.end_day };
}

/** The link friends tap to join: a small page on the website that opens Pass1 on its Join screen. */
export const inviteUrl = (code: string) => `https://heatedmicrowave.github.io/Step-Competition/site/join.html?c=${code}`;

/** The invite text plus its link, for the share sheet. */
export const inviteMessage = (msg: string, code: string) => `${msg}\n${inviteUrl(code)}`;
