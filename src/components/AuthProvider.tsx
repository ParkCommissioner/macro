'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { auth, api } from '@/lib/api-client';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_PATHS = ['/login', '/signup'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      if (auth.isAuthenticated()) {
        const userData = auth.getUserFromToken();
        setUser(userData);
      } else {
        setUser(null);
        if (!PUBLIC_PATHS.includes(pathname)) {
          router.push('/login');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.auth.login(email, password);
    auth.setToken(response.token);
    setUser({ id: response.user.id, email: response.user.email });
    router.push('/');
  }, [router]);

  const signup = useCallback(async (email: string, password: string) => {
    const response = await api.auth.signup(email, password);
    auth.setToken(response.token);
    setUser({ id: response.user.id, email: response.user.email });
    router.push('/');
  }, [router]);

  const logout = useCallback(() => {
    auth.clearToken();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
