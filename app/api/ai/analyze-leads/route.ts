import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Lead } from '@/lib/types/crm';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  // Initialize OpenAI client inside the function to avoid build-time execution
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  try {
    const { leads } = await request.json();

    if (!leads || !Array.isArray(leads)) {
      return NextResponse.json(
        { error: 'Invalid leads data' },
        { status: 400 }
      );
    }

    logger.info('Analyzing leads with AI', { leadCount: leads.length });

    // Prepare leads data for AI analysis
    const leadsForAnalysis = leads.map((lead: Lead) => ({
      id: lead.id,
      name: lead.name,
      status: lead.status,
      temperature: lead.temperature,
      score: lead.score,
      totalInteractions: lead.totalInteractions,
      qualificationCriteria: lead.qualificationCriteria,
      preferences: lead.preferences,
      source: lead.source,
      createdAt: lead.createdAt,
      lastContactDate: lead.lastContactDate,
      tags: lead.tags,
    }));

    const analysisPrompt = `
    Analyze the following leads and provide insights for each lead. Return a JSON array with analysis for each lead.

    For each lead, calculate:
    1. conversionProbability (0-100): Based on temperature, score, interactions, and qualification criteria
    2. nextBestAction: One of ['follow_up', 'schedule_viewing', 'send_proposal', 'initial_contact', 'close_deal', 'nurture']
    3. actionReason: Brief explanation for the recommended action
    4. riskFactors: Array of potential risks (max 3)
    5. opportunities: Array of opportunities (max 3)
    6. estimatedValue: Potential revenue in BRL
    7. daysToConversion: Estimated days until conversion

    Leads data: ${JSON.stringify(leadsForAnalysis)}

    Consider:
    - Hot leads have higher conversion probability
    - More interactions indicate better engagement
    - Qualified leads (with budget, need, authority, timeline) are more likely to convert
    - Recent last contact is positive
    - Source 'referral' is higher quality
    - Different statuses require different actions

    Return only valid JSON array without explanation.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert CRM analyst. Analyze leads and provide actionable insights. Always return valid JSON."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const analysisResult = completion.choices[0]?.message?.content;

    if (!analysisResult) {
      throw new Error('No analysis result from AI');
    }

    // Parse AI response
    let analyzedLeads;
    try {
      analyzedLeads = JSON.parse(analysisResult);
    } catch (parseError) {
      logger.error('Failed to parse AI analysis result', parseError);
      // Fallback to basic analysis
      analyzedLeads = leads.map((lead: Lead) => ({
        lead,
        conversionProbability: Math.min(Math.max(lead.score + (lead.temperature === 'hot' ? 20 : lead.temperature === 'warm' ? 10 : -10), 0), 100),
        nextBestAction: getBasicNextAction(lead),
        actionReason: 'Análise básica baseada nos dados do lead',
        riskFactors: getBasicRiskFactors(lead),
        opportunities: getBasicOpportunities(lead),
        estimatedValue: getBasicEstimatedValue(lead),
        daysToConversion: getBasicDaysToConversion(lead),
      }));
    }

    // Ensure analyzedLeads has the lead object for each analysis
    const enrichedAnalysis = analyzedLeads.map((analysis: any, index: number) => ({
      ...analysis,
      lead: leads[index], // Add the original lead object
    }));

    logger.info('AI lead analysis completed', { 
      analyzedCount: enrichedAnalysis.length,
      avgConversionProbability: enrichedAnalysis.reduce((sum: number, a: any) => sum + a.conversionProbability, 0) / enrichedAnalysis.length
    });

    return NextResponse.json(enrichedAnalysis);

  } catch (error) {
    logger.error('Error in AI lead analysis', error);
    
    return NextResponse.json(
      { error: 'Failed to analyze leads' },
      { status: 500 }
    );
  }
}

// Fallback functions for basic analysis
function getBasicNextAction(lead: Lead): string {
  const daysSinceLastContact = Math.floor(
    (new Date().getTime() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceLastContact > 7) return 'follow_up';
  if (lead.status === 'qualified') return 'schedule_viewing';
  if (lead.temperature === 'hot' && lead.status === 'opportunity') return 'send_proposal';
  if (lead.totalInteractions < 2) return 'initial_contact';
  if (lead.status === 'negotiation') return 'close_deal';
  
  return 'nurture';
}

function getBasicRiskFactors(lead: Lead): string[] {
  const risks: string[] = [];
  const daysSinceLastContact = Math.floor(
    (new Date().getTime() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceLastContact > 14) risks.push('Muito tempo sem contato');
  if (lead.temperature === 'cold') risks.push('Lead frio');
  if (!lead.qualificationCriteria.budget) risks.push('Sem orçamento definido');
  
  return risks.slice(0, 3);
}

function getBasicOpportunities(lead: Lead): string[] {
  const opportunities: string[] = [];
  
  if (lead.temperature === 'hot') opportunities.push('Lead quente');
  if (lead.qualificationCriteria.budget && lead.qualificationCriteria.need) {
    opportunities.push('Qualificado com orçamento');
  }
  if (lead.source === 'referral') opportunities.push('Indicação');
  
  return opportunities.slice(0, 3);
}

function getBasicEstimatedValue(lead: Lead): number {
  if (lead.preferences.priceRange) {
    const avgPrice = (lead.preferences.priceRange.min + lead.preferences.priceRange.max) / 2;
    return avgPrice * 12; // Annual value
  }
  return 5000; // Default estimate
}

function getBasicDaysToConversion(lead: Lead): number {
  if (lead.temperature === 'hot') return 15;
  if (lead.temperature === 'warm') return 30;
  return 45;
}