import { NextRequest, NextResponse } from 'next/server';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { Lead, LeadStatus, LeadTemperature, InteractionType } from '@/lib/types/crm';
import { Client } from '@/lib/types/client';
import { Reservation } from '@/lib/types/reservation';
import { differenceInDays, differenceInHours, subDays } from 'date-fns';

interface LeadInsights {
  conversionProbability: number;
  recommendedActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    impact: string;
    effort: string;
    timeline: string;
  }>;
  nextBestContact: {
    channel: 'whatsapp' | 'email' | 'phone' | 'visit';
    timing: string;
    message?: string;
    reasoning: string;
  };
  similarLeads: Array<{
    id: string;
    name: string;
    score: number;
    status: LeadStatus;
    outcome: 'converted' | 'lost' | 'active';
    similarity: number;
    conversionTime?: number; // days
  }>;
  riskFactors: Array<{
    factor: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    mitigation: string;
  }>;
  opportunities: Array<{
    opportunity: string;
    potential: 'high' | 'medium' | 'low';
    description: string;
    actionRequired: string;
  }>;
  predictedValue: number;
  timeToConversion: number; // days
  confidenceLevel: number; // 0-100
  behaviorAnalysis: {
    engagementLevel: 'high' | 'medium' | 'low';
    responsePattern: string;
    preferredTime: string;
    preferredChannel: string;
    buyingSignals: string[];
    redFlags: string[];
  };
  competitiveAnalysis: {
    likelyCompetitors: string[];
    differentiators: string[];
    pricingStrategy: string;
    urgencyFactors: string[];
  };
  personalization: {
    communicationStyle: 'formal' | 'casual' | 'technical';
    interests: string[];
    painPoints: string[];
    motivators: string[];
    preferredContent: string[];
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const includeAI = searchParams.get('includeAI') !== 'false'; // Default true

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID é obrigatório' },
        { status: 400 }
      );
    }

    const leadId = params.id;

    logger.info(`🔍 [Lead Insights] Generating insights for lead ${leadId}`, {
      tenantId: tenantId.substring(0, 8) + '***',
      includeAI
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const leadService = serviceFactory.createService<Lead>('leads');
    const clientService = serviceFactory.createService<Client>('clients');
    const reservationService = serviceFactory.createService<Reservation>('reservations');

    // Get the lead
    const lead = await leadService.getById(leadId);
    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead não encontrado' },
        { status: 404 }
      );
    }

    // Get all leads for comparison
    const allLeads = await leadService.list([]);
    const allClients = await clientService.list([]);
    const allReservations = await reservationService.list([]);

    // Calculate conversion probability based on lead characteristics
    const conversionProbability = calculateConversionProbability(lead, allLeads, allClients);

    // Generate recommended actions
    const recommendedActions = generateRecommendedActions(lead);

    // Determine next best contact
    const nextBestContact = determineNextBestContact(lead);

    // Find similar leads
    const similarLeads = findSimilarLeads(lead, allLeads, allClients);

    // Identify risk factors
    const riskFactors = identifyRiskFactors(lead);

    // Identify opportunities
    const opportunities = identifyOpportunities(lead);

    // Predict lead value
    const predictedValue = predictLeadValue(lead, allReservations);

    // Estimate time to conversion
    const timeToConversion = estimateTimeToConversion(lead, allLeads, allClients);

    // Calculate confidence level
    const confidenceLevel = calculateConfidenceLevel(lead, allLeads);

    // Analyze behavior
    const behaviorAnalysis = analyzeBehavior(lead);

    // Competitive analysis
    const competitiveAnalysis = analyzeCompetitivePosition(lead);

    // Personalization insights
    const personalization = generatePersonalizationInsights(lead);

    const insights: LeadInsights = {
      conversionProbability,
      recommendedActions,
      nextBestContact,
      similarLeads,
      riskFactors,
      opportunities,
      predictedValue,
      timeToConversion,
      confidenceLevel,
      behaviorAnalysis,
      competitiveAnalysis,
      personalization
    };

    logger.info(`✅ [Lead Insights] Insights generated successfully`, {
      tenantId: tenantId.substring(0, 8) + '***',
      leadId,
      conversionProbability: Math.round(conversionProbability),
      confidenceLevel
    });

    return NextResponse.json({
      success: true,
      data: insights
    });

  } catch (error) {
    logger.error('❌ [Lead Insights] Error generating insights:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor ao gerar insights'
      },
      { status: 500 }
    );
  }
}

