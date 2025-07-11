import { FirestoreService } from '@/lib/firebase/firestore';
import { NextRequest } from 'next/server';

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  tenantId: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  ipAddress: string;
  userAgent?: string;
  requestBody?: any;
  responseBody?: any;
  error?: string;
  metadata?: Record<string, any>;
}

interface AuditContext {
  userId?: string;
  userEmail?: string;
  tenantId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

class AuditLogger {
  private auditService: FirestoreService<AuditLog>;
  private batchQueue: AuditLog[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_DELAY = 5000; // 5 seconds

  constructor() {
    this.auditService = new FirestoreService<AuditLog>('audit_logs');
  }

  // Extract IP address from request
  private getIpAddress(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    if (realIp) {
      return realIp;
    }

    return 'unknown';
  }

  // Create audit log entry
  async log(
    request: NextRequest,
    response: { status: number; body?: any },
    context: AuditContext,
    startTime: number
  ): Promise<void> {
    try {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const auditLog: Omit<AuditLog, 'id'> = {
        timestamp: new Date(),
        userId: context.userId,
        userEmail: context.userEmail,
        tenantId: context.tenantId,
        action: context.action,
        resource: context.resource,
        resourceId: context.resourceId,
        method: request.method,
        path: new URL(request.url).pathname,
        statusCode: response.status,
        duration,
        ipAddress: this.getIpAddress(request),
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: context.metadata,
      };

      // Add request body for write operations
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        try {
          const body = await request.clone().json();
          // Sanitize sensitive data
          auditLog.requestBody = this.sanitizeData(body);
        } catch {
          // Ignore body parsing errors
        }
      }

      // Add response body for errors
      if (response.status >= 400 && response.body) {
        auditLog.responseBody = this.sanitizeData(response.body);
        if (response.body.error) {
          auditLog.error = response.body.error.message || response.body.error;
        }
      }

      // Add to batch queue
      this.addToBatch(auditLog);

    } catch (error) {

      // Don't throw - audit logging should not break the application
    }
  }

  // Log specific actions
  async logAction(
    action: string,
    resource: string,
    context: Partial<AuditContext> & { tenantId: string }
  ): Promise<void> {
    try {
      const auditLog: Omit<AuditLog, 'id'> = {
        timestamp: new Date(),
        userId: context.userId,
        userEmail: context.userEmail,
        tenantId: context.tenantId,
        action,
        resource,
        resourceId: context.resourceId,
        method: 'SYSTEM',
        path: 'internal',
        statusCode: 200,
        duration: 0,
        ipAddress: 'system',
        metadata: context.metadata,
      };

      this.addToBatch(auditLog);
    } catch (error) {

    }
  }

