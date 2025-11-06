// app/api/admin/tickets-optimized/route.ts
// OPTIMIZED Admin Tickets API - Replaces inefficient all-tickets endpoint

import { NextRequest, NextResponse } from 'next/server'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  collectionGroup,
  getCountFromServer,
  documentId
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/tickets-optimized
 *
 * Optimized endpoint for admin ticket management with:
 * - Server-side filtering
 * - Cursor-based pagination
 * - Efficient indexing
 * - Limited data loading
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 50, max: 100)
 * - status: Filter by status (open, in_progress, resolved, closed)
 * - priority: Filter by priority (low, medium, high, urgent)
 * - search: Search in subject and user name
 * - sortBy: Sort field (updatedAt, createdAt, priority)
 * - sortOrder: Sort direction (asc, desc)
 * - tenantId: Filter by specific tenant (admin only)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `tickets_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

  try {
    const { searchParams } = new URL(request.url)

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limitParam = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const cursor = searchParams.get('cursor') // For cursor-based pagination

    // Filter parameters
    const status = searchParams.get('status') // 'open', 'in_progress', 'resolved', 'closed'
    const priority = searchParams.get('priority') // 'low', 'medium', 'high', 'urgent'
    const tenantIdFilter = searchParams.get('tenantId')
    const search = searchParams.get('search')

    // Sort parameters
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    logger.info('[Admin Tickets Optimized] Request received', {
      requestId,
      page,
      limit: limitParam,
      status,
      priority,
      search: search?.substring(0, 20) + '...',
      sortBy,
      sortOrder
    })

    // Build query constraints
    const constraints: any[] = []

    // Use collectionGroup for multi-tenant queries
    const ticketsRef = collectionGroup(db, 'tickets')

    // Filter by tenant if specified
    if (tenantIdFilter) {
      constraints.push(where('tenantId', '==', tenantIdFilter))
    } else {
      // Ensure we only get tickets with tenantId (new structure)
      constraints.push(where('tenantId', '!=', null))
    }

    // Filter by status
    if (status && status !== 'all') {
      constraints.push(where('status', '==', status))
    }

    // Filter by priority
    if (priority && priority !== 'all') {
      constraints.push(where('priority', '==', priority))
    }

    // Sorting
    const sortField = ['updatedAt', 'createdAt', 'priority'].includes(sortBy) ? sortBy : 'updatedAt'
    constraints.push(orderBy(sortField, sortOrder))

    // Pagination
    constraints.push(limit(limitParam + 1)) // Get one extra to check if there's more

    // Build query
    const q = query(ticketsRef, ...constraints)

    // Execute query
    const snapshot = await getDocs(q)

    // Check if there are more results
    const hasMore = snapshot.docs.length > limitParam
    const tickets = snapshot.docs.slice(0, limitParam).map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Format timestamps for JSON
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null
    }))

    // Client-side search filter (temporary until we implement Algolia/Typesense)
    let filteredTickets = tickets
    if (search && search.trim()) {
      const searchLower = search.toLowerCase()
      filteredTickets = tickets.filter((ticket: any) =>
        ticket.subject?.toLowerCase().includes(searchLower) ||
        ticket.userName?.toLowerCase().includes(searchLower) ||
        ticket.userEmail?.toLowerCase().includes(searchLower)
      )
    }

    // Get total count (expensive operation - cache this!)
    const countQuery = query(
      ticketsRef,
      where('tenantId', '!=', null)
    )
    const countSnapshot = await getCountFromServer(countQuery)
    const totalCount = countSnapshot.data().count

    const processingTime = Date.now() - startTime

    logger.info('[Admin Tickets Optimized] Request completed', {
      requestId,
      ticketsReturned: filteredTickets.length,
      processingTime: `${processingTime}ms`,
      hasMore
    })

    return NextResponse.json({
      success: true,
      data: {
        tickets: filteredTickets,
        pagination: {
          page,
          limit: limitParam,
          total: totalCount,
          hasMore,
          nextCursor: hasMore ? snapshot.docs[limitParam - 1]?.id : null
        }
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error('[Admin Tickets Optimized] Request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tickets',
        code: 'FETCH_ERROR',
        requestId,
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/tickets-optimized/stats
 *
 * Get summary statistics without loading all tickets
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `ticket_stats_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

  try {
    const body = await request.json()
    const { tenantId } = body

    logger.info('[Admin Ticket Stats] Request received', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***'
    })

    const ticketsRef = collectionGroup(db, 'tickets')
    const baseQuery = tenantId
      ? query(ticketsRef, where('tenantId', '==', tenantId))
      : query(ticketsRef, where('tenantId', '!=', null))

    // Parallel stat queries
    const [
      totalCount,
      openCount,
      inProgressCount,
      resolvedCount,
      closedCount
    ] = await Promise.all([
      getCountFromServer(baseQuery),
      getCountFromServer(query(ticketsRef, where('tenantId', '!=', null), where('status', '==', 'open'))),
      getCountFromServer(query(ticketsRef, where('tenantId', '!=', null), where('status', '==', 'in_progress'))),
      getCountFromServer(query(ticketsRef, where('tenantId', '!=', null), where('status', '==', 'resolved'))),
      getCountFromServer(query(ticketsRef, where('tenantId', '!=', null), where('status', '==', 'closed')))
    ])

    const stats = {
      total: totalCount.data().count,
      open: openCount.data().count,
      inProgress: inProgressCount.data().count,
      resolved: resolvedCount.data().count,
      closed: closedCount.data().count
    }

    const processingTime = Date.now() - startTime

    logger.info('[Admin Ticket Stats] Request completed', {
      requestId,
      stats,
      processingTime: `${processingTime}ms`
    })

    return NextResponse.json({
      success: true,
      data: stats,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error('[Admin Ticket Stats] Request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch ticket stats',
        code: 'STATS_ERROR',
        requestId
      },
      { status: 500 }
    )
  }
}