// Helper functions for insight generation

function calculateConversionProbability(lead: Lead, allLeads: Lead[], allClients: Client[]): number {
  let probability = 50; // Base probability

  // Score factor (0-100 scale)
  const scoreWeight = (lead.score || 0) / 100 * 40; // Max 40 points
  probability += scoreWeight - 20; // Adjust base

  // Temperature factor
  const tempMultiplier = {
    hot: 25,
    warm: 10,
    cold: -15
  };
  probability += tempMultiplier[lead.temperature] || 0;

  // Status factor
  const statusMultiplier = {
    new: -5,
    contacted: 5,
    qualified: 15,
    nurturing: 10,
    proposal_sent: 20,
    negotiating: 25,
    won: 100,
    lost: 0
  };
  probability += statusMultiplier[lead.status] || 0;

  // Interaction frequency
  const interactions = lead.interactions || [];
  const recentInteractions = interactions.filter(i => 
    differenceInDays(new Date(), i.date?.toDate() || new Date()) <= 7
  );
  probability += recentInteractions.length * 3; // 3 points per recent interaction

  // Source quality (based on historical conversion rates)
  const sourceConversions = allClients.filter(c => c.source === lead.source).length;
  const sourceLeads = allLeads.filter(l => l.source === lead.source).length;
  const sourceConversionRate = sourceLeads > 0 ? sourceConversions / sourceLeads : 0.1;
  probability += (sourceConversionRate - 0.15) * 50; // Adjust based on source performance

  // Time factor (leads get stale over time)
  const daysSinceCreated = differenceInDays(new Date(), lead.createdAt?.toDate() || new Date());
  if (daysSinceCreated > 30) {
    probability -= Math.min(20, (daysSinceCreated - 30) * 0.5);
  }

  // Engagement factor
  const lastInteraction = interactions[interactions.length - 1];
  if (lastInteraction) {
    const daysSinceLastContact = differenceInDays(new Date(), lastInteraction.date?.toDate() || new Date());
    if (daysSinceLastContact > 14) {
      probability -= Math.min(15, daysSinceLastContact * 0.5);
    }
  }

  return Math.max(0, Math.min(100, Math.round(probability)));
}

function generateRecommendedActions(lead: Lead): Array<{
  action: string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
  effort: string;
  timeline: string;
}> {
  const actions = [];
  const interactions = lead.interactions || [];
  const lastInteraction = interactions[interactions.length - 1];
  const daysSinceLastContact = lastInteraction 
    ? differenceInDays(new Date(), lastInteraction.date?.toDate() || new Date())
    : 999;

  // High priority actions
  if (daysSinceLastContact > 7 && lead.status !== 'lost') {
    actions.push({
      action: 'Fazer follow-up imediato',
      priority: 'high' as const,
      impact: 'Alto - evita perda do lead',
      effort: 'Baixo - 5 minutos',
      timeline: 'Hoje'
    });
  }

  if (lead.temperature === 'hot' && lead.status === 'contacted') {
    actions.push({
      action: 'Agendar visita presencial',
      priority: 'high' as const,
      impact: 'Alto - lead quente precisa de atenção',
      effort: 'Médio - 30 minutos',
      timeline: 'Esta semana'
    });
  }

  if (lead.status === 'qualified' && !lead.scheduledFollowUp) {
    actions.push({
      action: 'Agendar apresentação de proposta',
      priority: 'high' as const,
      impact: 'Alto - lead qualificado pronto para proposta',
      effort: 'Alto - 1 hora',
      timeline: 'Próximos 3 dias'
    });
  }

  // Medium priority actions
  if ((lead.score || 0) < 60 && lead.status !== 'lost') {
    actions.push({
      action: 'Qualificar melhor o lead',
      priority: 'medium' as const,
      impact: 'Médio - melhora direcionamento',
      effort: 'Médio - 20 minutos',
      timeline: 'Esta semana'
    });
  }

  if (!lead.tags || lead.tags.length === 0) {
    actions.push({
      action: 'Adicionar tags de segmentação',
      priority: 'medium' as const,
      impact: 'Médio - melhora organização',
      effort: 'Baixo - 2 minutos',
      timeline: 'Hoje'
    });
  }

  // Low priority actions
  if (!lead.preferences?.propertyType) {
    actions.push({
      action: 'Mapear preferências detalhadas',
      priority: 'low' as const,
      impact: 'Médio - melhora personalização',
      effort: 'Médio - 15 minutos',
      timeline: 'Próxima semana'
    });
  }

  return actions.slice(0, 5); // Return top 5 actions
}

