import { NextRequest, NextResponse } from 'next/server';
import { apiResponse } from '@/lib/utils/api-response';
import * as yup from 'yup';
import bcrypt from 'bcryptjs';

// Validation schema
const loginSchema = yup.object().shape({
  email: yup
    .string()
    .email('Email inválido')
    .required('Email é obrigatório'),
  password: yup
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .required('Senha é obrigatória'),
});

// Mock user database - In production, this would be a real database
const MOCK_USERS = [
  {
    id: '1',
    email: 'admin@locai.com',
    name: 'Administrador',
    role: 'admin' as const,
    tenantId: 'tenant-1',
    // Password: admin123 (hashed)
    passwordHash: '$2b$12$zDQxiEnS9MoA4mNndTGit.puohpwpoG6dYSdRCTk2WjESgsKnPa.O',
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date(),
  },
  {
    id: '2',
    email: 'user@locai.com',
    name: 'Usuário',
    role: 'user' as const,
    tenantId: 'tenant-1',
    // Password: user123 (hashed)
    passwordHash: '$2b$12$igrpbxh3QWwQlitYluFAUudL./Ky0Jvmh/NVBTZtLia77HCQnlKjm',
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date(),
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    try {
      await loginSchema.validate(body);
    } catch (validationError: any) {
      return apiResponse.error(
        validationError.message,
        400,
        'VALIDATION_ERROR'
      );
    }
    
    const { email, password } = body;

    // Find user by email
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return apiResponse.error(
        'Credenciais inválidas',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      return apiResponse.error(
        'Credenciais inválidas',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    // Simple token (in production would use proper JWT)
    const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString('base64');

    // Set HTTP-only cookie
    const response = apiResponse.success({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
      token,
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
    
    return apiResponse.error(
      'Erro interno do servidor',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
}