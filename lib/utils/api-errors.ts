// lib/utils/api-errors.ts
import { NextResponse } from 'next/server'
import { FirebaseError } from 'firebase/app'
import { ValidationError } from './errors'
import { APIError } from './custom-error'

// Re-export the consolidated APIError class for backward compatibility
export { APIError as ApiError } from './custom-error'

export function handleApiError(error: unknown): NextResponse {
  // APIError with custom properties
  if (error instanceof APIError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: error.error || 'API_ERROR',
        requestId: error.requestId,
        uid: error.uid,
        phone: error.phone ? error.phone.substring(0, 6) + '***' : undefined
      },
      { 
        status: error.statusCode || 500,
        headers: {
          ...(error.requestId && { 'X-Request-ID': error.requestId })
        }
      }
    )
  }

  // Validation errors
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { 
        error: error.message,
        field: error.context?.field,
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