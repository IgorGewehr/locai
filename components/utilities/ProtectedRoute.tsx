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
      // Verificar se já está redirecionando para evitar loop
      const isAlreadyRedirecting = sessionStorage.getItem('redirecting');
      if (isAlreadyRedirecting) return;
      
      // Salvar path atual para redirecionar depois do login
      if (pathname && pathname !== '/login') {
        localStorage.setItem('redirectPath', pathname);
      }
      
      // Marcar que está redirecionando
      sessionStorage.setItem('redirecting', 'true');
      router.replace('/login');
    }
  }, [user, loading, router, pathname]);

  // Loading state com transição suave
  if (loading) {
    return <LoadingScreen variant="creative" />;
  }

  // Se não há usuário, mostrar loading enquanto redireciona
  if (!user) {
    return <LoadingScreen variant="creative" />;
  }

  return <>{children}</>;
}