  // Sanitize sensitive data
  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'apiKey',
      'secret',
      'creditCard',
      'ssn',
      'cpf',
      'Authorization',
    ];

    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      const sanitized: any = {};

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          sanitized[key] = sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    };

    return sanitize(data);
  }

  // Add log to batch queue
  private addToBatch(log: Omit<AuditLog, 'id'>): void {
    this.batchQueue.push({ ...log, id: '' } as AuditLog);

    // Process batch if size limit reached
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.processBatch();
    } else {
      // Schedule batch processing
      this.scheduleBatchProcessing();
    }
  }

  // Schedule batch processing
  private scheduleBatchProcessing(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  // Process batch of logs
  private async processBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      // Create all logs in parallel
      await Promise.all(
        batch.map(log => this.auditService.create(log))
      );
    } catch (error) {

      // Could implement retry logic here
    }
  }

  // Query audit logs
  async queryLogs(
    filters: {
      tenantId: string;
      userId?: string;
      action?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
      status?: 'success' | 'error';
    },
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: keyof AuditLog;
      orderDirection?: 'asc' | 'desc';
    }
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const constraints: any[] = [
      ['tenantId', '==', filters.tenantId]
    ];

    if (filters.userId) {
      constraints.push(['userId', '==', filters.userId]);
    }

    if (filters.action) {
      constraints.push(['action', '==', filters.action]);
    }

    if (filters.resource) {
      constraints.push(['resource', '==', filters.resource]);
    }

    if (filters.startDate) {
      constraints.push(['timestamp', '>=', filters.startDate]);
    }

    if (filters.endDate) {
      constraints.push(['timestamp', '<=', filters.endDate]);
    }

    if (filters.status === 'success') {
      constraints.push(['statusCode', '<', 400]);
    } else if (filters.status === 'error') {
      constraints.push(['statusCode', '>=', 400]);
    }

    const logs = await this.auditService.list(constraints, {
      limit: options?.limit || 100,
      orderBy: options?.orderBy || 'timestamp',
      orderDirection: options?.orderDirection || 'desc',
    });

    return {
      logs,
      total: logs.length, // Would need count query for real total
    };
  }

  // Generate audit report
  async generateReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      averageResponseTime: number;
      uniqueUsers: number;
      topActions: Array<{ action: string; count: number }>;
      topResources: Array<{ resource: string; count: number }>;
      errorRate: number;
    };
    userActivity: Array<{
      userId: string;
      userEmail?: string;
      requestCount: number;
      errorCount: number;
      lastActivity: Date;
    }>;
  }> {
    const { logs } = await this.queryLogs(
      { tenantId, startDate, endDate },
      { limit: 10000 }
    );

    // Calculate summary statistics
    const totalRequests = logs.length;
    const successfulRequests = logs.filter(l => l.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = logs.reduce((sum, l) => sum + l.duration, 0) / totalRequests || 0;

    // Count unique users
    const uniqueUsers = new Set(logs.map(l => l.userId).filter(Boolean)).size;

    // Top actions
    const actionCounts = new Map<string, number>();
    logs.forEach(log => {
      const count = actionCounts.get(log.action) || 0;
      actionCounts.set(log.action, count + 1);
    });
    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top resources
    const resourceCounts = new Map<string, number>();
    logs.forEach(log => {
      const count = resourceCounts.get(log.resource) || 0;
      resourceCounts.set(log.resource, count + 1);
    });
    const topResources = Array.from(resourceCounts.entries())
      .map(([resource, count]) => ({ resource, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // User activity
    const userActivity = new Map<string, {
      userEmail?: string;
      requestCount: number;
      errorCount: number;
      lastActivity: Date;
    }>();

    logs.forEach(log => {
      if (!log.userId) return;

      const existing = userActivity.get(log.userId) || {
        userEmail: log.userEmail,
        requestCount: 0,
        errorCount: 0,
        lastActivity: log.timestamp,
      };

      existing.requestCount++;
      if (log.statusCode >= 400) {
        existing.errorCount++;
      }
      if (log.timestamp > existing.lastActivity) {
        existing.lastActivity = log.timestamp;
      }

      userActivity.set(log.userId, existing);
    });

    const userActivityArray = Array.from(userActivity.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.requestCount - a.requestCount);

    return {
      summary: {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        uniqueUsers,
        topActions,
        topResources,
        errorRate: failedRequests / totalRequests,
      },
      userActivity: userActivityArray,
    };
  }

  // Cleanup old logs
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const oldLogs = await this.auditService.list([
      ['timestamp', '<', cutoffDate]
    ]);

    let deleted = 0;
    for (const log of oldLogs) {
      try {
        await this.auditService.delete(log.id);
        deleted++;
      } catch (error) {

      }
    }

    return deleted;
  }

  // Force process any pending logs
  async flush(): Promise<void> {
    await this.processBatch();
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

// Middleware helper
export function withAuditLogging(
  context: AuditContext
) {
  return async (
    request: NextRequest,
    handler: () => Promise<Response>
  ): Promise<Response> => {
    const startTime = Date.now();

    try {
      const response = await handler();

      // Log the request
      await auditLogger.log(
        request,
        { 
          status: response.status,
          body: response.status >= 400 ? await response.clone().json() : undefined
        },
        context,
        startTime
      );

      return response;
    } catch (error) {
      // Log error
      await auditLogger.log(
        request,
        { 
          status: 500,
          body: { error: error instanceof Error ? error.message : 'Unknown error' }
        },
        context,
        startTime
      );

      throw error;
    }
  };
}