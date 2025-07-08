import { AutomationEngine } from '@/lib/automation/workflow-engine'
import { WhatsAppClient } from '@/lib/whatsapp/client'
import { AIService } from '@/lib/services/ai-service'
import { Automation, AutomationExecution, TriggerType } from '@/lib/types/automation'

export class AutomationService {
  private automationEngine: AutomationEngine
  private tenantId: string

  constructor(tenantId: string, whatsappClient: WhatsAppClient, aiService: AIService) {
    this.tenantId = tenantId
    this.automationEngine = new AutomationEngine(whatsappClient, aiService, tenantId)
    
    // Load automations on initialization
    this.initialize()
  }

  private async initialize() {
    await this.automationEngine.loadAutomations(this.tenantId)
  }

  async triggerAutomations(eventType: string, eventData: any): Promise<void> {
    try {
      await this.automationEngine.processTrigger(eventType, eventData)
    } catch (error) {
      console.error('Error triggering automations:', error)
    }
  }

  async createAutomation(automation: Omit<Automation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Automation> {
    return await this.automationEngine.createAutomation(automation)
  }

  async updateAutomation(id: string, updates: Partial<Automation>): Promise<Automation> {
    return await this.automationEngine.updateAutomation(id, updates)
  }

  async deleteAutomation(id: string): Promise<void> {
    await this.automationEngine.deleteAutomation(id)
  }

  getActiveAutomations(): Automation[] {
    return this.automationEngine.getActiveAutomationsList()
  }

  async reloadAutomations(): Promise<void> {
    await this.automationEngine.loadAutomations(this.tenantId)
  }
}