function determineNextBestContact(lead: Lead): {
  channel: 'whatsapp' | 'email' | 'phone' | 'visit';
  timing: string;
  message?: string;
  reasoning: string;
} {
  const interactions = lead.interactions || [];
  const lastInteraction = interactions[interactions.length - 1];
  const preferredChannels = lead.preferredContactMethods || ['whatsapp'];

  let channel: 'whatsapp' | 'email' | 'phone' | 'visit' = 'whatsapp';
  let timing = 'manhã';
  let message = '';
  let reasoning = '';

  // Determine best channel
  if (lead.temperature === 'hot' && lead.status === 'qualified') {
    channel = 'visit';
    reasoning = 'Lead quente e qualificado - visita presencial tem maior impacto';
  } else if (preferredChannels.includes('phone') && lead.temperature === 'warm') {
    channel = 'phone';
    reasoning = 'Lead warm responde bem a chamadas telefônicas';
  } else if (preferredChannels.includes('email') && interactions.length > 3) {
    channel = 'email';
    reasoning = 'Lead engajado - email permite conteúdo mais detalhado';
  } else {
    channel = 'whatsapp';
    reasoning = 'Canal mais eficaz para primeiros contatos e follow-ups';
  }

  // Determine best timing
  const contactHistory = interactions.filter(i => i.response === 'positive');
  if (contactHistory.length > 0) {
    const successfulHours = contactHistory.map(i => i.date?.toDate().getHours() || 9);
    const avgHour = Math.round(successfulHours.reduce((a, b) => a + b, 0) / successfulHours.length);
    
    if (avgHour < 12) timing = 'manhã';
    else if (avgHour < 18) timing = 'tarde';
    else timing = 'noite';
  } else {
    timing = lead.preferences?.preferredContactTime || 'manhã';
  }

  // Generate contextual message
  if (channel === 'whatsapp') {
    if (lead.status === 'new') {
      message = `Olá ${lead.name}, vi seu interesse em imóveis. Tem alguns minutos para conversarmos sobre suas preferências?`;
    } else if (lastInteraction && differenceInDays(new Date(), lastInteraction.date?.toDate() || new Date()) > 7) {
      message = `Oi ${lead.name}! Como está a busca por imóvel? Encontrei algumas opções que podem te interessar.`;
    } else {
      message = `Olá ${lead.name}! Tenho novidades sobre propriedades que combinam com seu perfil. Podemos conversar?`;
    }
  }

  return { channel, timing, message, reasoning };
}

