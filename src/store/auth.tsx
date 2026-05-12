import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

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
const STORAGE_KEY = 'miri.auth.user';
const ACCOUNTS_KEY = 'miri.auth.accounts';

// Seed superadmin — created on first run if no admin exists.
// Change the password by logging in and updating via Profile screen (TBD).
const ADMIN_SEED = {
  id: 'u_admin',
  name: 'Super Admin',
  email: 'admin@miri.local',
  phone: '',
  role: 'admin' as UserRole,
  password: 'admin2026',
};

type StoredAccount = { user: User; password: string };

async function readAccounts(): Promise<StoredAccount[]> {
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
  let accounts: StoredAccount[] = raw ? (JSON.parse(raw) as StoredAccount[]) : [];
  // Back-fill 'role' for accounts written by older builds.
  let mutated = false;
  accounts = accounts.map((a) => {
    if (!a.user.role) {
      mutated = true;
      return { ...a, user: { ...a.user, role: 'user' } };
    }
    return a;
  });
  // Seed superadmin if none exists.
  if (!accounts.some((a) => a.user.role === 'admin')) {
    mutated = true;
    const { password, ...adminUser } = ADMIN_SEED;
    accounts.push({ user: adminUser, password });
  }
  if (mutated) await writeAccounts(accounts);
  return accounts;
}

async function writeAccounts(accounts: StoredAccount[]) {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Trigger account seeding (creates admin on first run).
      await readAccounts();
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
      setLoading(false);
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      async register({ name, email, phone, password }) {
        const accounts = await readAccounts();
        if (accounts.some((a) => a.user.email.toLowerCase() === email.toLowerCase())) {
          throw new Error('An account with this email already exists.');
        }
        const newUser: User = {
          id: `u_${Date.now()}`,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role: 'user',
        };
        accounts.push({ user: newUser, password });
        await writeAccounts(accounts);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
        setUser(newUser);
      },
      async login({ email, password }) {
        const accounts = await readAccounts();
        const match = accounts.find(
          (a) => a.user.email.toLowerCase() === email.toLowerCase() && a.password === password,
        );
        if (!match) throw new Error('Invalid email or password.');
        if (match.user.banned) throw new Error('This account has been banned.');
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(match.user));
        setUser(match.user);
      },
      async logout() {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setUser(null);
      },
      async listUsers() {
        const accounts = await readAccounts();
        return accounts.map((a) => a.user);
      },
      async setUserBanned(id, banned) {
        const accounts = await readAccounts();
        const next = accounts.map((a) =>
          a.user.id === id ? { ...a, user: { ...a.user, banned } } : a,
        );
        await writeAccounts(next);
        // If the currently logged-in account is the one being banned, sign out.
        if (user?.id === id && banned) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setUser(null);
        }
        return next.map((a) => a.user);
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
