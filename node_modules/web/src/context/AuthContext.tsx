import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SupabaseAPI, HabitService, type AuthUser } from '@habit-tracker/shared';
import { config } from '../config';
import { WebStorageAdapter } from '../utils/storage';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  api: SupabaseAPI;
  habitService: HabitService;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize API and services
  const api = new SupabaseAPI(config.supabase.url, config.supabase.anonKey);
  const storageAdapter = new WebStorageAdapter();
  const habitService = new HabitService(api, storageAdapter);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const currentUser = await api.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const checkAuthChanges = setInterval(async () => {
      const currentUser = await api.getCurrentUser();
      if (currentUser?.id !== user?.id) {
        setUser(currentUser);
      }
    }, 1000);

    return () => clearInterval(checkAuthChanges);
  }, [api, user?.id]);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.signIn({ email, password });
      if (response.success && response.data) {
        setUser(response.data);
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Sign in failed' };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signUp = async (email: string, password: string, username?: string) => {
    try {
      const response = await api.signUp({ email, password, username });
      if (response.success) {
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Sign up failed' };
      }
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    try {
      await api.signOut();
      setUser(null);
      // Clear cached data
      await storageAdapter.clear();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const response = await api.signInWithGoogle();
      if (response.success && response.data) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Google sign in error:', error);
    }
  };

  const signInWithGitHub = async () => {
    try {
      const response = await api.signInWithGitHub();
      if (response.success && response.data) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('GitHub sign in error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithGitHub,
    api,
    habitService,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}