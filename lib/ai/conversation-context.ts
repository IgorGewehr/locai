import { ConversationContext, ExtractedClientInfo, ConversationStage, ConversationIntent } from '@/lib/types/conversation'
import { Message } from '@/lib/types/conversation'

export class ConversationContextManager {
  private context: ConversationContext

  constructor(initialContext?: Partial<ConversationContext>) {
    this.context = {
      clientPreferences: {},
      previousConversations: [],
      clientScore: 0,
      viewedProperties: [],
      favoriteProperties: [],
      searchCriteria: {},
      flexibleDates: false,
      specialRequests: [],
      pendingQuestions: [],
      nextAction: 'greeting',
      ...initialContext
    }
  }

  updateFromMessage(message: Message): void {
    // Extrair informações do cliente da mensagem
    const extractedInfo = this.extractClientInfo(message.content)
    this.updateClientInfo(extractedInfo)
    
    // Atualizar critérios de busca
    this.updateSearchCriteria(message.content)
    
    // Detectar intent e stage
    this.updateConversationStage(message.content)
    
    // Atualizar próxima ação
    this.updateNextAction(message.content)
  }

  private extractClientInfo(content: string): ExtractedClientInfo {
    const info: ExtractedClientInfo = {}
    
    // Extrair nome
    const nameMatch = content.match(/meu nome é ([^,.\n]+)/i) || 
                     content.match(/me chamo ([^,.\n]+)/i) ||
                     content.match(/sou ([^,.\n]+)/i)
    if (nameMatch) {
      info.name = nameMatch[1].trim()
    }
    
    // Extrair orçamento
    const budgetMatch = content.match(/orçamento.*?(\d+)/i) || 
                       content.match(/posso gastar.*?(\d+)/i) ||
                       content.match(/até.*?(\d+)/i)
    if (budgetMatch) {
      info.budget = parseInt(budgetMatch[1])
    }
    
    // Extrair número de hóspedes
    const guestsMatch = content.match(/(\d+).*?pessoa/i) || 
                       content.match(/(\d+).*?hóspede/i) ||
                       content.match(/somos (\d+)/i)
    if (guestsMatch) {
      info.guests = parseInt(guestsMatch[1])
    }
    
    // Extrair localização
    const locationMatch = content.match(/em ([^,.\n]+)/i) ||
                         content.match(/na ([^,.\n]+)/i) ||
                         content.match(/no ([^,.\n]+)/i)
    if (locationMatch) {
      info.location = locationMatch[1].trim()
    }
    
    // Extrair datas
    const dateMatch = this.extractDates(content)
    if (dateMatch) {
      info.dates = dateMatch
    }
    
    // Extrair preferências
    const preferences = this.extractPreferences(content)
    if (preferences.length > 0) {
      info.preferences = preferences
    }
    
    return info
  }

  private extractDates(content: string): { checkIn: Date; checkOut: Date } | undefined {
    // Padrões de data comuns
    const patterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/g,
      /(\d{1,2}\/\d{1,2})/g,
      /(\d{1,2})-(\d{1,2})-(\d{4})/g,
      /(\d{1,2})-(\d{1,2})/g
    ]
    
