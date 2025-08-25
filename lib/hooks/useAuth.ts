import { useAuth as useAuthContext } from '@/contexts/AuthProvider';

export function useAuth() {
  const authContext = useAuthContext();

  if (!authContext.user) {
    return {
      user: null,
      loading: authContext.loading,
      authenticated: false,
      // Re-export all other functions
      ...authContext
    };
  }

  return {
    user: {
      // Manter compatibilidade com Firebase User
      uid: authContext.user.uid,
      email: authContext.user.email,
      displayName: authContext.user.name || authContext.user.fullName || '',
      // Propriedades customizadas
      id: authContext.user.uid || 'default-user',
      name: authContext.user.name || authContext.user.fullName || '',
      tenantId: authContext.user.tenantId || authContext.user.uid,
      role: authContext.user.role || 'user'
    },
    loading: authContext.loading,
    authenticated: !!authContext.user,
    // Re-export all other functions
    ...authContext
  };
}