function findSimilarLeads(lead: Lead, allLeads: Lead[], allClients: Client[]): Array<{
  id: string;
  name: string;
  score: number;
  status: LeadStatus;
  outcome: 'converted' | 'lost' | 'active';
  similarity: number;
  conversionTime?: number;
}> {
  const similarLeads = allLeads
    .filter(l => l.id !== lead.id)
    .map(l => {
      let similarity = 0;

      // Score similarity (20 points max)
      const scoreDiff = Math.abs((l.score || 0) - (lead.score || 0));
      similarity += Math.max(0, 20 - scoreDiff / 5);

      // Source similarity (15 points)
      if (l.source === lead.source) similarity += 15;

      // Temperature similarity (10 points)
      if (l.temperature === lead.temperature) similarity += 10;

      // Preferences similarity (20 points)
      if (l.preferences?.propertyType === lead.preferences?.propertyType) similarity += 10;
      if (l.preferences?.location === lead.preferences?.location) similarity += 5;
      if (l.preferences?.priceRange?.min === lead.preferences?.priceRange?.min) similarity += 5;

      // Demographics similarity (15 points)
      const leadAge = lead.demographics?.age || 0;
      const lAge = l.demographics?.age || 0;
      if (Math.abs(leadAge - lAge) <= 5) similarity += 10;
      if (l.demographics?.income === lead.demographics?.income) similarity += 5;

      // Interaction pattern similarity (20 points)
      const leadInteractionCount = (lead.interactions || []).length;
      const lInteractionCount = (l.interactions || []).length;
      if (Math.abs(leadInteractionCount - lInteractionCount) <= 2) similarity += 10;

      return {
        lead: l,
        similarity: Math.round(similarity)
      };
    })
    .filter(item => item.similarity >= 50)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return similarLeads.map(item => {
    const client = allClients.find(c => c.phone === item.lead.phone);
    const outcome = client ? 'converted' : 
      item.lead.status === 'lost' ? 'lost' : 'active';
    
    const conversionTime = client && item.lead.createdAt ? 
      differenceInDays(client.createdAt?.toDate() || new Date(), item.lead.createdAt.toDate()) : 
      undefined;

    return {
      id: item.lead.id,
      name: item.lead.name,
      score: item.lead.score || 0,
      status: item.lead.status,
      outcome: outcome as 'converted' | 'lost' | 'active',
      similarity: item.similarity,
      conversionTime
    };
  });
}

function identifyRiskFactors(lead: Lead): Array<{
  factor: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  mitigation: string;
}> {
  const risks = [];
  const interactions = lead.interactions || [];
  const lastInteraction = interactions[interactions.length - 1];

  // Long time without contact
  const daysSinceLastContact = lastInteraction 
    ? differenceInDays(new Date(), lastInteraction.date?.toDate() || new Date())
    : 999;

  if (daysSinceLastContact > 14) {
    risks.push({
      factor: 'Contato perdido',
      severity: 'high' as const,
      description: `${daysSinceLastContact} dias sem contato - lead pode estar perdendo interesse`,
      mitigation: 'Fazer follow-up imediato com oferta especial ou conteúdo relevante'
    });
  }

  // Low engagement
  const negativeInteractions = interactions.filter(i => i.response === 'negative').length;
  const totalInteractions = interactions.length;
  
  if (totalInteractions > 0 && negativeInteractions / totalInteractions > 0.5) {
    risks.push({
      factor: 'Baixo engajamento',
      severity: 'medium' as const,
      description: 'Muitas interações negativas podem indicar desinteresse',
      mitigation: 'Revisar abordagem, perguntar sobre objeções específicas'
    });
  }

  // Stagnant status
  const daysSinceCreated = differenceInDays(new Date(), lead.createdAt?.toDate() || new Date());
  if (daysSinceCreated > 30 && ['new', 'contacted'].includes(lead.status)) {
    risks.push({
      factor: 'Lead estagnado',
      severity: 'medium' as const,
      description: 'Lead não progrediu no funil por muito tempo',
      mitigation: 'Qualificar melhor ou considerar mudança de abordagem'
    });
  }

  // Price sensitivity
  if (lead.budget && lead.preferences?.priceRange?.max && lead.budget < lead.preferences.priceRange.min) {
    risks.push({
      factor: 'Incompatibilidade orçamentária',
      severity: 'high' as const,
      description: 'Orçamento do lead está abaixo do range de preços preferido',
      mitigation: 'Apresentar opções mais acessíveis ou trabalhar financiamento'
    });
  }

  return risks;
}

