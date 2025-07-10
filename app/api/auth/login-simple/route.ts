import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// Mock users for testing
const MOCK_USERS = [
  {
    id: '1',
    email: 'admin@locai.com',
    name: 'Administrador',
    role: 'admin' as const,
    tenantId: 'tenant-1',
    // Password: admin123 (hashed)
    passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqyPuHpscquNYjnbUMbJKiO',
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date(),
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Basic validation
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email e senha são obrigatórios'
      }, { status: 400 });
    }

    // Find user
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Credenciais inválidas'
      }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        error: 'Credenciais inválidas'
      }, { status: 401 });
    }

    // Simple token (in production would use proper JWT)
    const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString('base64');

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        },
        token,
      }
    });

    // Set auth cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}