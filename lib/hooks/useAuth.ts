import { useAuth as useAuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const { user, loading } = useAuthContext();

  return {
    user: user ? {
      id: user.uid || 'default-user',
      email: user.email || '',
      name: user.displayName || '',
      tenantId: user.tenantId || 'default-tenant',
      role: user.role || 'user'
    } : null,
    loading,
    authenticated: !!user
  };
}