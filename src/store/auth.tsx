import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'user' | 'admin';

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  banned?: boolean;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  register: (input: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  listUsers: () => Promise<User[]>;
  setUserBanned: (id: string, banned: boolean) => Promise<User[]>;
};

const AuthContext = createContext<AuthState | null>(null);

async function loadProfile(id: string, email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, phone, role, banned')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    email,
    phone: data.phone ?? '',
    role: (data.role ?? 'user') as UserRole,
    banned: !!data.banned,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await loadProfile(session.user.id, session.user.email ?? '');
        if (mounted) setUser(profile);
      }
      if (mounted) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const profile = await loadProfile(session.user.id, session.user.email ?? '');
        setUser(profile);
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      async register({ name, email, phone, password }) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim(), phone: phone.trim() } },
        });
        if (error) throw new Error(error.message);
        // If email confirmation is OFF the session is established immediately;
        // if it's ON the user must confirm via email first.
        if (data.session?.user) {
          const profile = await loadProfile(data.session.user.id, data.session.user.email ?? '');
          setUser(profile);
        }
      },
      async login({ email, password }) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw new Error(error.message);
        const profile = await loadProfile(data.user.id, data.user.email ?? '');
        if (!profile) throw new Error('Account profile not found.');
        if (profile.banned) {
          await supabase.auth.signOut();
          throw new Error('This account has been banned.');
        }
        setUser(profile);
      },
      async logout() {
        await supabase.auth.signOut();
        setUser(null);
      },
      async listUsers() {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, phone, role, banned')
          .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return (data ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          email: '',
          phone: d.phone ?? '',
          role: (d.role ?? 'user') as UserRole,
          banned: !!d.banned,
        }));
      },
      async setUserBanned(id, banned) {
        const { error } = await supabase
          .from('profiles')
          .update({ banned })
          .eq('id', id);
        if (error) throw new Error(error.message);
        if (user?.id === id && banned) {
          await supabase.auth.signOut();
          setUser(null);
        }
        const { data } = await supabase
          .from('profiles')
          .select('id, name, phone, role, banned')
          .order('created_at', { ascending: false });
        return (data ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          email: '',
          phone: d.phone ?? '',
          role: (d.role ?? 'user') as UserRole,
          banned: !!d.banned,
        }));
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
