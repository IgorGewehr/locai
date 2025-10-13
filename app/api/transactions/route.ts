import { NextRequest, NextResponse } from 'next/server'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth'
import { z } from 'zod'
import type { Transaction } from '@/lib/types'

// Zod schema for transaction validation
const CreateTransactionSchema = z.object({
  amount: z.number()
    .positive('Valor deve ser positivo')
    .min(0.01, 'Valor mínimo é R$ 0,01'),

  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Tipo deve ser "income" ou "expense"' })
  }),

  status: z.enum(['pending', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Status inválido' })
  }).default('pending'),

  description: z.string()
    .min(3, 'Descrição deve ter pelo menos 3 caracteres')
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),

  category: z.enum(['reservation', 'maintenance', 'cleaning', 'commission', 'refund', 'other'], {
    errorMap: () => ({ message: 'Categoria inválida' })
  }),

  subcategory: z.string()
    .max(100, 'Subcategoria deve ter no máximo 100 caracteres')
    .optional(),

  paymentMethod: z.enum(['stripe', 'pix', 'cash', 'bank_transfer', 'credit_card', 'debit_card'], {
    errorMap: () => ({ message: 'Método de pagamento inválido' })
  }),

  date: z.coerce.date().optional(),

  // Related entities
  reservationId: z.string().max(100).optional(),
  clientId: z.string().max(100).optional(),
  propertyId: z.string().max(100).optional(),

  // Recurring fields
  isRecurring: z.boolean().default(false),
  recurringType: z.enum(['monthly', 'weekly', 'yearly']).optional(),
  recurringEndDate: z.coerce.date().optional(),

  // Additional fields
  notes: z.string().max(2000, 'Observações devem ter no máximo 2000 caracteres').optional(),
  tags: z.array(z.string().max(30)).max(10, 'Máximo de 10 tags').default([]),

  // AI metadata
  createdByAI: z.boolean().default(false),
  aiConversationId: z.string().max(100).optional(),
})

const UpdateTransactionSchema = CreateTransactionSchema.partial()

// GET /api/transactions - List all transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const paymentMethod = searchParams.get('paymentMethod')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const reservationId = searchParams.get('reservationId')
    const clientId = searchParams.get('clientId')
    const propertyId = searchParams.get('propertyId')

    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const services = new TenantServiceFactory(authContext.tenantId)
    const transactions = await services.transactions.getAll()

    // Apply filters
    let filteredTransactions = transactions as Transaction[]

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredTransactions = filteredTransactions.filter(transaction =>
        transaction.description?.toLowerCase().includes(searchLower) ||
        transaction.notes?.toLowerCase().includes(searchLower) ||
        transaction.id?.toLowerCase().includes(searchLower)
      )
    }

    // Type filter
    if (type && (type === 'income' || type === 'expense')) {
      filteredTransactions = filteredTransactions.filter(transaction =>
        transaction.type === type
      )
    }

    // Status filter
    if (status && ['pending', 'completed', 'cancelled'].includes(status)) {
      filteredTransactions = filteredTransactions.filter(transaction =>
        transaction.status === status
      )
    }

    // Category filter
    if (category) {
      filteredTransactions = filteredTransactions.filter(transaction =>
        transaction.category === category
      )
    }

    // Payment method filter
    if (paymentMethod) {
      filteredTransactions = filteredTransactions.filter(transaction =>
        transaction.paymentMethod === paymentMethod
      )
    }

    // Date range filter
    if (startDate) {
      const start = new Date(startDate)
      filteredTransactions = filteredTransactions.filter(transaction => {
        const transactionDate = transaction.date instanceof Date ? transaction.date : new Date(transaction.date)
        return transactionDate >= start
      })
    }

    if (endDate) {
      const end = new Date(endDate)
      filteredTransactions = filteredTransactions.filter(transaction => {
        const transactionDate = transaction.date instanceof Date ? transaction.date : new Date(transaction.date)
        return transactionDate <= end
      })
    }

    // Related entity filters
    if (reservationId) {
      filteredTransactions = filteredTransactions.filter(transaction =>
        transaction.reservationId === reservationId
      )
    }

    if (clientId) {
      filteredTransactions = filteredTransactions.filter(transaction =>
        transaction.clientId === clientId
      )
    }

    if (propertyId) {
      filteredTransactions = filteredTransactions.filter(transaction =>
        transaction.propertyId === propertyId
      )
    }

    // Sort by date (newest first)
    filteredTransactions.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date)
      const dateB = b.date instanceof Date ? b.date : new Date(b.date)
      return dateB.getTime() - dateA.getTime()
    })

    // Calculate totals
    const totals = {
      income: filteredTransactions
        .filter(t => t.type === 'income' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0),
      expense: filteredTransactions
        .filter(t => t.type === 'expense' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0),
      pending: filteredTransactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0),
    }

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

    return NextResponse.json({
      success: true,
      data: paginatedTransactions,
      totals,
      pagination: {
        page,
        limit,
        total: filteredTransactions.length,
        totalPages: Math.ceil(filteredTransactions.length / limit)
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/transactions - Create a new transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Validate the request body
    const validationResult = CreateTransactionSchema.safeParse(body)
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
      description: sanitizeUserInput(validatedData.description),
      subcategory: validatedData.subcategory ? sanitizeUserInput(validatedData.subcategory) : undefined,
      notes: validatedData.notes ? sanitizeUserInput(validatedData.notes) : undefined,
      reservationId: validatedData.reservationId,
      clientId: validatedData.clientId,
      propertyId: validatedData.propertyId,

      // Set dates
      date: validatedData.date || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),

      // Tenant ID
      tenantId: authContext.tenantId,

      // AI metadata
      createdByAI: validatedData.createdByAI || false,
      aiConversationId: validatedData.aiConversationId,

      // Tags
      tags: validatedData.tags || [],
    }

    const services = new TenantServiceFactory(authContext.tenantId)
    const newTransaction = await services.transactions.create(sanitizedData)

    return NextResponse.json(
      {
        success: true,
        data: newTransaction,
        message: 'Transação criada com sucesso'
      },
      { status: 201 }
    )

  } catch (error) {
    return handleApiError(error)
  }
}
