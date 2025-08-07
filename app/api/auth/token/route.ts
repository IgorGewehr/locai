import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, name, role, tenantId } = body;

    if (!uid || !email || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Criar objeto de usuário para gerar token
    const user = {
      id: uid,
      email,
      name: name || email.split('@')[0],
      role: role || 'user',
      tenantId, // Usar o tenantId que é o próprio UID do usuário
      createdAt: new Date(),
      lastLogin: new Date()
    };

    // Gerar token JWT
    const token = await authService.generateToken(user);

    logger.info('✅ [TokenAPI] Token JWT gerado com sucesso', {
      userId: uid,
      tenantId,
      role: user.role
    });

    // Criar resposta com o token
    const response = NextResponse.json({ token, success: true });

    // Configurar cookie JWT
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
      path: '/',
    });

    return response;

  } catch (error) {
    logger.error('❌ [TokenAPI] Erro ao gerar token', error instanceof Error ? error : undefined);

    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}