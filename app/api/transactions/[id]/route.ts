import { NextRequest, NextResponse } from 'next/server'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth'
import { logger } from '@/lib/utils/logger'
import {
  UpdateTransactionSchema,
  validateUpdateTransaction,
} from '@/lib/validation/transaction-schemas'

// GET /api/transactions/[id] - Get a specific transaction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params

    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const services = new TenantServiceFactory(authContext.tenantId)
    const transaction = await services.transactions.getById(id)

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Optionally load related data
    const includeRelations = request.nextUrl.searchParams.get('include')
    const relatedData: any = {}

    if (includeRelations) {
      const includes = includeRelations.split(',')

      if (includes.includes('client') && transaction.clientId) {
        try {
          relatedData.client = await services.clients.getById(transaction.clientId)
        } catch (error) {
          logger.error('Error loading client', { error: error instanceof Error ? error.message : String(error) })
        }
      }

      if (includes.includes('property') && transaction.propertyId) {
        try {
          relatedData.property = await services.properties.getById(transaction.propertyId)
        } catch (error) {
          logger.error('Error loading property', { error: error instanceof Error ? error.message : String(error) })
        }
      }

      if (includes.includes('reservation') && transaction.reservationId) {
        try {
          relatedData.reservation = await services.reservations.getById(transaction.reservationId)
        } catch (error) {
          logger.error('Error loading reservation', { error: error instanceof Error ? error.message : String(error) })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...transaction,
        ...relatedData
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/transactions/[id] - Update a transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params
    const body = await request.json()

    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const services = new TenantServiceFactory(authContext.tenantId)

    // Check if transaction exists
    const existingTransaction = await services.transactions.getById(id)
    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Validate the request body using new unified schema
    const validationResult = validateUpdateTransaction(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten()
        },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // Sanitize text fields
    const sanitizedData: any = {
      ...validatedData,
    }

    if (validatedData.description) {
      sanitizedData.description = sanitizeUserInput(validatedData.description)
    }

    if (validatedData.notes) {
      sanitizedData.notes = sanitizeUserInput(validatedData.notes)
    }

    // Always update the updatedAt timestamp and lastModifiedBy
    sanitizedData.updatedAt = new Date()
    sanitizedData.lastModifiedBy = authContext.userId || 'system'

    // Update the transaction
    await services.transactions.update(id, sanitizedData)

    // 🛡️ FIX: update() returns void, fetch updated document
    const updatedTransaction = await services.transactions.get(id)

    if (!updatedTransaction) {
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve updated transaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedTransaction,
      message: 'Transação atualizada com sucesso'
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/transactions/[id] - Delete a transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params

    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const services = new TenantServiceFactory(authContext.tenantId)

    // Check if transaction exists
    const existingTransaction = await services.transactions.getById(id)
    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Soft delete: just mark as cancelled instead of deleting
    const softDelete = request.nextUrl.searchParams.get('soft') === 'true'

    if (softDelete) {
      await services.transactions.update(id, {
        status: 'cancelled',
        updatedAt: new Date()
      })

      return NextResponse.json({
        success: true,
        message: 'Transação cancelada com sucesso'
      })
    } else {
      // Hard delete
      await services.transactions.delete(id)

      return NextResponse.json({
        success: true,
        message: 'Transação excluída com sucesso'
      })
    }

  } catch (error) {
    return handleApiError(error)
  }
}
