import { useAuth as useAuthContext } from '@/contexts/AuthProvider';

export function useAuth() {
  const { user, loading } = useAuthContext();

  return {
    user: user ? {
      id: user.uid || 'default-user',
      email: user.email || '',
      name: user.name || user.fullName || '',
      tenantId: user.tenantId || user.uid,
      role: user.role || 'user'
    } : null,
    loading,
    authenticated: !!user
  };
}