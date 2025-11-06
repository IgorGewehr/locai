import { NextRequest, NextResponse } from 'next/server'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth'
import type { Transaction } from '@/lib/types'
import {
  CreateTransactionSchema,
  UpdateTransactionSchema,
  TransactionFiltersSchema,
  validateCreateTransaction,
  validateUpdateTransaction,
  validateTransactionFilters,
} from '@/lib/validation/transaction-schemas'

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

    // Status filter (support both old and new statuses)
    if (status && ['pending', 'completed', 'paid', 'overdue', 'cancelled', 'refunded'].includes(status)) {
      filteredTransactions = filteredTransactions.filter(transaction => {
        // Auto-migrate 'completed' to 'paid' for comparison
        const transactionStatus = transaction.status === 'completed' ? 'paid' : transaction.status
        const filterStatus = status === 'completed' ? 'paid' : status
        return transactionStatus === filterStatus
      })
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

    // Calculate totals (support both 'completed' and 'paid' status)
    const totals = {
      income: filteredTransactions
        .filter(t => t.type === 'income' && (t.status === 'completed' || t.status === 'paid'))
        .reduce((sum, t) => sum + t.amount, 0),
      expense: filteredTransactions
        .filter(t => t.type === 'expense' && (t.status === 'completed' || t.status === 'paid'))
        .reduce((sum, t) => sum + t.amount, 0),
      pending: filteredTransactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0),
      overdue: filteredTransactions
        .filter(t => t.status === 'overdue')
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

    // Add tenantId to body for validation
    const bodyWithTenant = { ...body, tenantId: authContext.tenantId }

    // Validate the request body using new unified schema
    const validationResult = validateCreateTransaction(bodyWithTenant)
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

      // Set dates with smart defaults
      date: validatedData.date || validatedData.dueDate || new Date(),
      dueDate: validatedData.dueDate,
      paymentDate: validatedData.paymentDate,
      createdAt: new Date(),
      updatedAt: new Date(),

      // Tenant ID (already validated)
      tenantId: authContext.tenantId,

      // Set createdBy for audit trail
      createdBy: authContext.userId || 'system',
    }

    const services = new TenantServiceFactory(authContext.tenantId)
    const newTransaction = await services.transactions.create(sanitizedData)

    // Trigger notification for paid/completed income transactions (payments received) - NON-BLOCKING
    if (validatedData.type === 'income' && (validatedData.status === 'completed' || validatedData.status === 'paid')) {
      import('@/lib/services/notification-service').then(async ({ NotificationServiceFactory }) => {
        const notificationService = NotificationServiceFactory.getInstance(authContext.tenantId)

        // Get related entities for richer notification (PARALLEL)
        const [property, client] = await Promise.all([
          validatedData.propertyId
            ? services.properties.getById(validatedData.propertyId).catch(() => null)
            : Promise.resolve(null),
          validatedData.clientId
            ? services.clients.getById(validatedData.clientId).catch(() => null)
            : Promise.resolve(null)
        ])

        const propertyName = (property as any)?.name || ''
        const clientName = client?.name || ''

        return notificationService.createNotification({
          targetUserId: authContext.userId || 'system',
          targetUserName: authContext.email,
          type: 'payment_received' as any,
          title: '💰 Pagamento Recebido',
          message: `Pagamento de R$ ${validatedData.amount.toFixed(2)} recebido${clientName ? ` de ${clientName}` : ''}${propertyName ? ` (${propertyName})` : ''}. Método: ${validatedData.paymentMethod}.`,
          entityType: 'payment',
          entityId: newTransaction,
          entityData: {
            amount: validatedData.amount,
            paymentMethod: validatedData.paymentMethod,
            category: validatedData.category,
            description: validatedData.description,
            propertyName,
            clientName
          },
          priority: validatedData.amount >= 1000 ? 'high' as any : 'medium' as any,
          channels: ['dashboard', 'email'] as any[],
          recipientEmail: authContext.email,
          actionUrl: `/dashboard/transactions`,
          actionLabel: 'Ver Transações',
          metadata: {
            source: 'transaction_api',
            triggerEvent: 'payment_received',
            transactionId: newTransaction
          }
        })
      }).catch(notificationError => {
        // Log but don't fail the transaction creation
        console.error('Failed to send payment notification:', notificationError)
      })
    }

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
