// CRM Automation Service - Automated Actions Based on Insights
// Connects insights to automatic CRM actions and workflow triggers

import { Timestamp, collection, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import { AIGeneratedInsight, RealTimeAlerts } from './advanced-ai-insights';
import { Lead, LeadStatus } from '@/lib/types/crm';

export interface AutomationRule {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  trigger: {
    type: 'insight' | 'alert' | 'conversation_pattern' | 'time_based';
    condition: string;
    threshold?: number;
  };
  actions: AutomationAction[];
  isActive: boolean;
  createdAt: Date;
  lastExecuted?: Date;
  executionCount: number;
}

export interface AutomationAction {
  type: 'update_lead_status' | 'create_task' | 'send_follow_up' | 'create_campaign' | 'notify_team' | 'adjust_pricing';
  parameters: { [key: string]: any };
  delay?: number; // minutes to wait before executing
}

export interface AutomationExecution {
  id: string;
  tenantId: string;
  ruleId: string;
  triggerId: string; // insight ID, alert ID, etc.
  executedAt: Date;
  actions: {
    action: AutomationAction;
    status: 'pending' | 'completed' | 'failed';
    result?: any;
    error?: string;
  }[];
  success: boolean;
}

export interface CRMInsightAction {
  insightId: string;
  actionType: 'lead_prioritization' | 'campaign_creation' | 'team_notification' | 'process_optimization';
  description: string;
  parameters: any;
  estimatedImpact: string;
}

class CRMAutomationService {
  // Create default automation rules for new tenants
  async createDefaultAutomationRules(tenantId: string): Promise<void> {
    const defaultRules: Omit<AutomationRule, 'id'>[] = [
      {
        tenantId,
        name: 'High Price Abandonment Alert',
        description: 'Alert team when price abandonment rate exceeds 60%',
        trigger: {
          type: 'insight',
          condition: 'price_abandonment_rate > 0.6',
          threshold: 0.6
        },
        actions: [
          {
            type: 'notify_team',
            parameters: {
              message: 'Urgent: Price abandonment rate is critically high. Review pricing strategy.',
              priority: 'high',
              channels: ['email', 'slack']
            }
          },
          {
            type: 'create_campaign',
            parameters: {
              type: 'pricing_adjustment',
              message: 'Special discount offer for interested clients',
              discount: 10
            },
            delay: 30
          }
        ],
        isActive: true,
        createdAt: new Date(),
        executionCount: 0
      },
      {
        tenantId,
        name: 'Low Conversion Rate Response',
        description: 'Automatically prioritize leads when conversion drops below 10%',
        trigger: {
          type: 'insight',
          condition: 'conversion_rate < 0.1',
          threshold: 0.1
        },
        actions: [
          {
            type: 'update_lead_status',
            parameters: {
              status: 'high_priority',
              reason: 'Low conversion rate detected - requires immediate attention'
            }
          },
          {
            type: 'create_task',
            parameters: {
              title: 'Review and optimize AI responses',
              description: 'Conversion rate has dropped below 10%. Review recent conversations and optimize.',
              priority: 'urgent',
              assignTo: 'team_lead'
            }
          }
        ],
        isActive: true,
        createdAt: new Date(),
        executionCount: 0
      },
      {
        tenantId,
        name: 'High Value Lead Detection',
        description: 'Automatically prioritize leads showing strong purchase intent',
        trigger: {
          type: 'conversation_pattern',
          condition: 'contains_urgency_keywords',
          threshold: 3
        },
        actions: [
          {
            type: 'update_lead_status',
            parameters: {
              status: 'hot_lead',
              priority: 'high',
              reason: 'Urgency keywords detected in conversation'
            }
          },
          {
            type: 'send_follow_up',
            parameters: {
              template: 'high_priority_follow_up',
              delay_minutes: 15
            }
          }
        ],
        isActive: true,
        createdAt: new Date(),
        executionCount: 0
      },
      {
        tenantId,
        name: 'Peak Hours Optimization',
        description: 'Adjust response priorities during peak conversation hours',
        trigger: {
          type: 'time_based',
          condition: 'peak_hours_detected',
        },
        actions: [
          {
            type: 'notify_team',
            parameters: {
              message: 'Peak conversation hours detected. Prioritize quick responses.',
              channels: ['app_notification']
            }
          }
        ],
        isActive: true,
        createdAt: new Date(),
        executionCount: 0
      }
    ];

    try {
      const rulesRef = collection(db, `tenants/${tenantId}/automation_rules`);
      
      for (const rule of defaultRules) {
        await addDoc(rulesRef, rule);
      }
      
      logger.info('✅ [CRMAutomation] Default rules created', { 
        tenantId, 
        rulesCount: defaultRules.length 
      });
    } catch (error) {
      logger.error('❌ [CRMAutomation] Error creating default rules', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Process insights and trigger automation rules
  async processInsightTriggers(tenantId: string, insights: AIGeneratedInsight[]): Promise<CRMInsightAction[]> {
    try {
      const actions: CRMInsightAction[] = [];

      for (const insight of insights) {
        // Price abandonment insight
        if (insight.id === 'price_abandonment' && insight.priority === 'critical') {
          actions.push({
            insightId: insight.id,
            actionType: 'campaign_creation',
            description: 'Create pricing optimization campaign',
            parameters: {
              type: 'pricing_justification',
              targetAudience: 'price_sensitive_leads',
              content: {
                template: 'value_proposition',
                features: ['payment_options', 'competitive_comparison', 'value_highlights']
              }
            },
            estimatedImpact: `Potential recovery of R$ ${insight.estimatedROI?.toLocaleString()}`
          });

          actions.push({
            insightId: insight.id,
            actionType: 'team_notification',
            description: 'Alert team about critical price abandonment',
            parameters: {
              priority: 'urgent',
              affectedConversations: insight.metrics.affectedConversations,
              suggestedActions: insight.actionableSteps
            },
            estimatedImpact: 'Immediate team response required'
          });
        }

        // Low conversion insight
        if (insight.id === 'low_conversion' && insight.priority === 'high') {
          actions.push({
            insightId: insight.id,
            actionType: 'lead_prioritization',
            description: 'Re-prioritize existing leads for manual follow-up',
            parameters: {
              criteria: 'recent_engagement_without_conversion',
              maxLeads: 20,
              priorityLevel: 'high'
            },
            estimatedImpact: `Potential R$ ${insight.estimatedROI?.toLocaleString()} revenue recovery`
          });

          actions.push({
            insightId: insight.id,
            actionType: 'process_optimization',
            description: 'Trigger AI prompt optimization process',
            parameters: {
              focus: 'conversion_optimization',
              testDuration: '7_days',
              metrics: ['response_rate', 'engagement_time', 'conversion_rate']
            },
            estimatedImpact: 'Expected 15-20% conversion improvement'
          });
        }

        // Peak hours insight
        if (insight.id === 'peak_hours') {
          actions.push({
            insightId: insight.id,
            actionType: 'process_optimization',
            description: 'Optimize team availability for peak hours',
            parameters: {
              peakHours: insight.evidence.patterns,
              adjustments: 'staff_scheduling',
              automationLevel: 'increased'
            },
            estimatedImpact: 'Improved response time and satisfaction'
          });
        }
      }

      // Execute the generated actions
      await this.executeAutomationActions(tenantId, actions);

      logger.info('✅ [CRMAutomation] Processed insight triggers', {
        tenantId,
        insightsProcessed: insights.length,
        actionsGenerated: actions.length
      });

      return actions;

    } catch (error) {
      logger.error('❌ [CRMAutomation] Error processing insights', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  // Execute automation actions
  private async executeAutomationActions(tenantId: string, actions: CRMInsightAction[]): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.actionType) {
          case 'lead_prioritization':
            await this.prioritizeLeads(tenantId, action.parameters);
            break;
            
          case 'campaign_creation':
            await this.createAutomaticCampaign(tenantId, action.parameters);
            break;
            
          case 'team_notification':
            await this.sendTeamNotification(tenantId, action.parameters);
            break;
            
          case 'process_optimization':
            await this.triggerProcessOptimization(tenantId, action.parameters);
            break;
        }

        logger.info('✅ [CRMAutomation] Action executed', {
          tenantId,
          actionType: action.actionType,
          insightId: action.insightId
        });

      } catch (error) {
        logger.error('❌ [CRMAutomation] Action execution failed', {
          tenantId,
          actionType: action.actionType,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  // Prioritize leads based on insights
  private async prioritizeLeads(tenantId: string, parameters: any): Promise<void> {
    try {
      const leadsRef = collection(db, `tenants/${tenantId}/leads`);
      const q = query(leadsRef, where('status', 'in', ['qualified', 'opportunity']));
      const snapshot = await getDocs(q);

      const leads = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];

      // Sort by recent activity and update priority
      const recentLeads = leads
        .filter(lead => {
          const lastContact = lead.lastContactDate instanceof Date ? 
            lead.lastContactDate : (lead.lastContactDate as any).toDate();
          const daysSinceContact = (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceContact <= 3; // Last 3 days
        })
        .slice(0, parameters.maxLeads || 20);

      for (const lead of recentLeads) {
        await updateDoc(doc(db, `tenants/${tenantId}/leads`, lead.id!), {
          priority: parameters.priorityLevel || 'high',
          tags: [...(lead.tags || []), 'auto_prioritized'],
          updatedAt: new Date(),
          automationReason: 'Insights-based prioritization'
        });
      }

      logger.info('✅ [CRMAutomation] Leads prioritized', {
        tenantId,
        leadsUpdated: recentLeads.length
      });

    } catch (error) {
      logger.error('❌ [CRMAutomation] Error prioritizing leads', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Create automatic campaigns
  private async createAutomaticCampaign(tenantId: string, parameters: any): Promise<void> {
    try {
      const campaignData = {
        tenantId,
        name: `Auto Campaign - ${parameters.type}`,
        description: 'Campaign generated automatically based on AI insights',
        type: parameters.type,
        targetAudience: parameters.targetAudience,
        content: parameters.content,
        status: 'draft',
        createdAt: new Date(),
        createdBy: 'automation_system',
        isAutoGenerated: true,
        triggerInsight: parameters.triggerInsight
      };

      const campaignsRef = collection(db, `tenants/${tenantId}/campaigns`);
      await addDoc(campaignsRef, campaignData);

      logger.info('✅ [CRMAutomation] Campaign created', {
        tenantId,
        campaignType: parameters.type
      });

    } catch (error) {
      logger.error('❌ [CRMAutomation] Error creating campaign', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Send team notifications
  private async sendTeamNotification(tenantId: string, parameters: any): Promise<void> {
    try {
      const notification = {
        tenantId,
        title: 'AI Insights Alert',
        message: parameters.message || 'New insights require attention',
        priority: parameters.priority || 'medium',
        type: 'automation_alert',
        data: parameters,
        createdAt: new Date(),
        read: false
      };

      const notificationsRef = collection(db, `tenants/${tenantId}/notifications`);
      await addDoc(notificationsRef, notification);

      // Here you could also integrate with external systems like Slack, email, etc.
      logger.info('✅ [CRMAutomation] Team notification sent', {
        tenantId,
        priority: parameters.priority
      });

    } catch (error) {
      logger.error('❌ [CRMAutomation] Error sending notification', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Trigger process optimization
  private async triggerProcessOptimization(tenantId: string, parameters: any): Promise<void> {
    try {
      const optimization = {
        tenantId,
        type: parameters.focus,
        status: 'pending',
        parameters,
        createdAt: new Date(),
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        estimatedCompletion: parameters.testDuration || '7_days'
      };

      const optimizationsRef = collection(db, `tenants/${tenantId}/process_optimizations`);
      await addDoc(optimizationsRef, optimization);

      logger.info('✅ [CRMAutomation] Process optimization triggered', {
        tenantId,
        focus: parameters.focus
      });

    } catch (error) {
      logger.error('❌ [CRMAutomation] Error triggering optimization', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Process real-time alerts
  async processRealTimeAlerts(tenantId: string, alerts: RealTimeAlerts[]): Promise<void> {
    try {
      for (const alert of alerts) {
        if (alert.severity === 'high' || alert.severity === 'critical') {
          // High priority alerts trigger immediate actions
          if (alert.type === 'performance_drop') {
            await this.sendTeamNotification(tenantId, {
              message: alert.message,
              priority: 'urgent',
              suggestedAction: alert.suggestedAction,
              alertId: alert.id
            });

            // Create urgent task for team
            const task = {
              tenantId,
              title: alert.title,
              description: `${alert.message}\n\nSuggested Action: ${alert.suggestedAction}`,
              priority: 'urgent',
              type: 'performance_issue',
              dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
              createdAt: new Date(),
              createdBy: 'automation_system',
              assignedTo: 'team_lead',
              status: 'pending'
            };

            const tasksRef = collection(db, `tenants/${tenantId}/tasks`);
            await addDoc(tasksRef, task);
          }
        }

        // Log alert for tracking
        const alertLog = {
          ...alert,
          tenantId,
          processedAt: new Date(),
          automationTriggered: alert.severity === 'high' || alert.severity === 'critical'
        };

        const alertsRef = collection(db, `tenants/${tenantId}/alert_logs`);
        await addDoc(alertsRef, alertLog);
      }

      logger.info('✅ [CRMAutomation] Real-time alerts processed', {
        tenantId,
        alertsCount: alerts.length,
        urgentAlerts: alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length
      });

    } catch (error) {
      logger.error('❌ [CRMAutomation] Error processing alerts', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get automation execution history
  async getAutomationHistory(tenantId: string, days: number = 30): Promise<AutomationExecution[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const executionsRef = collection(db, `tenants/${tenantId}/automation_executions`);
      const q = query(
        executionsRef,
        where('executedAt', '>=', Timestamp.fromDate(startDate)),
        // orderBy('executedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AutomationExecution[];

    } catch (error) {
      logger.error('❌ [CRMAutomation] Error fetching automation history', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  // Update automation rules
  async updateAutomationRule(tenantId: string, ruleId: string, updates: Partial<AutomationRule>): Promise<void> {
    try {
      await updateDoc(doc(db, `tenants/${tenantId}/automation_rules`, ruleId), {
        ...updates,
        updatedAt: new Date()
      });

      logger.info('✅ [CRMAutomation] Rule updated', { tenantId, ruleId });
    } catch (error) {
      logger.error('❌ [CRMAutomation] Error updating rule', { tenantId, ruleId, error });
    }
  }
}

export const crmAutomationService = new CRMAutomationService();