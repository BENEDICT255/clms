import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { authService, AuthSession } from '@/infrastructure/auth/authAdapter';
import { UserProfile, CapabilityCode, hasCapability } from '@/domain/identity/types';

interface AuthContextValue {
  session: AuthSession | null;
  user: UserProfile | null;
  isLoading: boolean;
  can: (capability: CapabilityCode) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    // Restore existing session
    authService
      .getCurrentSession()
      .then((existingSession) => {
        if (isMounted) {
          setSession(existingSession);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Session restoration notice:', err);
        if (isMounted) {
          setSession(null);
          setIsLoading(false);
        }
      });

    // Subscribe to auth state updates
    const unsubscribe = authService.onAuthStateChange((newSession) => {
      if (isMounted) {
        setSession(newSession);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;

  const can = useMemo(() => {
    return (capability: CapabilityCode): boolean => {
      return hasCapability(user, capability);
    };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const newSession = await authService.signIn(email, password);
      setSession(newSession);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      session,
      user,
      isLoading,
      can,
      signIn,
      signOut,
    }),
    [session, user, isLoading, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
