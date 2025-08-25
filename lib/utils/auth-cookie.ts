/**
 * Arquivo de compatibilidade temporário
 * Redireciona chamadas antigas para o novo sistema Firebase Auth
 */

import { NextRequest } from 'next/server';
import { validateFirebaseAuth, getTenantId as getFirebaseTenantId } from '@/lib/middleware/firebase-auth';

export async function getUserFromCookie(request: NextRequest) {
  const authContext = await validateFirebaseAuth(request);
  
  if (!authContext.authenticated) {
    return null;
  }
  
  return {
    id: authContext.userId,
    email: authContext.email,
    tenantId: authContext.tenantId,
    role: authContext.role
  };
}

export async function getAuthFromCookie(request: NextRequest) {
  const authContext = await validateFirebaseAuth(request);
  
  if (!authContext.authenticated) {
    return null;
  }
  
  return {
    userId: authContext.userId,
    email: authContext.email,
    tenantId: authContext.tenantId,
    role: authContext.role
  };
}

export async function extractTenantId(request: NextRequest): Promise<string | null> {
  const authContext = await validateFirebaseAuth(request);
  return authContext.tenantId || null;
}

export async function getTenantId(request: NextRequest): Promise<string> {
  return await getFirebaseTenantId(request);
}