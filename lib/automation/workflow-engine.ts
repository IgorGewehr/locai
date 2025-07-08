import { 
  Automation, 
  AutomationTrigger, 
  AutomationAction, 
  AutomationExecution,
  TriggerType,
  ActionType,
  ExecutionStatus,
  AutomationCondition,
  ConditionOperator
} from '@/lib/types/automation'
import { WhatsAppClient } from '@/lib/whatsapp/client'
import { AIService } from '@/lib/services/ai-service'
import { conversationService } from '@/lib/services/conversation-service'
import { clientService } from '@/lib/services/client-service'

export class AutomationEngine {
  private whatsappClient: WhatsAppClient
  private aiService: AIService
  private activeAutomations: Map<string, Automation> = new Map()
  private tenantId: string

  constructor(whatsappClient: WhatsAppClient, aiService: AIService, tenantId: string) {
    this.whatsappClient = whatsappClient
    this.aiService = aiService
    this.tenantId = tenantId
  }

  async loadAutomations(tenantId: string): Promise<void> {
    try {
      // Load automations from database
      const automations = await this.getActiveAutomations(tenantId)
      
      this.activeAutomations.clear()
      automations.forEach(automation => {
        this.activeAutomations.set(automation.id, automation)
      })
      
      console.log(`Loaded ${automations.length} active automations for tenant ${tenantId}`)
    } catch (error) {
      console.error('Error loading automations:', error)
    }
  }

  async processTrigger(eventType: string, eventData: any): Promise<void> {
    try {
      console.log(`Processing trigger: ${eventType}`)
      
      const matchingAutomations = Array.from(this.activeAutomations.values())
        .filter(automation => this.matchesTrigger(automation.trigger, eventType, eventData))
        .sort((a, b) => b.priority - a.priority) // Higher priority first

      for (const automation of matchingAutomations) {
        await this.executeAutomation(automation, eventData)
      }
    } catch (error) {
      console.error('Error processing trigger:', error)
    }
  }

  private async getActiveAutomations(tenantId: string): Promise<Automation[]> {
    // TODO: Implement database query
    // This would typically fetch from a database
    return this.getDefaultAutomations(tenantId)
  }

