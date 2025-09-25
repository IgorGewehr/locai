// Metrics Service - Simplified API for tracking conversation metrics
import { logger } from '@/lib/utils/logger';

interface MetricEvent {
  eventType: 'conversion_step' | 'qualification_milestone' | 'message_engagement' | 'conversation_session';
  leadId?: string;
  sessionId?: string;
  messageId?: string;
  eventData: {
    from?: string;
    to?: string;
    milestone?: string;
    duration?: number;
    messageCount?: number;
    responseTime?: number;
    outcome?: string;
    clientPhone?: string;
    sofiaAction?: string;
  };
  source?: 'sofia_agent' | 'whatsapp_webhook' | 'manual';
  userId?: string;
}

class MetricsService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  // Track a conversion step (lead moving through pipeline)
  async trackConversion(leadId: string, from: string, to: string, additionalData?: any) {
    return this.trackEvent({
      eventType: 'conversion_step',
      leadId,
      eventData: {
        from,
        to,
        ...additionalData
      },
      source: 'sofia_agent'
    });
  }

  // Track qualification milestone
  async trackQualification(leadId: string, milestone: string, timeToMilestone: number, messageCount: number) {
    return this.trackEvent({
      eventType: 'qualification_milestone',
      leadId,
      eventData: {
        milestone,
        timeToMilestone,
        messageCount
      },
      source: 'sofia_agent'
    });
  }

  // Track message engagement
  async trackMessageEngagement(
    sessionId: string,
    leadId: string,
    messageId: string,
    clientResponded: boolean,
    responseTime?: number
  ) {
    return this.trackEvent({
      eventType: 'message_engagement',
      sessionId,
      leadId,
      messageId,
      eventData: {
        responseTime,
        messageCount: 1,
        outcome: clientResponded ? 'responded' : 'no_response'
      },
      source: 'whatsapp_webhook'
    });
  }

  // Track conversation session
  async trackConversationSession(
    sessionId: string,
    leadId: string,
    duration: number,
    messageCount: number,
    outcome: string
  ) {
    return this.trackEvent({
      eventType: 'conversation_session',
      sessionId,
      leadId,
      eventData: {
        duration,
        messageCount,
        outcome
      },
      source: 'sofia_agent'
    });
  }

  // Generic event tracking
  private async trackEvent(event: MetricEvent): Promise<boolean> {
    try {
      const response = await fetch('/api/metrics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': this.tenantId,
        },
        body: JSON.stringify({
          ...event,
          source: event.source || 'manual'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        logger.info('📊 Metric tracked successfully', {
          tenantId: this.tenantId,
          eventType: event.eventType,
          metricId: result.metricId
        });
      }

      return result.success;

    } catch (error) {
      logger.error('❌ Failed to track metric', {
        tenantId: this.tenantId,
        eventType: event.eventType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

// Factory function to create metrics service
export function createMetricsService(tenantId: string): MetricsService {
  return new MetricsService(tenantId);
}

// Quick tracking functions for common scenarios
export const MetricsTracker = {
  // Sofia agent actions
  sofiaQualifiedLead: (tenantId: string, leadId: string, timeMinutes: number, messageCount: number) =>
    createMetricsService(tenantId).trackQualification(leadId, 'qualified', timeMinutes * 60, messageCount),

  sofiaScheduledVisit: (tenantId: string, leadId: string) =>
    createMetricsService(tenantId).trackConversion(leadId, 'qualified', 'visit_scheduled'),

  sofiaCreatedReservation: (tenantId: string, leadId: string, value?: number) =>
    createMetricsService(tenantId).trackConversion(leadId, 'negotiation', 'reservation_created', { value }),

  // WhatsApp interactions
  clientResponded: (tenantId: string, sessionId: string, leadId: string, messageId: string, responseTimeSeconds: number) =>
    createMetricsService(tenantId).trackMessageEngagement(sessionId, leadId, messageId, true, responseTimeSeconds),

  clientDidNotRespond: (tenantId: string, sessionId: string, leadId: string, messageId: string) =>
    createMetricsService(tenantId).trackMessageEngagement(sessionId, leadId, messageId, false),

  // Conversation sessions
  conversationEnded: (tenantId: string, sessionId: string, leadId: string, durationMinutes: number, messageCount: number, outcome: string) =>
    createMetricsService(tenantId).trackConversationSession(sessionId, leadId, durationMinutes * 60, messageCount, outcome),
};

export default MetricsService;