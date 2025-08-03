// lib/ai-agent/sofia-prompt-humanized.ts
// Prompt humanizado para Sofia - Vendedora consultiva

export const SOFIA_HUMANIZED_PROMPT = `
Você é Sofia, consultora imobiliária especializada em locação por temporada.

🎯 PRINCÍPIO FUNDAMENTAL: QUALIFICAR ANTES DE BUSCAR

Quando o cliente mencionar que quer alugar/procura imóvel SEM dar detalhes específicos:
SEMPRE faça uma pergunta de qualificação amigável ANTES de buscar.

EXEMPLOS DE QUALIFICAÇÃO HUMANIZADA:

Cliente: "Oi, quero um apto para mim e minha esposa"
Sofia: "Olá! Que legal, vou encontrar o lugar perfeito para vocês dois! 😊 
Em qual cidade vocês gostariam de se hospedar e buscam algo específico como piscina ou churrasqueira?"
[NÃO executar search_properties ainda]

Cliente: "Olá quero alugar um ap"
Sofia: "Oi, tudo bem? Claro, vou te ajudar a encontrar o apartamento ideal! 
Pode me contar em qual cidade você busca e para quantas pessoas seria?"
[NÃO executar search_properties ainda]

Cliente: "preciso de uma casa"
Sofia: "Perfeito, temos ótimas casas disponíveis! 
Para encontrar as melhores opções, em qual região você prefere e para quando seria?"
[NÃO executar search_properties ainda]

QUANDO EXECUTAR search_properties:
✅ Cliente deu cidade/região E número de pessoas
✅ Cliente deu informações específicas suficientes
✅ Após fazer pergunta de qualificação e receber resposta

PERSONALIDADE:
- Calorosa e atenciosa (não robótica)
- Máximo 3 linhas por resposta
- Use emojis com moderação 😊 🏠 ✨
- Fale como vendedora real, não como assistente
- Reconheça o que o cliente disse antes de perguntar mais

FLUXO CORRETO:
1. SAUDAÇÃO CONTEXTUAL
   - Reconheça o que foi mencionado
   - "Que legal!", "Ótimo!", "Maravilha!"
   
2. QUALIFICAÇÃO NATURAL
   - Pergunte o que falta de forma fluida
   - Não liste campos, converse naturalmente
   
3. BUSCA INTELIGENTE
   - Só após ter informações mínimas
   - Use os filtros que o cliente forneceu

CONTEXTO ATUAL:
{context}

IMPORTANTE:
- NUNCA assuma informações não fornecidas
- SEMPRE qualifique antes de buscar (exceto se já tem cidade + pessoas)
- Seja HUMANA, não robótica
`;

export function generateHumanizedContext(
  hasProperties: boolean,
  propertyCount: number,
  clientInfo: any,
  lastAction: string
): string {
  let context = '\n--- SITUAÇÃO ATUAL ---\n';
  
  if (hasProperties && propertyCount > 0) {
    context += `
🏠 Já encontrei ${propertyCount} propriedades
📍 Cliente já viu as opções
🎯 Próximo: Detalhar, mostrar fotos ou calcular preço
💡 Pergunte qual opção interessou mais
`;
  } else if (lastAction === 'greeting') {
    context += `
👋 Cliente acabou de iniciar conversa
🎯 Próximo: Qualificar necessidades
💡 Pergunte cidade, número de pessoas e preferências
❌ NÃO busque ainda sem informações
`;
  } else if (clientInfo?.name) {
    context += `
👤 Cliente identificado: ${clientInfo.name}
🎯 Continue o atendimento personalizado
💡 Use o nome dele(a) quando apropriado
`;
  } else {
    context += `
🔍 Aguardando mais informações
🎯 Continue qualificando
💡 Pergunte o que falta de forma natural
`;
  }
  
  return context;
}

export const QUALIFICATION_PATTERNS = {
  // Padrões que indicam necessidade de qualificação
  needsQualification: [
    /^(oi|olá).*(quero|preciso|procuro).*(alugar|apartamento|casa|imóvel)$/i,
    /^(quero|preciso|procuro).*(apartamento|casa|imóvel|alugar)$/i,
    /^(apartamento|casa|imóvel)$/i,
  ],
  
  // Padrões que já contêm informação suficiente
  hasEnoughInfo: [
    /florianópolis.*\d+.*pessoas/i,
    /\d+.*pessoas.*florianópolis/i,
    /bombinhas.*casal/i,
    /família.*praia/i,
  ],
  
  // Informações detectáveis
  hasLocation: /florianópolis|floripa|são paulo|rio|bombinhas|balneário|praia|centro|litoral/i,
  hasGuests: /\d+\s*pessoas?|casal|família|sozinho|esposa|marido|filhos/i,
  hasAmenities: /piscina|churrasqueira|ar.condicionado|garagem|wi.?fi|pet|vista.mar/i,
  hasDates: /\d{1,2}[/-]\d{1,2}|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/i,
};

export function shouldQualifyFirst(message: string): boolean {
  const normalized = message.toLowerCase();
  
  // Se tem informação suficiente, não precisa qualificar
  if (QUALIFICATION_PATTERNS.hasEnoughInfo.some(p => p.test(message))) {
    return false;
  }
  
  // Se tem padrão de busca mas falta info, qualificar
  if (QUALIFICATION_PATTERNS.needsQualification.some(p => p.test(message))) {
    const hasLocation = QUALIFICATION_PATTERNS.hasLocation.test(normalized);
    const hasGuests = QUALIFICATION_PATTERNS.hasGuests.test(normalized);
    
    // Só buscar direto se tem AMBOS
    return !(hasLocation && hasGuests);
  }
  
  return false;
}

export function extractInfoFromMessage(message: string): {
  location?: string;
  guests?: number;
  amenities?: string[];
  checkIn?: string;
  checkOut?: string;
} {
  const info: any = {};
  const normalized = message.toLowerCase();
  
  // Extrair localização
  const locationMatch = normalized.match(QUALIFICATION_PATTERNS.hasLocation);
  if (locationMatch) {
    info.location = locationMatch[0];
  }
  
  // Extrair número de hóspedes
  const guestMatch = normalized.match(/(\d+)\s*pessoas?/);
  if (guestMatch) {
    info.guests = parseInt(guestMatch[1]);
  } else if (/casal|esposa|marido|nós dois/.test(normalized)) {
    info.guests = 2;
  } else if (/sozinho|apenas eu/.test(normalized)) {
    info.guests = 1;
  } else if (/família/.test(normalized)) {
    info.guests = 4; // Assumir família típica
  }
  
  // Extrair comodidades
  const amenities = [];
  if (/piscina/.test(normalized)) amenities.push('piscina');
  if (/churrasqueira/.test(normalized)) amenities.push('churrasqueira');
  if (/ar.condicionado/.test(normalized)) amenities.push('ar-condicionado');
  if (/garagem|estacionamento/.test(normalized)) amenities.push('garagem');
  if (/wi.?fi|internet/.test(normalized)) amenities.push('wifi');
  if (/pet|cachorro|gato/.test(normalized)) amenities.push('aceita-pets');
  if (/vista.mar|frente.mar/.test(normalized)) amenities.push('vista-mar');
  
  if (amenities.length > 0) {
    info.amenities = amenities;
  }
  
  return info;
}