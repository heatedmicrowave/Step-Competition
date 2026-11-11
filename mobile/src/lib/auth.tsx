import type { Session } from '@supabase/supabase-js';
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
