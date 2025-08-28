'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';
import LoadingScreen from '@/components/atoms/LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      // ✅ NOVO: Evitar redirecionamentos múltiplos
      const isAlreadyRedirecting = sessionStorage.getItem('redirecting');
      if (isAlreadyRedirecting) return;
      
      // Store the current path to redirect back after login
      localStorage.setItem('redirectPath', pathname);
      console.log('🔄 [ProtectedRoute] Redirecting unauthenticated user to login');
      sessionStorage.setItem('redirecting', 'true');
      router.replace('/login'); // ✅ replace em vez de push
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return <LoadingScreen variant="creative" />;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}