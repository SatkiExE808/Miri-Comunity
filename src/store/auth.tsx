import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  register: (input: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const STORAGE_KEY = 'miri.auth.user';
const ACCOUNTS_KEY = 'miri.auth.accounts';

type StoredAccount = { user: User; password: string };

async function readAccounts(): Promise<StoredAccount[]> {
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
  return raw ? (JSON.parse(raw) as StoredAccount[]) : [];
}

async function writeAccounts(accounts: StoredAccount[]) {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
      setLoading(false);
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
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
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(match.user));
        setUser(match.user);
      },
      async logout() {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setUser(null);
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