    const dates: Date[] = []
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches) {
        matches.forEach(match => {
          const date = this.parseDate(match)
          if (date) dates.push(date)
        })
      }
    })
    
    if (dates.length >= 2) {
      return {
        checkIn: dates[0],
        checkOut: dates[1]
      }
    }
    
    return undefined
  }

  private parseDate(dateString: string): Date | null {
    try {
      const [day, month, year] = dateString.split(/[\/\-]/)
      const currentYear = new Date().getFullYear()
      const fullYear = year ? parseInt(year) : currentYear
      
      return new Date(fullYear, parseInt(month) - 1, parseInt(day))
    } catch {
      return null
    }
  }

  private extractPreferences(content: string): string[] {
    const preferences: string[] = []
    
    // Comodidades
    const amenityKeywords = {
      'piscina': ['piscina', 'swimming pool', 'pool'],
      'wifi': ['wifi', 'internet', 'wi-fi'],
      'estacionamento': ['estacionamento', 'garagem', 'parking'],
      'ar_condicionado': ['ar condicionado', 'ar-condicionado', 'ac'],
      'churrasqueira': ['churrasqueira', 'barbecue', 'grill'],
      'praia': ['praia', 'beach', 'orla'],
      'centro': ['centro', 'downtown', 'city center']
    }
    
    Object.entries(amenityKeywords).forEach(([key, keywords]) => {
      keywords.forEach(keyword => {
        if (content.toLowerCase().includes(keyword)) {
          preferences.push(key)
        }
      })
    })
    
    return preferences
  }

  private updateClientInfo(info: ExtractedClientInfo): void {
    if (info.name) {
      this.context.clientPreferences.name = info.name
    }
    
    if (info.budget) {
      this.context.budgetRange = {
        min: 0,
        max: info.budget
      }
    }
    
    if (info.location) {
      this.context.searchCriteria.location = info.location
    }
    
    if (info.guests) {
      this.context.searchCriteria.guests = info.guests
    }
    
    if (info.dates) {
      this.context.searchCriteria.checkIn = info.dates.checkIn
      this.context.searchCriteria.checkOut = info.dates.checkOut
    }
    
    if (info.preferences) {
      this.context.clientPreferences.amenities = info.preferences
    }
  }

  private updateSearchCriteria(content: string): void {
    // Atualizar critérios baseado no conteúdo
    if (content.includes('quarto') || content.includes('bedroom')) {
      const bedroomMatch = content.match(/(\d+).*?quarto/i)
      if (bedroomMatch) {
        this.context.searchCriteria.bedrooms = parseInt(bedroomMatch[1])
      }
    }
    
    if (content.includes('banheiro') || content.includes('bathroom')) {
      const bathroomMatch = content.match(/(\d+).*?banheiro/i)
      if (bathroomMatch) {
        this.context.searchCriteria.bathrooms = parseInt(bathroomMatch[1])
      }
    }
  }

  private updateConversationStage(content: string): void {
    const lowerContent = content.toLowerCase()
    
    // Detectar stage baseado no conteúdo
    if (lowerContent.includes('olá') || lowerContent.includes('oi') || 
        lowerContent.includes('bom dia') || lowerContent.includes('boa tarde')) {
      this.context.stage = ConversationStage.GREETING
    } else if (lowerContent.includes('procuro') || lowerContent.includes('busco') ||
               lowerContent.includes('preciso') || lowerContent.includes('quero')) {
      this.context.stage = ConversationStage.DISCOVERY
    } else if (lowerContent.includes('foto') || lowerContent.includes('imagem') ||
               lowerContent.includes('vídeo') || lowerContent.includes('ver')) {
      this.context.stage = ConversationStage.PROPERTY_SHOWING
    } else if (lowerContent.includes('preço') || lowerContent.includes('valor') ||
               lowerContent.includes('custo') || lowerContent.includes('desconto')) {
      this.context.stage = ConversationStage.NEGOTIATION
    } else if (lowerContent.includes('reservar') || lowerContent.includes('confirmar') ||
               lowerContent.includes('fechar') || lowerContent.includes('quero este')) {
      this.context.stage = ConversationStage.BOOKING
    }
  }

  private updateNextAction(content: string): void {
    const lowerContent = content.toLowerCase()
    
    if (lowerContent.includes('foto') || lowerContent.includes('imagem')) {
      this.context.nextAction = 'send_property_media'
    } else if (lowerContent.includes('preço') || lowerContent.includes('valor')) {
      this.context.nextAction = 'calculate_total_price'
    } else if (lowerContent.includes('disponível') || lowerContent.includes('livre')) {
      this.context.nextAction = 'check_availability'
    } else if (lowerContent.includes('reservar') || lowerContent.includes('confirmar')) {
      this.context.nextAction = 'create_reservation'
    } else if (lowerContent.includes('procuro') || lowerContent.includes('busco')) {
      this.context.nextAction = 'search_properties'
    } else {
      this.context.nextAction = 'ai_response'
    }
  }

  getContext(): ConversationContext {
    return { ...this.context }
  }

  updateContext(updates: Partial<ConversationContext>): void {
    this.context = { ...this.context, ...updates }
  }

  addViewedProperty(propertyId: string): void {
    if (!this.context.viewedProperties.includes(propertyId)) {
      this.context.viewedProperties.push(propertyId)
    }
  }

  addFavoriteProperty(propertyId: string): void {
    if (!this.context.favoriteProperties.includes(propertyId)) {
      this.context.favoriteProperties.push(propertyId)
    }
  }

  setLastOffer(offer: any): void {
    this.context.lastOfferMade = offer
  }

  addPendingQuestion(question: string): void {
    this.context.pendingQuestions.push(question)
  }

  removePendingQuestion(question: string): void {
    this.context.pendingQuestions = this.context.pendingQuestions.filter(q => q !== question)
  }

  calculateClientScore(): number {
    let score = 0
    
    // Pontos por informações fornecidas
    if (this.context.clientPreferences.name) score += 10
    if (this.context.searchCriteria.checkIn) score += 15
    if (this.context.searchCriteria.checkOut) score += 15
    if (this.context.searchCriteria.guests) score += 10
    if (this.context.searchCriteria.location) score += 10
    if (this.context.budgetRange) score += 20
    
    // Pontos por engagement
    if (this.context.viewedProperties.length > 0) score += 15
    if (this.context.favoriteProperties.length > 0) score += 20
    if (this.context.lastOfferMade) score += 25
    
    // Pontos por preferências específicas
    if (this.context.clientPreferences.amenities?.length > 0) score += 10
    if (this.context.specialRequests.length > 0) score += 10
    
    return Math.min(score, 100)
  }

  isReadyForReservation(): boolean {
    return !!(
      this.context.clientPreferences.name &&
      this.context.searchCriteria.checkIn &&
      this.context.searchCriteria.checkOut &&
      this.context.searchCriteria.guests &&
      this.context.lastOfferMade
    )
  }

  getSearchCriteria() {
    return {
      location: this.context.searchCriteria.location,
      checkIn: this.context.searchCriteria.checkIn,
      checkOut: this.context.searchCriteria.checkOut,
      guests: this.context.searchCriteria.guests,
      budget: this.context.budgetRange?.max,
      amenities: this.context.clientPreferences.amenities,
      propertyType: this.context.searchCriteria.propertyType
    }
  }

  getMissingRequiredInfo(): string[] {
    const missing: string[] = []
    
    if (!this.context.searchCriteria.checkIn) missing.push('data de check-in')
    if (!this.context.searchCriteria.checkOut) missing.push('data de check-out')
    if (!this.context.searchCriteria.guests) missing.push('número de hóspedes')
    if (!this.context.searchCriteria.location) missing.push('localização')
    
    return missing
  }

  shouldAskForMissingInfo(): boolean {
    return this.getMissingRequiredInfo().length > 0
  }

  generateFollowUpQuestions(): string[] {
    const questions: string[] = []
    const missing = this.getMissingRequiredInfo()
    
    missing.forEach(info => {
      switch (info) {
        case 'data de check-in':
          questions.push('Qual seria a data de check-in?')
          break
        case 'data de check-out':
          questions.push('E a data de check-out?')
          break
        case 'número de hóspedes':
          questions.push('Quantas pessoas se hospedarão?')
          break
        case 'localização':
          questions.push('Tem alguma preferência de localização?')
          break
      }
    })
    
    return questions
  }

  reset(): void {
    this.context = {
      clientPreferences: {},
      previousConversations: [],
      clientScore: 0,
      viewedProperties: [],
      favoriteProperties: [],
      searchCriteria: {},
      flexibleDates: false,
      specialRequests: [],
      pendingQuestions: [],
      nextAction: 'greeting'
    }
  }
}