  private getDefaultAutomations(tenantId: string): Automation[] {
    return [
      {
        id: 'welcome_new_client',
        name: 'Boas-vindas para Novos Clientes',
        description: 'Enviar mensagem de boas-vindas para novos clientes',
        trigger: {
          type: TriggerType.MESSAGE_RECEIVED,
          event: 'message_received',
          conditions: { 
            isFirstMessage: true,
            messageType: 'text'
          }
        },
        conditions: [],
        actions: [
          {
            type: ActionType.SEND_MESSAGE,
            configuration: {
              message: `🎉 Olá! Bem-vindo(a) à nossa imobiliária!\n\nSou um assistente virtual especializado em locações por temporada. Estou aqui para ajudá-lo(a) a encontrar a propriedade perfeita!\n\nPara começar, me conte:\n• Quando pretende se hospedar?\n• Quantas pessoas?\n• Qual região prefere?`,
              delay: 2000
            },
            delay: 0,
            requiresApproval: false,
            priority: 1
          }
        ],
        isActive: true,
        priority: 10,
        lastExecuted: undefined,
        executionCount: 0,
        successRate: 100,
        tenantId,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'follow_up_after_search',
        name: 'Follow-up Após Busca',
        description: 'Seguimento quando cliente visualiza propriedades mas não responde',
        trigger: {
          type: TriggerType.PROPERTY_VIEWED,
          event: 'function_executed_search_properties',
          conditions: {
            propertiesFound: true,
            followUpAfterMinutes: 15
          }
        },
        conditions: [
          {
            field: 'lastMessageTime',
            operator: ConditionOperator.GREATER_THAN,
            value: 900000, // 15 minutes in ms
            logicalOperator: 'AND'
          }
        ],
        actions: [
          {
            type: ActionType.SEND_MESSAGE,
            configuration: {
              message: `Oi! Vi que você estava interessado(a) em algumas propriedades. 🏠\n\nGostaria de ver mais fotos ou calcular o preço de alguma específica?\n\nEstou aqui para ajudar! 😊`
            },
            delay: 0,
            requiresApproval: false,
            priority: 1
          }
        ],
        isActive: true,
        priority: 5,
        lastExecuted: undefined,
        executionCount: 0,
        successRate: 85,
        tenantId,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'price_calculation_follow_up',
        name: 'Follow-up Após Cálculo de Preço',
        description: 'Incentivar reserva após cálculo de preço',
        trigger: {
          type: TriggerType.PRICE_INQUIRY,
          event: 'function_executed_calculate_total_price',
          conditions: {
            priceCalculated: true
          }
        },
        conditions: [],
        actions: [
          {
            type: ActionType.SEND_MESSAGE,
            configuration: {
              message: `💡 *Dica:* Propriedades com boa localização como esta costumam ser reservadas rapidamente!\n\nQuer garantir já sua reserva? Posso processar tudo para você! 🚀`
            },
            delay: 30000, // 30 seconds
            requiresApproval: false,
            priority: 1
          }
        ],
        isActive: true,
        priority: 7,
        lastExecuted: undefined,
        executionCount: 0,
        successRate: 60,
        tenantId,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'abandoned_booking_recovery',
        name: 'Recuperação de Reserva Abandonada',
        description: 'Tentar recuperar clientes que abandonaram o processo de reserva',
        trigger: {
          type: TriggerType.BOOKING_ABANDONED,
          event: 'conversation_inactive',
          conditions: {
            hadPriceCalculation: true,
            inactiveForHours: 2
          }
        },
        conditions: [
          {
            field: 'conversationStage',
            operator: ConditionOperator.IN,
            value: ['negotiation', 'booking'],
            logicalOperator: 'AND'
          }
        ],
        actions: [
          {
            type: ActionType.SEND_MESSAGE,
            configuration: {
              message: `Oi! 👋\n\nNotei que você estava interessado(a) em uma de nossas propriedades.\n\nTem alguma dúvida que posso esclarecer? Ou prefere que eu sugira outras opções?\n\nEstou aqui para ajudar! 😊`
            },
            delay: 0,
            requiresApproval: false,
            priority: 1
          },
          {
            type: ActionType.APPLY_DISCOUNT,
            configuration: {
              discountPercentage: 5,
              reason: 'Desconto especial para finalizar reserva',
              message: `🎁 *Oferta Especial!*\n\nQue tal um desconto de 5% para você finalizar sua reserva hoje?\n\nEssa é uma oferta limitada, válida apenas por algumas horas! ⏰`
            },
            delay: 300000, // 5 minutes after first message
            requiresApproval: true,
            priority: 2
          }
        ],
        isActive: true,
        priority: 8,
        lastExecuted: undefined,
        executionCount: 0,
        successRate: 40,
        tenantId,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'check_in_reminder',
        name: 'Lembrete de Check-in',
        description: 'Enviar lembrete 1 dia antes do check-in',
        trigger: {
          type: TriggerType.CHECK_IN_REMINDER,
          event: 'scheduled',
          schedule: {
            minute: '0',
            hour: '10',
            dayOfMonth: '*',
            month: '*',
            dayOfWeek: '*',
            timezone: 'America/Sao_Paulo'
          }
        },
        conditions: [
          {
            field: 'checkInDate',
            operator: ConditionOperator.EQUALS,
            value: 'tomorrow'
          }
        ],
        actions: [
          {
            type: ActionType.SEND_TEMPLATE,
            configuration: {
              templateName: 'check_in_reminder',
              language: 'pt_BR'
            },
            delay: 0,
            requiresApproval: false,
            priority: 1
          }
        ],
        isActive: true,
        priority: 9,
        lastExecuted: undefined,
        executionCount: 0,
        successRate: 95,
        tenantId,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  }

  private matchesTrigger(trigger: AutomationTrigger, eventType: string, eventData: any): boolean {
    if (trigger.event !== eventType) {
      return false
    }

    // Check trigger conditions
    for (const [key, value] of Object.entries(trigger.conditions)) {
      if (eventData[key] !== value) {
        return false
      }
    }

    return true
  }

  private async executeAutomation(automation: Automation, eventData: any): Promise<void> {
    const execution: AutomationExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      automationId: automation.id,
      triggeredAt: new Date(),
      status: ExecutionStatus.RUNNING,
      results: [],
      context: eventData
    }

    try {
      console.log(`Executing automation: ${automation.name}`)

      // Check conditions
      if (!this.evaluateConditions(automation.conditions, eventData)) {
        execution.status = ExecutionStatus.CANCELLED
        console.log(`Automation ${automation.name} cancelled - conditions not met`)
        return
      }

      // Execute actions in sequence
      for (const action of automation.actions) {
        const actionResult = await this.executeAction(action, eventData, execution.context)
        execution.results.push(actionResult)

        if (!actionResult.success) {
          console.error(`Action ${action.type} failed:`, actionResult.error)
        }
      }

      execution.status = ExecutionStatus.COMPLETED
      execution.completedAt = new Date()

      // Update automation stats
      automation.executionCount++
      automation.lastExecuted = new Date()
      automation.successRate = this.calculateSuccessRate(automation)

      console.log(`Automation ${automation.name} completed successfully`)

    } catch (error) {
      execution.status = ExecutionStatus.FAILED
      execution.error = error instanceof Error ? error.message : 'Unknown error'
      execution.completedAt = new Date()

      console.error(`Automation ${automation.name} failed:`, error)
    }

    // Save execution record
    await this.saveExecutionRecord(execution)
  }

  private evaluateConditions(conditions: AutomationCondition[], eventData: any): boolean {
    if (conditions.length === 0) return true

    let result = true
    let currentOperator: 'AND' | 'OR' = 'AND'

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, eventData)
      
      if (currentOperator === 'AND') {
        result = result && conditionResult
      } else {
        result = result || conditionResult
      }

      currentOperator = condition.logicalOperator || 'AND'
    }

