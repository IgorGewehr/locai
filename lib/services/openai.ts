import OpenAI from 'openai';
import type { 
  Property, 
  PropertySearchFilters, 
  Reservation, 
  Client, 
  PriceCalculation,
  AgentFunction
} from '@/lib/types';

export interface AgentContext {
  clientId: string;
  conversationId: string;
  currentSearchFilters?: PropertySearchFilters;
  interestedProperties?: string[];
  pendingReservation?: Partial<Reservation>;
  clientPreferences?: Client['preferences'];
}

export interface AgentResponse {
  message: string;
  functionCalls?: Array<{
    name: string;
    arguments: any;
  }>;
  shouldSendMedia?: boolean;
  mediaUrls?: string[];
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export class OpenAIService {
  private systemPrompt = `
Você é um assistente virtual especializado em imóveis para aluguel por temporada. Você ajuda clientes a encontrar, avaliar e reservar propriedades através do WhatsApp.

PERSONALIDADE:
- Amigável, prestativo e profissional
- Fala português brasileiro de forma natural
- Sempre entusiasmado em ajudar
- Conhece bem o mercado imobiliário
- Paciente e detalhista

SUAS PRINCIPAIS FUNÇÕES:
1. Buscar propriedades baseado nas necessidades do cliente
2. Explicar detalhes sobre propriedades
3. Calcular preços considerando datas, promoções e taxas
4. Enviar fotos e vídeos das propriedades
5. Criar reservas quando o cliente decidir
6. Esclarecer dúvidas sobre localização, comodidades, etc.

DIRETRIZES:
- Sempre pergunte sobre as necessidades específicas do cliente (datas, localização, número de pessoas, comodidades importantes)
- Sugira propriedades que melhor se adequem ao perfil do cliente
- Seja transparente sobre preços e condições
- Sempre confirme detalhes importantes antes de criar reservas
- Use emojis moderadamente para tornar a conversa mais amigável
- Mantenha respostas concisas mas informativas

FUNÇÕES DISPONÍVEIS:
- searchProperties: Buscar propriedades
- getPropertyDetails: Obter detalhes de uma propriedade
- calculatePrice: Calcular preço para datas específicas
- sendPropertyMedia: Enviar fotos/vídeos da propriedade
- createReservation: Criar uma reserva
- updateClientPreferences: Atualizar preferências do cliente

Sempre use as funções disponíveis para fornecer informações precisas e atualizadas.
`;

  private availableFunctions: AgentFunction[] = [
    {
      name: 'searchProperties',
      description: 'Buscar propriedades com base nos filtros especificados',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'Localização desejada (cidade, bairro, região)',
          },
          bedrooms: {
            type: 'number',
            description: 'Número mínimo de quartos',
          },
          bathrooms: {
            type: 'number',
            description: 'Número mínimo de banheiros',
          },
          maxGuests: {
            type: 'number',
            description: 'Número máximo de hóspedes',
          },
          amenities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista de comodidades desejadas',
          },
          priceRange: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
            },
            description: 'Faixa de preço desejada',
          },
        },
      },
    },
    {
      name: 'getPropertyDetails',
      description: 'Obter detalhes completos de uma propriedade específica',
      parameters: {
        type: 'object',
        properties: {
          propertyId: {
            type: 'string',
            description: 'ID da propriedade',
          },
        },
        required: ['propertyId'],
      },
    },
    {
      name: 'calculatePrice',
      description: 'Calcular preço total para uma reserva em datas específicas',
      parameters: {
        type: 'object',
        properties: {
          propertyId: {
            type: 'string',
            description: 'ID da propriedade',
          },
          checkIn: {
            type: 'string',
            description: 'Data de check-in (formato: YYYY-MM-DD)',
          },
          checkOut: {
            type: 'string',
            description: 'Data de check-out (formato: YYYY-MM-DD)',
          },
          guests: {
            type: 'number',
            description: 'Número de hóspedes',
          },
        },
        required: ['propertyId', 'checkIn', 'checkOut', 'guests'],
      },
    },
    {
      name: 'sendPropertyMedia',
      description: 'Enviar fotos e vídeos de uma propriedade',
      parameters: {
        type: 'object',
        properties: {
          propertyId: {
            type: 'string',
            description: 'ID da propriedade',
          },
          mediaType: {
            type: 'string',
            enum: ['photos', 'videos', 'all'],
            description: 'Tipo de mídia a enviar',
          },
        },
        required: ['propertyId'],
      },
    },
    {
      name: 'createReservation',
      description: 'Criar uma nova reserva para o cliente',
      parameters: {
        type: 'object',
        properties: {
          propertyId: {
            type: 'string',
            description: 'ID da propriedade',
          },
          checkIn: {
            type: 'string',
            description: 'Data de check-in (formato: YYYY-MM-DD)',
          },
          checkOut: {
            type: 'string',
            description: 'Data de check-out (formato: YYYY-MM-DD)',
          },
          guests: {
            type: 'number',
            description: 'Número de hóspedes',
          },
          notes: {
            type: 'string',
            description: 'Observações especiais da reserva',
          },
        },
        required: ['propertyId', 'checkIn', 'checkOut', 'guests'],
      },
    },
    {
      name: 'updateClientPreferences',
      description: 'Atualizar preferências do cliente para futuras buscas',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'Localização preferida',
          },
          priceRange: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
            },
            description: 'Faixa de preço preferida',
          },
          amenities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Comodidades importantes para o cliente',
          },
          bedrooms: {
            type: 'number',
            description: 'Número preferido de quartos',
          },
          maxGuests: {
            type: 'number',
            description: 'Número típico de hóspedes',
          },
        },
      },
    },
  ];

  async processMessage(
    message: string,
    context: AgentContext,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<AgentResponse> {
    try {
      const messages = [
        { role: 'system' as const, content: this.systemPrompt },
        { role: 'system' as const, content: this.buildContextPrompt(context) },
        ...conversationHistory,
        { role: 'user' as const, content: message },
      ];

      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        functions: this.availableFunctions as any,
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 1000,
      });

      const choice = response.choices[0];
      const assistantMessage = choice.message;

      let functionCalls: Array<{ name: string; arguments: any }> = [];

      if (assistantMessage.function_call) {
        try {
          const functionName = assistantMessage.function_call.name;
          const functionArgs = JSON.parse(assistantMessage.function_call.arguments);
          functionCalls.push({ name: functionName, arguments: functionArgs });
        } catch (error) {

        }
      }

      return {
        message: assistantMessage.content || '',
        functionCalls,
        shouldSendMedia: functionCalls.some(call => call.name === 'sendPropertyMedia'),
      };
    } catch (error) {

      return {
        message: 'Desculpe, estou com dificuldades técnicas no momento. Pode tentar novamente em alguns instantes?',
      };
    }
  }

  private buildContextPrompt(context: AgentContext): string {
    let prompt = `CONTEXTO DA CONVERSA:
- Cliente ID: ${context.clientId}
- Conversa ID: ${context.conversationId}
`;

    if (context.currentSearchFilters) {
      prompt += `
FILTROS DE BUSCA ATUAIS:
${JSON.stringify(context.currentSearchFilters, null, 2)}
`;
    }

    if (context.interestedProperties?.length) {
      prompt += `
PROPRIEDADES DE INTERESSE:
${context.interestedProperties.join(', ')}
`;
    }

    if (context.pendingReservation) {
      prompt += `
RESERVA PENDENTE:
${JSON.stringify(context.pendingReservation, null, 2)}
`;
    }

    if (context.clientPreferences) {
      prompt += `
PREFERÊNCIAS DO CLIENTE:
${JSON.stringify(context.clientPreferences, null, 2)}
`;
    }

    return prompt;
  }

  async generatePropertyDescription(property: Property): Promise<string> {
    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em marketing imobiliário. Crie uma descrição atrativa e profissional para uma propriedade de aluguel por temporada. 
            A descrição deve ser em português brasileiro, destacar os principais benefícios, localização e comodidades.
            Mantenha um tom acolhedor e persuasivo, mas honesto.`,
          },
          {
            role: 'user',
            content: `Crie uma descrição para esta propriedade:
            Nome: ${property.title}
            Localização: ${property.location}
            Quartos: ${property.bedrooms}
            Banheiros: ${property.bathrooms}
            Hóspedes: ${property.maxGuests}
            Comodidades: ${property.amenities.join(', ')}
            Preço base: R$ ${property.pricing.basePrice}/noite
            Descrição atual: ${property.description}`,
          },
        ],
        temperature: 0.8,
        max_tokens: 500,
      });

      return response.choices[0].message?.content || property.description;
    } catch (error) {

      return property.description;
    }
  }

  async generateWelcomeMessage(clientName?: string): Promise<string> {
    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente virtual amigável de uma imobiliária. Crie uma mensagem de boas-vindas calorosa e profissional em português brasileiro.
            A mensagem deve ser concisa, apresentar seus serviços e perguntar como pode ajudar.`,
          },
          {
            role: 'user',
            content: `Crie uma mensagem de boas-vindas${clientName ? ` para ${clientName}` : ''}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      return response.choices[0].message?.content || 
        `Olá${clientName ? `, ${clientName}` : ''}! 👋 Sou seu assistente virtual para aluguel por temporada. Estou aqui para ajudar você a encontrar a propriedade perfeita para sua estadia. Como posso te ajudar hoje?`;
    } catch (error) {

      return `Olá${clientName ? `, ${clientName}` : ''}! 👋 Sou seu assistente virtual para aluguel por temporada. Estou aqui para ajudar você a encontrar a propriedade perfeita para sua estadia. Como posso te ajudar hoje?`;
    }
  }

  async moderateContent(content: string): Promise<{ flagged: boolean; categories: string[] }> {
    try {
      const openai = getOpenAIClient();
      const response = await openai.moderations.create({
        input: content,
      });

      const result = response.results[0];
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category);

      return {
        flagged: result.flagged,
        categories: flaggedCategories,
      };
    } catch (error) {

      return { flagged: false, categories: [] };
    }
  }

  async extractDateFromMessage(message: string): Promise<{
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  }> {
    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente que extrai informações de datas e número de hóspedes de mensagens de texto.
            Retorne apenas um JSON com os campos: checkIn (formato YYYY-MM-DD), checkOut (formato YYYY-MM-DD), guests (número).
            Se alguma informação não estiver disponível, não inclua o campo no JSON.`,
          },
          {
            role: 'user',
            content: `Extraia as informações desta mensagem: "${message}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 100,
      });

      const content = response.choices[0].message?.content;
      if (content) {
        try {
          return JSON.parse(content);
        } catch {
          return {};
        }
      }
      return {};
    } catch (error) {

      return {};
    }
  }
}

const openaiService = new OpenAIService();
export default openaiService;