/**
 * DEPRECATED: Use @/contexts/AuthProvider instead
 * This file exists for backward compatibility only
 */

'use client';

import { useAuth as useNewAuth, AuthProvider as NewAuthProvider } from '@/contexts/AuthProvider';

// Re-export the new auth hook and provider for backward compatibility
export const useAuth = () => {
  const { user, loading, logout } = useNewAuth();
  
  // Map new auth interface to old interface for backward compatibility
  return {
    user: user ? {
      uid: user.uid,
      email: user.email,
      displayName: user.name || user.fullName,
      tenantId: user.tenantId,
      role: user.role
    } : null,
    loading,
    signOut: logout, // Map logout to signOut for compatibility
    signIn: async () => { throw new Error('Use new AuthProvider for signIn'); },
    signUp: async () => { throw new Error('Use new AuthProvider for signUp'); },
    resetPassword: async () => { throw new Error('Use new AuthProvider for resetPassword'); }
  };
};

// Re-export AuthProvider for backward compatibility
export const AuthProvider = NewAuthProvider;