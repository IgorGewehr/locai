import { NextRequest, NextResponse } from 'next/server'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth'
import { z } from 'zod'

// Zod schema for transaction update
const UpdateTransactionSchema = z.object({
  amount: z.number()
    .positive('Valor deve ser positivo')
    .min(0.01, 'Valor mínimo é R$ 0,01')
    .optional(),

  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Tipo deve ser "income" ou "expense"' })
  }).optional(),

  status: z.enum(['pending', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Status inválido' })
  }).optional(),

  description: z.string()
    .min(3, 'Descrição deve ter pelo menos 3 caracteres')
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),

  category: z.enum(['reservation', 'maintenance', 'cleaning', 'commission', 'refund', 'other'], {
    errorMap: () => ({ message: 'Categoria inválida' })
  }).optional(),

  subcategory: z.string()
    .max(100, 'Subcategoria deve ter no máximo 100 caracteres')
    .optional(),

  paymentMethod: z.enum(['stripe', 'pix', 'cash', 'bank_transfer', 'credit_card', 'debit_card'], {
    errorMap: () => ({ message: 'Método de pagamento inválido' })
  }).optional(),

  date: z.coerce.date().optional(),

  // Related entities
  reservationId: z.string().max(100).optional(),
  clientId: z.string().max(100).optional(),
  propertyId: z.string().max(100).optional(),

  // Recurring fields
  isRecurring: z.boolean().optional(),
  recurringType: z.enum(['monthly', 'weekly', 'yearly']).optional(),
  recurringEndDate: z.coerce.date().optional(),

  // Additional fields
  notes: z.string().max(2000, 'Observações devem ter no máximo 2000 caracteres').optional(),
  tags: z.array(z.string().max(30)).max(10, 'Máximo de 10 tags').optional(),

  // Confirmation fields
  confirmedBy: z.string().max(100).optional(),
  confirmedAt: z.coerce.date().optional(),
})

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
          console.error('Error loading client:', error)
        }
      }

      if (includes.includes('property') && transaction.propertyId) {
        try {
          relatedData.property = await services.properties.getById(transaction.propertyId)
        } catch (error) {
          console.error('Error loading property:', error)
        }
      }

      if (includes.includes('reservation') && transaction.reservationId) {
        try {
          relatedData.reservation = await services.reservations.getById(transaction.reservationId)
        } catch (error) {
          console.error('Error loading reservation:', error)
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

    // Validate the request body
    const validationResult = UpdateTransactionSchema.safeParse(body)
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

    if (validatedData.subcategory) {
      sanitizedData.subcategory = sanitizeUserInput(validatedData.subcategory)
    }

    if (validatedData.notes) {
      sanitizedData.notes = sanitizeUserInput(validatedData.notes)
    }

    // Always update the updatedAt timestamp
    sanitizedData.updatedAt = new Date()

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