function identifyOpportunities(lead: Lead): Array<{
  opportunity: string;
  potential: 'high' | 'medium' | 'low';
  description: string;
  actionRequired: string;
}> {
  const opportunities = [];

  // High score but low status
  if ((lead.score || 0) >= 70 && ['new', 'contacted'].includes(lead.status)) {
    opportunities.push({
      opportunity: 'Lead de alta qualidade sub-explorado',
      potential: 'high' as const,
      description: 'Score alto indica grande potencial, mas status baixo sugere falta de follow-up adequado',
      actionRequired: 'Agendar conversa qualificadora imediatamente'
    });
  }

  // Multiple property interests
  const propertyTypes = lead.preferences?.propertyType;
  if (Array.isArray(propertyTypes) && propertyTypes.length > 1) {
    opportunities.push({
      opportunity: 'Múltiplos interesses imobiliários',
      potential: 'high' as const,
      description: 'Lead interessado em diferentes tipos de propriedade - potencial para múltiplas vendas',
      actionRequired: 'Mapear necessidades específicas para cada tipo de imóvel'
    });
  }

  // Referral potential
  if (lead.demographics?.hasFamily && (lead.score || 0) >= 60) {
    opportunities.push({
      opportunity: 'Potencial de indicação',
      potential: 'medium' as const,
      description: 'Lead qualificado com família - alta chance de indicar outros prospects',
      actionRequired: 'Criar programa de indicação e mencionar após conversão'
    });
  }

  // Seasonal opportunity
  const currentMonth = new Date().getMonth();
  if ([11, 0, 1].includes(currentMonth) && lead.temperature === 'warm') { // Dec, Jan, Feb
    opportunities.push({
      opportunity: 'Oportunidade sazonal',
      potential: 'medium' as const,
      description: 'Período de alta demanda imobiliária - lead warm pode acelerar decisão',
      actionRequired: 'Apresentar vantagens de fechar negócio ainda este verão'
    });
  }

  return opportunities;
}

function predictLeadValue(lead: Lead, allReservations: Reservation[]): number {
  let predictedValue = 0;

  // Base value from price preferences
  const priceRange = lead.preferences?.priceRange;
  if (priceRange) {
    predictedValue = (priceRange.min + priceRange.max) / 2;
  } else {
    // Use average reservation value
    const avgReservationValue = allReservations.reduce((sum, res) => sum + (res.totalPrice || 0), 0) / allReservations.length || 5000;
    predictedValue = avgReservationValue;
  }

  // Adjust based on lead quality
  const scoreMultiplier = 0.5 + ((lead.score || 50) / 100); // 0.5 to 1.5
  predictedValue *= scoreMultiplier;

  // Temperature adjustment
  const tempMultiplier = {
    hot: 1.2,
    warm: 1.0,
    cold: 0.8
  };
  predictedValue *= tempMultiplier[lead.temperature] || 1.0;

  return Math.round(predictedValue);
}

function estimateTimeToConversion(lead: Lead, allLeads: Lead[], allClients: Client[]): number {
  // Find average conversion time for similar leads
  const similarConvertedLeads = allLeads.filter(l => {
    const client = allClients.find(c => c.phone === l.phone);
    return client && 
           l.source === lead.source && 
           l.temperature === lead.temperature &&
           Math.abs((l.score || 0) - (lead.score || 0)) <= 20;
  });

  if (similarConvertedLeads.length > 0) {
    const conversionTimes = similarConvertedLeads.map(l => {
      const client = allClients.find(c => c.phone === l.phone);
      return client ? differenceInDays(client.createdAt?.toDate() || new Date(), l.createdAt?.toDate() || new Date()) : 30;
    });
    
    const avgTime = conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length;
    return Math.round(avgTime);
  }

  // Default estimates based on temperature and status
  const baseTime = {
    hot: 7,
    warm: 21,
    cold: 45
  };

  const statusAdjustment = {
    new: 1.5,
    contacted: 1.2,
    qualified: 0.8,
    nurturing: 1.0,
    proposal_sent: 0.6,
    negotiating: 0.3
  };

  return Math.round((baseTime[lead.temperature] || 30) * (statusAdjustment[lead.status] || 1.0));
}

