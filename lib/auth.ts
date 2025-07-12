// lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { FirebaseService } from './firebase/admin'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios')
        }

        try {
          // In production, implement proper authentication with Firebase Auth or database
          // This is a placeholder for production readiness

          // For now, check against environment variables for admin access
          const adminEmail = process.env.ADMIN_EMAIL || 'admin@locai.com.br'
          const adminPassword = process.env.ADMIN_PASSWORD_HASH || '$2a$10$K7L5G7X5Y5Z5Z5Z5Z5Z5Z.hash' // bcrypt hash

          if (credentials.email === adminEmail) {
            const isValidPassword = await bcrypt.compare(credentials.password, adminPassword)
            if (isValidPassword) {
              return {
                id: 'admin-user',
                email: credentials.email,
                name: 'Administrador',
                tenantId: process.env.TENANT_ID || 'default-tenant',
                role: 'admin'
              }
            }
          }

          throw new Error('Credenciais inválidas')
        } catch (error) {
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.tenantId = user.tenantId
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.tenantId = token.tenantId as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET
}

// Export auth function for server-side usage
export { getServerSession as auth } from 'next-auth'