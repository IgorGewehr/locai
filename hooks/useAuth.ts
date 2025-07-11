// hooks/useAuth.ts
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface User {
  id: string
  email: string
  name: string
  tenantId: string
  role?: string
}

interface UseAuthReturn {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  error?: string
}

export function useAuth(requireAuth: boolean = true): UseAuthReturn {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && status === 'unauthenticated') {
      router.push('/login')
    }
  }, [requireAuth, status, router])

  // Map session to user object
  const user: User | null = session?.user ? {
    id: session.user.id || '',
    email: session.user.email || '',
    name: session.user.name || '',
    tenantId: session.user.tenantId || 'default-tenant',
    role: session.user.role
  } : null

  return {
    user,
    loading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    error: status === 'unauthenticated' && requireAuth ? 'Não autorizado' : undefined
  }
}