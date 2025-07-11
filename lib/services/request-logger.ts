// lib/services/request-logger.ts
import { db } from '@/lib/firebase/admin'

interface RequestLog {
  id?: string
  tenantId?: string
  endpoint: string
  method: string
  statusCode: number
  duration: number
  phoneNumber?: string
  clientId?: string
  conversationId?: string
  functionCalls?: string[]
  error?: string
  errorCode?: string
  userAgent?: string
  ip?: string
  timestamp: Date
}

export class RequestLogger {
  private logs: RequestLog[] = []
  private batchTimeout: NodeJS.Timeout | null = null
  private readonly BATCH_SIZE = 50
  private readonly BATCH_INTERVAL = 5000 // 5 seconds

  async log(logEntry: RequestLog): Promise<void> {
    // Add to batch
    this.logs.push(logEntry)

    // Schedule batch write if not already scheduled
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flush(), this.BATCH_INTERVAL)
    }

    // Force flush if batch is full
    if (this.logs.length >= this.BATCH_SIZE) {
      await this.flush()
    }
  }

  private async flush(): Promise<void> {
    if (this.logs.length === 0) return

    // Clear timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }

    // Get logs to write
    const logsToWrite = [...this.logs]
    this.logs = []

    try {
      // Batch write to Firestore
      const batch = db.batch()
      const collection = db.collection('request_logs')

      for (const log of logsToWrite) {
        const docRef = collection.doc()
        batch.set(docRef, {
          ...log,
          timestamp: log.timestamp,
          createdAt: new Date()
        })
      }

      await batch.commit()
    } catch (error) {
      console.error('Failed to write request logs:', error)
      
      // Put failed logs back in queue (with limit to prevent memory issues)
      if (this.logs.length < this.BATCH_SIZE * 2) {
        this.logs.unshift(...logsToWrite)
      }
    }
  }

  // Ensure logs are flushed on process exit
  async shutdown(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }
    await this.flush()
  }
}

// Singleton instance
let requestLogger: RequestLogger | null = null

export function getRequestLogger(): RequestLogger {
  if (!requestLogger) {
    requestLogger = new RequestLogger()
    
    // Set up graceful shutdown
    process.on('beforeExit', async () => {
      await requestLogger?.shutdown()
    })
  }
  return requestLogger
}

// Helper to create a request logger middleware
export function createRequestLogContext(startTime: number) {
  return {
    startTime,
    log: async (data: Partial<RequestLog>) => {
      const logger = getRequestLogger()
      await logger.log({
        endpoint: data.endpoint || 'unknown',
        method: data.method || 'POST',
        statusCode: data.statusCode || 500,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        ...data
      })
    }
  }
}