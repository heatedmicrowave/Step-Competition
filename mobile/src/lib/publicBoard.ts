// Public leaderboards: World and your country, opt-in, under a unique nickname.
// The server (supabase/005_public_boards.sql) does the ranking and the anti-cheat.
import { getLocales } from 'expo-localization';
import { supabase } from './supabase';

export type Period = 'today' | 'week' | 'month';
export type PublicMe = { public_board: boolean; nickname: string | null; country: string | null };
export type BoardRow = { rank: number; nickname: string; country: string | null; steps: number; is_me: boolean };

export const NICK_RE = /^[A-Za-z0-9_.]{3,20}$/;

/** The phone's region, e.g. "US" or "IT" (Settings > General > Language & Region). */
export function phoneCountry(): string | null {
  try {
    const r = getLocales()[0]?.regionCode;
    return r && /^[A-Za-z]{2}$/.test(r) ? r.toUpperCase() : null;
  } catch {
    return null;
  }
}

/** "Italy" / "Italia" / "イタリア" for "IT", or the code if the phone can't name it. */
export function countryName(code: string, locale?: string) {
  try {
    const DN = (Intl as any).DisplayNames;
    if (DN) return new DN(locale ? [locale] : undefined, { type: 'region' }).of(code) ?? code;
  } catch {}
  return code;
}

/** A suggestion from the player's name: "Heated microwave" -> "heatedmicrowave". */
export function suggestNick(name: string | undefined) {
  const s = (name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20);
  return s.length >= 3 && s !== 'newplayer' ? s : '';
}

export async function loadPublicMe(): Promise<PublicMe> {
  const { data, error } = await supabase.rpc('app_public_me');
  if (error) throw error;
  return (data as PublicMe[])[0] ?? { public_board: false, nickname: null, country: null };
}

export async function nicknameFree(nick: string) {
  const { data, error } = await supabase.rpc('app_nickname_free', { p_nickname: nick });
  if (error) throw error;
  return !!data;
}

export async function setPublic(on: boolean, nickname?: string, country?: string | null): Promise<PublicMe> {
  const { data, error } = await supabase.rpc('app_set_public', { p_on: on, p_nickname: nickname ?? null, p_country: country ?? null });
  if (error) throw error;
  return (data as PublicMe[])[0];
}

export async function loadBoard(period: Period, country: string | null): Promise<BoardRow[]> {
  const { data, error } = await supabase.rpc('app_public_board', { p_period: period, p_country: country, p_limit: 100 });
  if (error) throw error;
  return (data as any[]).map((r) => ({ ...r, rank: Number(r.rank), steps: Number(r.steps) }));
}