    return result
  }

  private evaluateCondition(condition: AutomationCondition, eventData: any): boolean {
    const fieldValue = this.getFieldValue(condition.field, eventData)
    
    switch (condition.operator) {
      case ConditionOperator.EQUALS:
        return fieldValue === condition.value
      
      case ConditionOperator.NOT_EQUALS:
        return fieldValue !== condition.value
      
      case ConditionOperator.GREATER_THAN:
        return fieldValue > condition.value
      
      case ConditionOperator.LESS_THAN:
        return fieldValue < condition.value
      
      case ConditionOperator.CONTAINS:
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase())
      
      case ConditionOperator.NOT_CONTAINS:
        return !String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase())
      
      case ConditionOperator.STARTS_WITH:
        return String(fieldValue).toLowerCase().startsWith(String(condition.value).toLowerCase())
      
      case ConditionOperator.ENDS_WITH:
        return String(fieldValue).toLowerCase().endsWith(String(condition.value).toLowerCase())
      
      case ConditionOperator.IS_EMPTY:
        return !fieldValue || fieldValue === '' || fieldValue === null || fieldValue === undefined
      
      case ConditionOperator.IS_NOT_EMPTY:
        return fieldValue !== '' && fieldValue !== null && fieldValue !== undefined
      
      case ConditionOperator.IN:
        return Array.isArray(condition.value) && condition.value.includes(fieldValue)
      
      case ConditionOperator.NOT_IN:
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue)
      
      default:
        return false
    }
  }

  private getFieldValue(fieldPath: string, data: any): any {
    const keys = fieldPath.split('.')
    let value = data

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      } else {
        return undefined
      }
    }

    return value
  }

  private async executeAction(action: AutomationAction, eventData: any, context: any): Promise<any> {
    const startTime = Date.now()
    
    try {
      // Apply delay if specified
      if (action.delay && action.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, action.delay))
      }

      let result: any

      switch (action.type) {
        case ActionType.SEND_MESSAGE:
          result = await this.executeSendMessage(action, eventData, context)
          break

        case ActionType.SEND_MEDIA:
          result = await this.executeSendMedia(action, eventData, context)
          break

        case ActionType.SEND_TEMPLATE:
          result = await this.executeSendTemplate(action, eventData, context)
          break

        case ActionType.AI_RESPONSE:
          result = await this.executeAIResponse(action, eventData, context)
          break

        case ActionType.APPLY_DISCOUNT:
          result = await this.executeApplyDiscount(action, eventData, context)
          break

        case ActionType.SCHEDULE_FOLLOW_UP:
          result = await this.executeScheduleFollowUp(action, eventData, context)
          break

        case ActionType.UPDATE_CLIENT:
          result = await this.executeUpdateClient(action, eventData, context)
          break

        case ActionType.ESCALATE_TO_HUMAN:
          result = await this.executeEscalateToHuman(action, eventData, context)
          break

        default:
          throw new Error(`Unknown action type: ${action.type}`)
      }

      return {
        actionType: action.type,
        success: true,
        data: result,
        executedAt: new Date(),
        duration: Date.now() - startTime
      }

    } catch (error) {
      return {
        actionType: action.type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date(),
        duration: Date.now() - startTime
      }
    }
  }

  private async executeSendMessage(action: AutomationAction, eventData: any, context: any): Promise<any> {
    const phone = this.getPhoneFromContext(eventData, context)
    const message = this.replacePlaceholders(action.configuration.message, eventData, context)

    await this.whatsappClient.sendText(phone, message)
    
    return { phone, message, sent: true }
  }

  private async executeSendTemplate(action: AutomationAction, eventData: any, context: any): Promise<any> {
    const phone = this.getPhoneFromContext(eventData, context)
    const { templateName, language, parameters } = action.configuration

    await this.whatsappClient.sendTemplate(phone, templateName, parameters || [])
    
    return { phone, templateName, sent: true }
  }

  private async executeAIResponse(action: AutomationAction, eventData: any, context: any): Promise<any> {
    // Generate AI response for the context
    if (eventData.conversation && eventData.message) {
      const aiResponse = await this.aiService.processMessage(eventData.conversation, eventData.message)
      
      const phone = this.getPhoneFromContext(eventData, context)
      await this.whatsappClient.sendText(phone, aiResponse.content)
      
      return { phone, aiResponse, sent: true }
    }
    
    throw new Error('No conversation context for AI response')
  }

  private async executeApplyDiscount(action: AutomationAction, eventData: any, context: any): Promise<any> {
    const { discountPercentage, reason, message } = action.configuration
    
    // This would integrate with your pricing system
    // For now, just send the discount message
    if (message) {
      const phone = this.getPhoneFromContext(eventData, context)
      const formattedMessage = this.replacePlaceholders(message, eventData, context)
      
      await this.whatsappClient.sendText(phone, formattedMessage)
    }
    
    return { discountPercentage, reason, applied: true }
  }

  private async executeScheduleFollowUp(action: AutomationAction, eventData: any, context: any): Promise<any> {
    const { followUpDate, message, priority } = action.configuration
    
    // This would integrate with your task/reminder system
    console.log(`Scheduling follow-up for ${followUpDate}: ${message}`)
    
    return { followUpDate, message, priority, scheduled: true }
  }

  private async executeUpdateClient(action: AutomationAction, eventData: any, context: any): Promise<any> {
    const { updates } = action.configuration
    const clientId = eventData.clientId || context.clientId
    
    if (clientId) {
      await clientService.update(clientId, updates)
      return { clientId, updates, updated: true }
    }
    
    throw new Error('No client ID for update')
  }

  private async executeEscalateToHuman(action: AutomationAction, eventData: any, context: any): Promise<any> {
    const { reason, urgency } = action.configuration
    const conversationId = eventData.conversationId || context.conversationId
    
    if (conversationId) {
      await conversationService.escalateToHuman(conversationId, reason, urgency)
      
      // Send message to client
      const phone = this.getPhoneFromContext(eventData, context)
      await this.whatsappClient.sendText(
        phone,
        'Um de nossos especialistas entrará em contato em breve para melhor atendê-lo(a). Obrigado pela paciência! 👨‍💼'
      )
      
      return { conversationId, reason, escalated: true }
    }
    
    throw new Error('No conversation ID for escalation')
  }

  private async executeSendMedia(action: AutomationAction, eventData: any, context: any): Promise<any> {
    const phone = this.getPhoneFromContext(eventData, context)
    const { mediaUrl, caption, mediaType } = action.configuration

    switch (mediaType) {
      case 'image':
        await this.whatsappClient.sendImage(phone, mediaUrl, caption)
        break
      case 'video':
        await this.whatsappClient.sendVideo(phone, mediaUrl, caption)
        break
      case 'document':
        await this.whatsappClient.sendDocument(phone, mediaUrl, caption)
        break
      default:
        throw new Error(`Unsupported media type: ${mediaType}`)
    }
    
    return { phone, mediaUrl, mediaType, sent: true }
  }

  private getPhoneFromContext(eventData: any, context: any): string {
    return eventData.clientPhone || 
           eventData.conversation?.whatsappPhone || 
           context.clientPhone || 
           context.phone ||
           context.whatsappPhone
  }

  private replacePlaceholders(message: string, eventData: any, context: any): string {
    let result = message

    // Replace common placeholders
    const replacements = {
      '{{clientName}}': eventData.clientName || context.clientName || 'Cliente',
      '{{propertyName}}': eventData.propertyName || context.propertyName || '',
      '{{checkIn}}': eventData.checkIn || context.checkIn || '',
      '{{checkOut}}': eventData.checkOut || context.checkOut || '',
      '{{totalAmount}}': eventData.totalAmount || context.totalAmount || '',
      '{{confirmationCode}}': eventData.confirmationCode || context.confirmationCode || ''
    }

    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder, 'g'), String(value))
    }

    return result
  }

  private calculateSuccessRate(automation: Automation): number {
    // This would calculate based on execution history
    // For now, return current success rate
    return automation.successRate
  }

  private async saveExecutionRecord(execution: AutomationExecution): Promise<void> {
    // TODO: Implement database save
    console.log(`Saving execution record:`, execution.id)
  }

  // Public methods for managing automations
  async createAutomation(automation: Omit<Automation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Automation> {
    const newAutomation: Automation = {
      ...automation,
      id: `automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Save to database
    // await this.saveAutomation(newAutomation)

    if (newAutomation.isActive) {
      this.activeAutomations.set(newAutomation.id, newAutomation)
    }

    return newAutomation
  }

  async updateAutomation(id: string, updates: Partial<Automation>): Promise<Automation> {
    const automation = this.activeAutomations.get(id)
    if (!automation) {
      throw new Error(`Automation ${id} not found`)
    }

    const updatedAutomation = {
      ...automation,
      ...updates,
      updatedAt: new Date()
    }

    // Save to database
    // await this.saveAutomation(updatedAutomation)

    if (updatedAutomation.isActive) {
      this.activeAutomations.set(id, updatedAutomation)
    } else {
      this.activeAutomations.delete(id)
    }

    return updatedAutomation
  }

  async deleteAutomation(id: string): Promise<void> {
    this.activeAutomations.delete(id)
    // Delete from database
    // await this.deleteAutomationFromDB(id)
  }

  getActiveAutomationsList(): Automation[] {
    return Array.from(this.activeAutomations.values())
  }
}