function calculateConfidenceLevel(lead: Lead, allLeads: Lead[]): number {
  let confidence = 50; // Base confidence

  // More data = higher confidence
  const dataCompleteness = calculateDataCompleteness(lead);
  confidence += dataCompleteness * 0.3;

  // More interactions = higher confidence
  const interactionCount = (lead.interactions || []).length;
  confidence += Math.min(20, interactionCount * 3);

  // Similar leads in dataset improve confidence
  const similarLeadsCount = allLeads.filter(l => 
    l.source === lead.source && 
    l.temperature === lead.temperature
  ).length;
  
  confidence += Math.min(15, similarLeadsCount * 0.5);

  // Recent activity improves confidence
  const lastInteraction = (lead.interactions || [])[lead.interactions?.length - 1];
  if (lastInteraction) {
    const daysSince = differenceInDays(new Date(), lastInteraction.date?.toDate() || new Date());
    if (daysSince <= 3) confidence += 10;
    else if (daysSince <= 7) confidence += 5;
  }

  return Math.max(0, Math.min(100, Math.round(confidence)));
}

function calculateDataCompleteness(lead: Lead): number {
  let completeness = 0;
  const fields = [
    'name', 'phone', 'email', 'source', 'status', 'temperature', 
    'score', 'preferences', 'budget', 'demographics'
  ];
  
  fields.forEach(field => {
    if (lead[field as keyof Lead]) completeness += 10;
  });
  
  return completeness;
}

function analyzeBehavior(lead: Lead): {
  engagementLevel: 'high' | 'medium' | 'low';
  responsePattern: string;
  preferredTime: string;
  preferredChannel: string;
  buyingSignals: string[];
  redFlags: string[];
} {
  const interactions = lead.interactions || [];
  
  // Calculate engagement level
  const positiveInteractions = interactions.filter(i => i.response === 'positive').length;
  const totalInteractions = interactions.length;
  const engagementRate = totalInteractions > 0 ? positiveInteractions / totalInteractions : 0;
  
  const engagementLevel = engagementRate > 0.7 ? 'high' : 
                         engagementRate > 0.4 ? 'medium' : 'low';

  // Analyze response pattern
  const responsePattern = totalInteractions === 0 ? 'Sem histórico' :
                         engagementRate > 0.8 ? 'Sempre engajado' :
                         engagementRate > 0.6 ? 'Geralmente responsivo' :
                         engagementRate > 0.3 ? 'Seletivamente responsivo' : 'Pouco responsivo';

  // Determine preferred contact time and channel
  const preferredTime = lead.preferences?.preferredContactTime || 'manhã';
  const preferredChannel = (lead.preferredContactMethods || ['whatsapp'])[0];

  // Identify buying signals
  const buyingSignals = [];
  if ((lead.score || 0) >= 70) buyingSignals.push('Score alto');
  if (lead.temperature === 'hot') buyingSignals.push('Interesse demonstrado');
  if (lead.scheduledFollowUp) buyingSignals.push('Agendamento de follow-up');
  if (lead.budget && lead.budget > 0) buyingSignals.push('Orçamento definido');
  if (interactions.some(i => i.type === 'visit_request')) buyingSignals.push('Solicitou visita');

  // Identify red flags
  const redFlags = [];
  if (engagementLevel === 'low') redFlags.push('Baixo engajamento');
  if (interactions.filter(i => i.response === 'negative').length >= 3) redFlags.push('Múltiplas respostas negativas');
  const daysSinceLastContact = interactions.length > 0 ? 
    differenceInDays(new Date(), interactions[interactions.length - 1].date?.toDate() || new Date()) : 0;
  if (daysSinceLastContact > 14) redFlags.push('Muito tempo sem contato');

  return {
    engagementLevel,
    responsePattern,
    preferredTime,
    preferredChannel,
    buyingSignals,
    redFlags
  };
}

