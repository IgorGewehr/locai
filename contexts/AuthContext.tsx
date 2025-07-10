'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AuthService, { AuthUser } from '@/lib/firebase/auth';
import { CircularProgress, Box } from '@mui/material';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((authUser) => {
      setUser(authUser);
      
      // Set cookie when user is authenticated (handles page refresh)
      if (authUser) {
        const token = Buffer.from(`${authUser.uid}:${authUser.email}:${Date.now()}`).toString('base64');
        document.cookie = `auth-token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
        localStorage.setItem('auth_token', token);
      } else {
        // Clear cookie when user is not authenticated
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        localStorage.removeItem('auth_token');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const authUser = await AuthService.signIn(email, password);
      setUser(authUser);
      
      // Get Firebase ID token
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        // Create a simple token for the cookie (in production, use proper JWT)
        const token = Buffer.from(`${currentUser.uid}:${currentUser.email}:${Date.now()}`).toString('base64');
        
        // Set the auth cookie directly
        document.cookie = `auth-token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
        
        // Also store in localStorage for API calls
        localStorage.setItem('auth_token', token);
      }
      
      // Check for redirect path
      const redirectPath = localStorage.getItem('redirectPath');
      if (redirectPath) {
        localStorage.removeItem('redirectPath');
        router.push(redirectPath);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      throw error;
    }
  }, [router]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      const authUser = await AuthService.signUp(email, password, displayName);
      setUser(authUser);
      
      // Get Firebase ID token
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        // Create a simple token for the cookie (in production, use proper JWT)
        const token = Buffer.from(`${currentUser.uid}:${currentUser.email}:${Date.now()}`).toString('base64');
        
        // Set the auth cookie directly
        document.cookie = `auth-token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
        
        // Also store in localStorage for API calls
        localStorage.setItem('auth_token', token);
      }
      
      router.push('/dashboard');
    } catch (error) {
      throw error;
    }
  }, [router]);

  const signOut = useCallback(async () => {
    try {
      await AuthService.signOut();
      
      // Clear the auth cookie
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      localStorage.removeItem('auth_token');
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [router]);

  const resetPassword = useCallback(async (email: string) => {
    await AuthService.resetPassword(email);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }), [user, loading, signIn, signUp, signOut, resetPassword]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}