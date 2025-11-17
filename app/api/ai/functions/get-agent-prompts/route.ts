/**
 * GET AGENT PROMPTS - AI Function
 *
 * Gera prompts dinâmicos personalizados baseados nas configurações do tenant
 * Cada agente (router, search, booking, sales, support) recebe instruções específicas
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, doc, getDoc } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import {
  NegotiationSettings,
  DEFAULT_NEGOTIATION_SETTINGS
} from '@/lib/types/tenant-settings';

// Validation schema
const GetAgentPromptsSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),
  agentType: z.enum([
    'router',      // Roteador inicial que decide qual agente especializado usar
    'search',      // Busca de propriedades
    'booking',     // Reservas e agendamentos
    'sales',       // Negociação e vendas
    'support',     // Suporte geral
    'all'          // Retorna prompts de todos os agentes
  ]).optional().default('all')
});

interface AgentPrompts {
  router?: string;
  search?: string;
  booking?: string;
  sales?: string;
  support?: string;
}

/**
 * POST /api/ai/functions/get-agent-prompts
 * N8N Sofia AI retrieves dynamic prompts based on tenant configuration
 *
 * @example
 * {
 *   "tenantId": "tenant123",
 *   "agentType": "sales"
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `get_agent_prompts_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    logger.info('[GET-AGENT-PROMPTS] Starting execution', {
      requestId,
      function: 'get-agent-prompts'
    });

    // Parse and validate
    const body = await request.json();
    const validation = GetAgentPromptsSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('[GET-AGENT-PROMPTS] Validation failed', {
        requestId,
        errors: validation.error.errors
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: validation.error.errors,
          requestId
        },
        { status: 400 }
      );
    }

    const { tenantId, agentType } = validation.data;

    logger.info('[GET-AGENT-PROMPTS] Fetching configurations', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      agentType
    });

    // Fetch all necessary configurations
    const [aiConfigDoc, negotiationDoc, policiesDoc, companyDoc] = await Promise.all([
      getDoc(doc(collection(doc(collection(db, 'tenants'), tenantId), 'settings'), 'aiConfig')),
      getDoc(doc(collection(doc(collection(db, 'tenants'), tenantId), 'settings'), 'negotiation')),
      getDoc(doc(collection(doc(collection(db, 'tenants'), tenantId), 'settings'), 'policies')),
      getDoc(doc(collection(doc(collection(db, 'tenants'), tenantId), 'settings'), 'company'))
    ]);

    // Extract configurations
    const aiConfig = aiConfigDoc.exists() ? aiConfigDoc.data() : {};
    const negotiation: NegotiationSettings = negotiationDoc.exists()
      ? (negotiationDoc.data() as NegotiationSettings)
      : DEFAULT_NEGOTIATION_SETTINGS;
    const policies = policiesDoc.exists() ? policiesDoc.data() : {};
    const company = companyDoc.exists() ? companyDoc.data() : {};

    // Agent behavior settings
    const agentBehavior = aiConfig?.agentBehavior || {};
    const searchConfig = agentBehavior.search || {};
    const bookingConfig = agentBehavior.booking || {};
    const supportConfig = agentBehavior.support || {};

    // Build prompts
    const prompts: AgentPrompts = {};

    // ROUTER AGENT PROMPT
    if (agentType === 'all' || agentType === 'router') {
      const availableAgents = [];
      if (searchConfig.maxPropertiesPerSearch > 0) availableAgents.push('search_agent');
      if (bookingConfig.requireEmail !== undefined) availableAgents.push('booking_agent');
      if (negotiation.allowAINegotiation) availableAgents.push('sales_agent');
      if (supportConfig.allowCancellations || supportConfig.allowModifications) availableAgents.push('support_agent');

      prompts.router = `# ROUTER AGENT - ${company.name || 'Imobiliária'}

Você é o agente roteador da Sofia AI para ${company.name || 'nossa imobiliária'}.

## SUA MISSÃO
Analisar a mensagem do cliente e decidir qual agente especializado deve atender.

## AGENTES DISPONÍVEIS
${availableAgents.map(agent => `- ${agent}`).join('\n')}

${!negotiation.allowAINegotiation ? '⚠️ **IMPORTANTE**: O sales_agent está DESABILITADO. NÃO ofereça negociações de preço.' : ''}
${!bookingConfig.autoScheduleKeyPickup ? '⚠️ **IMPORTANTE**: NÃO agende retirada de chaves automaticamente.' : ''}

## REGRAS DE ROTEAMENTO
- Busca de imóveis → search_agent
- Reserva/agendamento → booking_agent
${negotiation.allowAINegotiation ? '- Negociação de preço → sales_agent' : '- Negociação de preço → Informe que os preços são fixos'}
- Suporte/dúvidas → support_agent

${company.description ? `\n## SOBRE A EMPRESA\n${company.description}` : ''}
`;
    }

    // SEARCH AGENT PROMPT
    if (agentType === 'all' || agentType === 'search') {
      prompts.search = `# SEARCH AGENT - Busca de Propriedades

## CONFIGURAÇÕES ATIVAS
- Máximo de propriedades por busca: ${searchConfig.maxPropertiesPerSearch || 3}
- Enviar fotos automaticamente: ${searchConfig.autoSendPhotos ? 'SIM' : 'NÃO'}
- Enviar mapa automaticamente: ${searchConfig.autoSendMap ? 'SIM' : 'NÃO'}

## INSTRUÇÕES
1. Use a função \`search-properties\` para buscar imóveis
2. ${searchConfig.autoSendPhotos ? 'Após apresentar os imóveis, use \`send-property-media\` para enviar fotos' : 'NÃO envie fotos automaticamente, pergunte se o cliente deseja visualizar'}
3. ${searchConfig.autoSendMap ? 'Use \`send-property-map\` para mostrar a localização' : 'Apenas descreva a localização, não envie mapas'}
4. Limite-se a apresentar até ${searchConfig.maxPropertiesPerSearch} propriedades por vez

${negotiation.allowSuggestAlternatives ? '✅ Se o cliente achar caro, você PODE sugerir alternativas mais econômicas.' : '❌ NÃO sugira alternativas mais baratas, mantenha foco nas propriedades originais.'}

## POLÍTICAS IMPORTANTES
- Check-in: ${policies.checkInTime || '14:00'}
- Check-out: ${policies.checkOutTime || '12:00'}
- Estadia mínima: ${policies.minimumStay || 1} dia(s)
${policies.petPolicy === 'allowed' ? '- Aceita pets ✅' : '- Não aceita pets ❌'}
`;
    }

    // BOOKING AGENT PROMPT
    if (agentType === 'all' || agentType === 'booking') {
      prompts.booking = `# BOOKING AGENT - Reservas e Agendamentos

## DADOS OBRIGATÓRIOS
- Nome completo: OBRIGATÓRIO
- Telefone: OBRIGATÓRIO
${bookingConfig.requireEmail ? '- Email: OBRIGATÓRIO' : '- Email: OPCIONAL'}
${bookingConfig.requireDocument ? '- CPF/Documento: OBRIGATÓRIO' : '- CPF/Documento: OPCIONAL'}

## PROCESSO DE RESERVA
1. Colete TODOS os dados obrigatórios antes de criar a reserva
2. Confirme datas (check-in e check-out)
3. Valide disponibilidade com \`check-availability\`
4. Use \`create-reservation\` para confirmar
${bookingConfig.autoScheduleKeyPickup ? '5. Agende automaticamente a retirada de chaves com \`schedule-meeting\`' : '5. NÃO agende retirada de chaves automaticamente, pergunte ao cliente'}

## POLÍTICAS DE CANCELAMENTO
${policies.cancellationPolicy === 'flexible' ? '✅ Cancelamento flexível - reembolso integral até 24h antes' : ''}
${policies.cancellationPolicy === 'moderate' ? '⚠️ Cancelamento moderado - reembolso 50% até 5 dias antes' : ''}
${policies.cancellationPolicy === 'strict' ? '❌ Cancelamento estrito - sem reembolso' : ''}

${policies.cancellationDetails ? `\nDetalhes: ${JSON.stringify(policies.cancellationDetails)}` : ''}

## CONTATO DA EMPRESA
${company.phone ? `📞 Telefone: ${company.phone}` : ''}
${company.email ? `📧 Email: ${company.email}` : ''}
${company.address?.street ? `📍 Endereço: ${company.address.street}, ${company.address.city}` : ''}
`;
    }

    // SALES AGENT PROMPT
    if (agentType === 'all' || agentType === 'sales') {
      if (!negotiation.allowAINegotiation) {
        prompts.sales = `# SALES AGENT - DESABILITADO

⚠️ **O agente de vendas está DESABILITADO para este tenant.**

NÃO negocie preços. Apresente valores fixos e justifique com:
${negotiation.priceJustifications?.map(j => `- ${j}`).join('\n') || '- Preços baseados no mercado'}

${negotiation.negotiationNotes || ''}
`;
      } else {
        prompts.sales = `# SALES AGENT - Negociação e Vendas

## POLÍTICA DE DESCONTOS
Desconto máximo total permitido: **${negotiation.maxDiscountPercentage}%**

### Descontos por Método de Pagamento
${negotiation.pixDiscountEnabled ? `✅ PIX: ${negotiation.pixDiscountPercentage}% de desconto` : '❌ PIX: sem desconto especial'}
${negotiation.cashDiscountEnabled ? `✅ Dinheiro: ${negotiation.cashDiscountPercentage}% de desconto` : '❌ Dinheiro: sem desconto especial'}

### Parcelamento
${negotiation.installmentEnabled ? `✅ Até ${negotiation.maxInstallments}x sem juros (parcela mínima: R$ ${negotiation.minInstallmentValue})` : '❌ Parcelamento não disponível'}

### Descontos por Estadia Prolongada
${negotiation.extendedStayDiscountEnabled ? negotiation.extendedStayRules?.map(rule =>
          `- ${rule.minDays}+ dias: ${rule.discountPercentage}% de desconto`
        ).join('\n') : '❌ Sem desconto por estadia prolongada'}

### Desconto por Reserva Imediata
${negotiation.bookNowDiscountEnabled ? `✅ ${negotiation.bookNowDiscountPercentage}% para fechar em até ${negotiation.bookNowTimeLimit}h` : '❌ Não disponível'}

## FUNÇÕES DISPONÍVEIS
- \`calculate-dynamic-discount\`: Calcula desconto personalizado
- \`check-discount-opportunities\`: Lista todas as oportunidades de desconto
- \`get-negotiation-settings\`: Busca configurações atualizadas

## JUSTIFICATIVAS DE PREÇO
Quando o cliente questionar o valor, use:
${negotiation.priceJustifications?.map(j => `- ${j}`).join('\n') || '- Localização privilegiada\n- Imóvel em excelente estado'}

${negotiation.upsellEnabled ? `\n## UPSELLING\n✅ Você PODE sugerir extras:\n${negotiation.upsellSuggestions?.map(s => `- ${s}`).join('\n') || ''}` : '\n❌ NÃO faça upselling'}

${negotiation.negotiationNotes ? `\n## OBSERVAÇÕES IMPORTANTES\n${negotiation.negotiationNotes}` : ''}

**REGRA DE OURO**: NUNCA ultrapasse ${negotiation.maxDiscountPercentage}% de desconto total acumulado.
`;
      }
    }

    // SUPPORT AGENT PROMPT
    if (agentType === 'all' || agentType === 'support') {
      prompts.support = `# SUPPORT AGENT - Suporte e Atendimento

## PERMISSÕES
${supportConfig.allowCancellations ? '✅ Você PODE processar cancelamentos' : '❌ NÃO processe cancelamentos, encaminhe para atendimento humano'}
${supportConfig.allowModifications ? '✅ Você PODE modificar reservas' : '❌ NÃO modifique reservas, encaminhe para atendimento humano'}

## TRANSFERÊNCIA PARA HUMANO
${supportConfig.autoTransferThreshold ? `Após ${supportConfig.autoTransferThreshold} mensagens sem resolução, OFEREÇA transferir para atendimento humano.` : 'Mantenha o atendimento automatizado sempre que possível.'}

## FUNÇÕES DISPONÍVEIS
${supportConfig.allowCancellations ? '- `cancel-reservation`: Cancelar reserva' : ''}
${supportConfig.allowModifications ? '- `modify-reservation`: Modificar datas/hóspedes' : ''}
- \`get-policies\`: Consultar políticas
- \`get-company-address\`: Informações da empresa

## POLÍTICAS
${policies.houseRules?.length ? `\n### Regras da Casa\n${policies.houseRules.map((r: string) => `- ${r}`).join('\n')}` : ''}

${policies.petPolicy === 'allowed' ? '🐕 Pets são permitidos' : '🚫 Pets não são permitidos'}
${policies.smokingPolicy === 'not_allowed' ? '🚭 Proibido fumar' : ''}

## CONTATO PARA ESCALAÇÃO
${company.phone ? `📞 ${company.phone}` : ''}
${company.email ? `📧 ${company.email}` : ''}
`;
    }

    const processingTime = Date.now() - startTime;

    logger.info('[GET-AGENT-PROMPTS] Prompts generated successfully', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      agentsGenerated: Object.keys(prompts),
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json({
      success: true,
      data: {
        tenantId,
        agentType,
        prompts,
        generatedAt: new Date().toISOString(),
        configurations: {
          aiEnabled: aiConfig?.enabled ?? true,
          negotiationEnabled: negotiation.allowAINegotiation,
          autoResponse: aiConfig?.autoResponse ?? true
        }
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[GET-AGENT-PROMPTS] Execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate agent prompts',
        requestId,
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/functions/get-agent-prompts
 * Health check and function info
 */
export async function GET() {
  return NextResponse.json({
    function: 'get-agent-prompts',
    version: '1.0.0',
    description: 'Generates dynamic agent prompts based on tenant configuration',
    status: 'operational',
    parameters: {
      required: ['tenantId'],
      optional: ['agentType']
    },
    agentTypes: [
      'router - Routes to specialized agents',
      'search - Property search and presentation',
      'booking - Reservations and appointments',
      'sales - Price negotiation and discounts',
      'support - General support and modifications',
      'all - All agent prompts (default)'
    ],
    returns: {
      prompts: 'object - Dynamic prompts for each agent',
      configurations: 'object - Active configuration summary',
      generatedAt: 'ISO timestamp'
    },
    timestamp: new Date().toISOString()
  });
}
