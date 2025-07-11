// lib/utils/api-errors.ts
import { NextResponse } from 'next/server'
import { FirebaseError } from 'firebase/app'
import { ValidationError } from './errors'

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Validation errors
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { 
        error: error.message,
        field: error.field,
        code: 'VALIDATION_ERROR'
      },
      { status: 400 }
    )
  }

  // Firebase errors
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        return NextResponse.json(
          { error: 'Acesso negado', code: 'PERMISSION_DENIED' },
          { status: 403 }
        )
      case 'not-found':
        return NextResponse.json(
          { error: 'Recurso não encontrado', code: 'NOT_FOUND' },
          { status: 404 }
        )
      case 'already-exists':
        return NextResponse.json(
          { error: 'Recurso já existe', code: 'ALREADY_EXISTS' },
          { status: 409 }
        )
      case 'resource-exhausted':
        return NextResponse.json(
          { error: 'Limite de requisições excedido', code: 'RATE_LIMIT_EXCEEDED' },
          { status: 429 }
        )
      default:
        return NextResponse.json(
          { 
            error: 'Erro ao processar requisição', 
            code: 'FIREBASE_ERROR',
            details: error.message 
          },
          { status: 500 }
        )
    }
  }

  // Generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      { 
        error: error.message || 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }

  // Unknown errors
  return NextResponse.json(
    { 
      error: 'Erro desconhecido',
      code: 'UNKNOWN_ERROR'
    },
    { status: 500 }
  )
}