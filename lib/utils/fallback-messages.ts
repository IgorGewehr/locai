// lib/utils/fallback-messages.ts
// Mensagens amigáveis para quando APIs falham

export const fallbackMessages = {
  searchProperties: `Desculpe, estou tendo dificuldades para buscar os imóveis agora. 😔

Pode tentar novamente em alguns instantes? Enquanto isso, se preferir falar com um atendente humano, é só me avisar!`,

  calculatePrice: `Ops, tive um problema ao calcular o valor exato.

Deixe eu tentar de novo em um momento. Você também pode falar com um de nossos atendentes se preferir um atendimento mais rápido!`,

  createReservation: `Percebi uma instabilidade ao criar sua reserva. 😕

Por segurança, vou pedir para você confirmar novamente em alguns instantes, ou posso te transferir para um atendente humano que finalizará isso rapidinho. O que prefere?`,

  sendMedia: `Estou com dificuldades para enviar as fotos agora.

Pode tentar pedir novamente em alguns segundos? Ou posso te passar o link direto para ver as fotos online!`,

  generic: `Desculpe, tive uma dificuldade técnica momentânea.

Pode repetir sua mensagem em alguns instantes? Se preferir, posso te conectar com um atendente humano!`,

  timeout: `Nossa, essa operação está demorando mais que o esperado... ⏰

Vou continuar processando, mas se preferir um atendimento mais rápido, posso te transferir para um humano!`
};

export function getFallbackMessage(
  functionName: string,
  errorType?: 'timeout' | 'error' | 'unavailable'
): string {
  // Prioridade para erros específicos
  if (errorType === 'timeout') {
    return fallbackMessages.timeout;
  }

  // Mensagens específicas por função
  const key = functionName.replace(/-/g, '_') as keyof typeof fallbackMessages;

  if (fallbackMessages[key]) {
    return fallbackMessages[key];
  }

  // Fallback genérico
  return fallbackMessages.generic;
}
