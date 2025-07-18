import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { conversationService } from '@/lib/services/conversation-service';
import { differenceInDays } from 'date-fns';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { leads, leadId } = await request.json();

    if (leadId) {
      // Analyze single lead
      const lead = leads.find((l: any) => l.id === leadId);
      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }

      const analysis = await analyzeSingleLead(lead);
      return NextResponse.json(analysis);
    } else {
      // Analyze all leads
      const analyses = await Promise.all(
        leads.map(async (lead: any) => {
          try {
            const analysis = await analyzeSingleLead(lead);
            return { lead, ...analysis };
          } catch (error) {
            console.error(`Error analyzing lead ${lead.id}:`, error);
            return {
              lead,
              ...getFallbackAnalysis(lead)
            };
          }
        })
      );

      return NextResponse.json(analyses);
    }
  } catch (error) {
    console.error('Error in AI analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function analyzeSingleLead(lead: any) {
  try {
    // Get conversation history
    const conversationHistory = await getLeadConversationHistory(lead.id);
    
    // Perform AI analysis
    const prompt = `
Analise este lead imobiliário e forneça insights baseados no histórico de conversas:

Lead: ${JSON.stringify({
  name: lead.name,
  status: lead.status,
  score: lead.score,
  temperature: lead.temperature,
  preferences: lead.preferences,
  tags: lead.tags,
  totalInteractions: lead.totalInteractions,
  lastContactDate: lead.lastContactDate,
  qualificationCriteria: lead.qualificationCriteria
})}

Histórico de Conversas: ${JSON.stringify(conversationHistory.slice(-10))}

Forneça uma análise em JSON com:
{
  "conversionProbability": número entre 0-100,
  "nextBestAction": "ação específica recomendada",
  "actionReason": "explicação da ação",
  "riskFactors": ["lista de riscos"],
  "opportunities": ["lista de oportunidades"],
  "estimatedValue": valor estimado da transação,
  "daysToConversion": dias estimados para conversão
}

Responda APENAS com o JSON válido, sem texto adicional.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em análise de leads imobiliários. Responda apenas com JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from AI');
    }

    // Parse AI response
    const parsedAnalysis = JSON.parse(response);
    
    return {
      conversionProbability: Math.min(100, Math.max(0, parsedAnalysis.conversionProbability || 50)),
      nextBestAction: parsedAnalysis.nextBestAction || 'Acompanhar lead',
      actionReason: parsedAnalysis.actionReason || 'Análise baseada no histórico',
      riskFactors: Array.isArray(parsedAnalysis.riskFactors) ? parsedAnalysis.riskFactors : [],
      opportunities: Array.isArray(parsedAnalysis.opportunities) ? parsedAnalysis.opportunities : [],
      estimatedValue: parsedAnalysis.estimatedValue || 0,
      daysToConversion: parsedAnalysis.daysToConversion || 30
    };
  } catch (error) {
    console.error('Error in AI analysis:', error);
    // Return fallback analysis
    return getFallbackAnalysis(lead);
  }
}

function getFallbackAnalysis(lead: any) {
  return {
    conversionProbability: calculateConversionProbability(lead),
    nextBestAction: determineNextBestAction(lead),
    actionReason: getActionReason(lead),
    riskFactors: identifyRiskFactors(lead),
    opportunities: identifyOpportunities(lead),
    estimatedValue: estimateLeadValue(lead),
    daysToConversion: estimateDaysToConversion(lead),
  };
}

async function getLeadConversationHistory(leadId: string) {
  try {
    // Get conversations associated with this lead
    const conversations = await conversationService.getMany([
      { field: 'leadId', operator: '==', value: leadId }
    ]);
    
    if (conversations.length === 0) return [];
    
    // Get messages for each conversation
    const allMessages = await Promise.all(
      conversations.map(conv => 
        (conversationService as any).getMessagesByConversation(conv.id)
      )
    );
    
    return allMessages.flat().sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }
}

function calculateConversionProbability(lead: any): number {
  let probability = lead.score;

  // Adjust based on temperature
  if (lead.temperature === 'hot') probability += 15;
  else if (lead.temperature === 'warm') probability += 5;
  else probability -= 10;

  // Adjust based on interactions
  if (lead.totalInteractions > 5) probability += 10;
  else if (lead.totalInteractions > 2) probability += 5;

  // Adjust based on qualification criteria
  const qualificationScore = Object.values(lead.qualificationCriteria || {}).filter(v => v).length;
  probability += qualificationScore * 5;

  // Adjust based on days in pipeline
  const daysInPipeline = differenceInDays(new Date(), new Date(lead.createdAt));
  if (daysInPipeline > 30) probability -= 10;
  else if (daysInPipeline < 7) probability += 5;

  return Math.min(Math.max(probability, 0), 100);
}

function determineNextBestAction(lead: any): string {
  const daysSinceLastContact = differenceInDays(new Date(), new Date(lead.lastContactDate));
  
  if (daysSinceLastContact > 7) return 'follow_up';
  if (lead.status === 'qualified' && !(lead as any).propertyViewings?.length) return 'schedule_viewing';
  if (lead.temperature === 'hot' && lead.status === 'opportunity') return 'send_proposal';
  if (lead.totalInteractions < 2) return 'initial_contact';
  if (lead.status === 'negotiation') return 'close_deal';
  
  return 'nurture';
}

function getActionReason(lead: any): string {
  const action = determineNextBestAction(lead);
  const daysSinceLastContact = differenceInDays(new Date(), new Date(lead.lastContactDate));

  switch (action) {
    case 'follow_up':
      return `Sem contato há ${daysSinceLastContact} dias`;
    case 'schedule_viewing':
      return 'Lead qualificado pronto para visita';
    case 'send_proposal':
      return 'Alta probabilidade de conversão';
    case 'initial_contact':
      return 'Novo lead aguardando primeiro contato';
    case 'close_deal':
      return 'Em negociação - momento de fechar';
    case 'nurture':
      return 'Manter relacionamento ativo';
    default:
      return 'Ação recomendada';
  }
}

function identifyRiskFactors(lead: any): string[] {
  const risks: string[] = [];
  const daysSinceLastContact = differenceInDays(new Date(), new Date(lead.lastContactDate));
  
  if (daysSinceLastContact > 14) risks.push('Muito tempo sem contato');
  if (lead.temperature === 'cold') risks.push('Lead frio - baixo interesse');
  if (!lead.qualificationCriteria?.budget) risks.push('Orçamento não definido');
  if (!lead.qualificationCriteria?.timeline) risks.push('Sem prazo definido');
  if (lead.totalInteractions < 2) risks.push('Pouca interação');
  
  return risks;
}

function identifyOpportunities(lead: any): string[] {
  const opportunities: string[] = [];
  
  if (lead.temperature === 'hot') opportunities.push('Lead quente - alto interesse');
  if (lead.qualificationCriteria?.budget && lead.qualificationCriteria?.need) {
    opportunities.push('Qualificado com orçamento');
  }
  if (lead.preferences?.moveInDate) {
    const daysToMove = differenceInDays(new Date(lead.preferences.moveInDate), new Date());
    if (daysToMove < 30) opportunities.push('Urgência para mudança');
  }
  if (lead.source === 'referral') opportunities.push('Indicação - maior confiança');
  
  return opportunities;
}

function estimateLeadValue(lead: any): number {
  if (lead.preferences?.priceRange) {
    const avgPrice = (lead.preferences.priceRange.min + lead.preferences.priceRange.max) / 2;
    const months = 12; // Assuming annual contract
    return avgPrice * months * (calculateConversionProbability(lead) / 100);
  }
  return 0;
}

function estimateDaysToConversion(lead: any): number {
  const basedays = 30;
  let days = basedays;
  
  if (lead.temperature === 'hot') days -= 15;
  else if (lead.temperature === 'cold') days += 15;
  
  if (lead.qualificationCriteria?.timeline) days -= 10;
  if (lead.status === 'negotiation') days = 7;
  if (lead.status === 'opportunity') days = 14;
  
  return Math.max(days, 1);
}