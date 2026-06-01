import { useMemo } from 'react';
import { useAuth as useAuthContext } from '@/contexts/AuthProvider';

export function useAuth() {
  const authContext = useAuthContext();

  const ctxUser = authContext.user;
  const uid = ctxUser?.uid;
  const email = ctxUser?.email;
  const name = ctxUser?.name;
  const fullName = ctxUser?.fullName;
  const tenantId = ctxUser?.tenantId;
  const role = ctxUser?.role;

  // Memoize com base apenas em campos PRIMITIVOS para manter identidade
  // estável entre renders e não quebrar memoização em cascata.
  const user = useMemo(() => {
    if (!uid && !email && !name && !fullName && !tenantId && !role) {
      // Sem usuário no contexto
      return null;
    }

    const displayName = name || fullName || '';
    const userName = name || fullName || '';

    return {
      // Manter compatibilidade com Firebase User
      uid,
      email,
      displayName,
      // Propriedades customizadas
      id: uid || 'default-user',
      name: userName,
      tenantId: tenantId || uid,
      role: role || 'user'
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, email, name, fullName, tenantId, role]);

  if (!ctxUser) {
    return {
      user: null,
      loading: authContext.loading,
      authenticated: false,
      // Re-export all other functions
      ...authContext
    };
  }

  return {
    user,
    loading: authContext.loading,
    authenticated: !!ctxUser,
    // Re-export all other functions
    ...authContext
  };
}