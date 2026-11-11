import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Me, supabase } from './supabase';

type AuthState = { session: Session | null; me: Me | null; loading: boolean; reloadMe: (name?: string) => Promise<void> };
const Ctx = createContext<AuthState>({ session: null, me: null, loading: true, reloadMe: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  const reloadMe = useCallback(async (name?: string) => {
    const { data, error } = await supabase.rpc('app_me', name ? { p_name: name } : {});
    if (!error) setMe((data as Me[])[0] ?? null);
  }, []);

  // Sign-in links from the email open the app as stepcompetition://sign-in#access_token=...
  const url = Linking.useURL();
  useEffect(() => {
    if (url) signInFromLink(url);
  }, [url]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecked(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!checked) return;
    if (!session) { setMe(null); setLoading(false); return; }
    setLoading(true);
    reloadMe().finally(() => setLoading(false));
  }, [checked, session?.user.id]);

  return <Ctx.Provider value={{ session, me, loading, reloadMe }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

/** Finishes sign-in from the email link (either token style Supabase may send). */
async function signInFromLink(url: string) {
  const query = url.split('?')[1]?.split('#')[0] ?? '';
  const hash = url.split('#')[1] ?? '';
  const params = new URLSearchParams(hash || query);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token });
    return;
  }
  const code = new URLSearchParams(query).get('code');
  if (code) await supabase.auth.exchangeCodeForSession(code);
}

/** Where the email link sends people back to. Must be listed in Supabase: Authentication > URL Configuration. */
export const signInRedirect = Linking.createURL('/sign-in');