function analyzeCompetitivePosition(lead: Lead): {
  likelyCompetitors: string[];
  differentiators: string[];
  pricingStrategy: string;
  urgencyFactors: string[];
} {
  // Mock competitive analysis - in real implementation this would be more sophisticated
  const likelyCompetitors = ['Imobiliária Local A', 'Portal Imobiliário B', 'Corretor Independente'];
  
  const differentiators = [
    'Atendimento personalizado via WhatsApp',
    'Visitas virtuais em 360°',
    'Processo de aprovação rápido',
    'Consultoria de investimento'
  ];

  const pricingStrategy = (lead.budget && lead.preferences?.priceRange?.max && lead.budget < lead.preferences.priceRange.max) ? 
    'Apresentar opções dentro do orçamento primeiro' :
    'Focar no valor agregado dos serviços';

  const urgencyFactors = [];
  const currentMonth = new Date().getMonth();
  if ([11, 0, 1].includes(currentMonth)) urgencyFactors.push('Alta temporada imobiliária');
  if (lead.temperature === 'hot') urgencyFactors.push('Lead demonstra urgência');
  if (lead.demographics?.hasFamily) urgencyFactors.push('Necessidade familiar pode ser urgente');

  return {
    likelyCompetitors,
    differentiators,
    pricingStrategy,
    urgencyFactors
  };
}

function generatePersonalizationInsights(lead: Lead): {
  communicationStyle: 'formal' | 'casual' | 'technical';
  interests: string[];
  painPoints: string[];
  motivators: string[];
  preferredContent: string[];
} {
  // Analyze communication style based on interactions
  const interactions = lead.interactions || [];
  const formalKeywords = ['senhor', 'senhora', 'obrigado', 'gostaria'];
  const casualKeywords = ['oi', 'tudo bem', 'beleza', 'valeu'];
  const technicalKeywords = ['especificações', 'metragem', 'documentação', 'financiamento'];

  let communicationStyle: 'formal' | 'casual' | 'technical' = 'casual'; // default
  
  const messageContent = interactions.map(i => i.description || '').join(' ').toLowerCase();
  if (technicalKeywords.some(keyword => messageContent.includes(keyword))) {
    communicationStyle = 'technical';
  } else if (formalKeywords.some(keyword => messageContent.includes(keyword))) {
    communicationStyle = 'formal';
  }

  // Generate interests based on preferences and behavior
  const interests = [];
  if (lead.preferences?.propertyType?.includes('apartment')) interests.push('Apartamentos');
  if (lead.preferences?.propertyType?.includes('house')) interests.push('Casas');
  if (lead.preferences?.location) interests.push(`Região: ${lead.preferences.location}`);
  if (lead.demographics?.hasFamily) interests.push('Imóveis familiares');

  // Identify likely pain points
  const painPoints = [];
  if (!lead.budget || lead.budget === 0) painPoints.push('Indefinição orçamentária');
  if (lead.status === 'nurturing') painPoints.push('Dúvidas sobre o processo');
  if (interactions.some(i => i.description?.includes('financiamento'))) painPoints.push('Questões de financiamento');

  // Determine motivators
  const motivators = [];
  if (lead.temperature === 'hot') motivators.push('Urgência de mudança');
  if (lead.demographics?.hasFamily) motivators.push('Bem-estar da família');
  if (lead.preferences?.priceRange?.max && lead.preferences.priceRange.max > 500000) motivators.push('Status e prestígio');
  else motivators.push('Valor pelo dinheiro');

  // Suggest preferred content types
  const preferredContent = [];
  if (communicationStyle === 'technical') {
    preferredContent.push('Plantas e especificações técnicas', 'Comparativos de mercado', 'Análises de investimento');
  } else if (communicationStyle === 'formal') {
    preferredContent.push('Relatórios detalhados', 'Documentação completa', 'Apresentações estruturadas');
  } else {
    preferredContent.push('Fotos e vídeos dos imóveis', 'Tours virtuais', 'Mensagens rápidas e objetivas');
  }

  return {
    communicationStyle,
    interests,
    painPoints,
    motivators,
    preferredContent
  };
}