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

  // ✅ LOG DEBUG: Ver dados do usuário sendo mapeados
  const displayName = authContext.user.name || authContext.user.fullName || '';
  const userName = authContext.user.name || authContext.user.fullName || '';

  console.log('[useAuth Hook] User data mapping:', {
    contextUserName: authContext.user.name,
    contextUserFullName: authContext.user.fullName,
    mappedDisplayName: displayName,
    mappedUserName: userName
  });

  return {
    user: {
      // Manter compatibilidade com Firebase User
      uid: authContext.user.uid,
      email: authContext.user.email,
      displayName,
      // Propriedades customizadas
      id: authContext.user.uid || 'default-user',
      name: userName,
      tenantId: authContext.user.tenantId || authContext.user.uid,
      role: authContext.user.role || 'user'
    },
    loading: authContext.loading,
    authenticated: !!authContext.user,
    // Re-export all other functions
    ...authContext
  };
}