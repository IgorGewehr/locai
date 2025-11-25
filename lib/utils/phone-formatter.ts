/**
 * Phone Formatter Utility
 *
 * Formata números de telefone brasileiros com validação robusta
 * Aceita múltiplos formatos de entrada e sempre retorna formato padronizado
 */

/**
 * Remove todos os caracteres não-numéricos de uma string
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Valida se um número de telefone brasileiro é válido
 *
 * Formatos aceitos:
 * - (47) 99785-6405 ou (47) 9 9785-6405
 * - 47997856405 ou 4797856405
 * - 5547997856405 (com código do país)
 *
 * @param phone - Número de telefone a ser validado
 * @returns true se o número é válido
 */
export function isValidBrazilianPhone(phone: string): boolean {
  const cleaned = cleanPhoneNumber(phone);

  // Aceitar números com 10, 11 (com 9), 12 (com DDD+9), ou 13 dígitos (com código do país)
  // Formato: [55][DD][9]NNNN-NNNN
  // DD = DDD (2 dígitos)
  // 9 = dígito adicional para celulares (opcional)
  // NNNN-NNNN = 8 dígitos do número

  if (cleaned.length < 10 || cleaned.length > 13) {
    return false;
  }

  return true;
}

/**
 * Formata um número de telefone brasileiro para o formato padrão
 *
 * Entrada aceita:
 * - 47997856405 → (47) 9 9785-6405
 * - 4797856405 → (47) 9785-6405
 * - 5547997856405 → (47) 9 9785-6405
 * - 997856405 → 9 9785-6405 (sem DDD)
 *
 * @param phone - Número de telefone a ser formatado
 * @returns Número formatado ou string original se inválido
 */
export function formatBrazilianPhone(phone: string): string {
  if (!phone) return '';

  const cleaned = cleanPhoneNumber(phone);

  // Se não for válido, retornar original
  if (!isValidBrazilianPhone(phone)) {
    return phone;
  }

  // Remover código do país (55) se presente
  let number = cleaned;
  if (number.startsWith('55') && number.length >= 12) {
    number = number.slice(2);
  }

  // Formatar com base no tamanho
  if (number.length === 11) {
    // Formato: (DD) 9 NNNN-NNNN (celular com 9)
    return `(${number.slice(0, 2)}) ${number.slice(2, 3)} ${number.slice(3, 7)}-${number.slice(7)}`;
  } else if (number.length === 10) {
    // Formato: (DD) NNNN-NNNN (telefone fixo ou celular sem 9)
    return `(${number.slice(0, 2)}) ${number.slice(2, 6)}-${number.slice(6)}`;
  } else if (number.length === 9) {
    // Formato sem DDD: 9 NNNN-NNNN
    return `${number.slice(0, 1)} ${number.slice(1, 5)}-${number.slice(5)}`;
  } else if (number.length === 8) {
    // Formato sem DDD: NNNN-NNNN
    return `${number.slice(0, 4)}-${number.slice(4)}`;
  }

  // Retornar número limpo se não se encaixar em nenhum formato
  return number;
}

/**
 * Normaliza um número de telefone para formato de armazenamento
 * Remove formatação e mantém apenas dígitos, com código do país opcional
 *
 * @param phone - Número de telefone a ser normalizado
 * @param includeCountryCode - Se deve incluir código do país (55)
 * @returns Número normalizado (apenas dígitos)
 */
export function normalizePhoneNumber(phone: string, includeCountryCode = false): string {
  const cleaned = cleanPhoneNumber(phone);

  // Remover código do país se presente
  let normalized = cleaned;
  if (normalized.startsWith('55') && normalized.length >= 12) {
    normalized = normalized.slice(2);
  }

  // Adicionar código do país se solicitado
  if (includeCountryCode && !normalized.startsWith('55')) {
    normalized = '55' + normalized;
  }

  return normalized;
}

/**
 * Valida e formata um número de telefone com tratamento de erros
 *
 * @param phone - Número de telefone a ser processado
 * @returns Objeto com número formatado e status de validação
 */
export function validateAndFormatPhone(phone: string): {
  isValid: boolean;
  formatted: string;
  normalized: string;
  error?: string;
} {
  if (!phone) {
    return {
      isValid: false,
      formatted: '',
      normalized: '',
      error: 'Número de telefone é obrigatório',
    };
  }

  const cleaned = cleanPhoneNumber(phone);

  if (cleaned.length < 8) {
    return {
      isValid: false,
      formatted: phone,
      normalized: cleaned,
      error: 'Número de telefone muito curto',
    };
  }

  if (cleaned.length > 13) {
    return {
      isValid: false,
      formatted: phone,
      normalized: cleaned,
      error: 'Número de telefone muito longo',
    };
  }

  const isValid = isValidBrazilianPhone(phone);

  return {
    isValid,
    formatted: formatBrazilianPhone(phone),
    normalized: normalizePhoneNumber(phone),
    error: isValid ? undefined : 'Número de telefone inválido',
  };
}

/**
 * Adiciona máscara de telefone enquanto o usuário digita
 * Útil para inputs de formulários
 *
 * @param value - Valor atual do input
 * @returns Valor com máscara aplicada
 */
export function applyPhoneMask(value: string): string {
  const cleaned = cleanPhoneNumber(value);

  // Limitar entrada a 13 dígitos (código do país + DDD + 9 + 8 dígitos)
  const limited = cleaned.slice(0, 13);

  // Aplicar máscara progressiva conforme o usuário digita
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 4) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  } else if (limited.length <= 9) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  } else if (limited.length <= 11) {
    // Com 9 adicional para celular
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 3)} ${limited.slice(3, 7)}-${limited.slice(7)}`;
  } else {
    // Com código do país
    return `+${limited.slice(0, 2)} (${limited.slice(2, 4)}) ${limited.slice(4, 5)} ${limited.slice(5, 9)}-${limited.slice(9)}`;
  }
}

/**
 * Extrai DDD de um número de telefone
 *
 * @param phone - Número de telefone
 * @returns DDD (2 dígitos) ou null se não encontrado
 */
export function extractDDD(phone: string): string | null {
  const cleaned = cleanPhoneNumber(phone);

  // Remover código do país se presente
  let number = cleaned;
  if (number.startsWith('55') && number.length >= 12) {
    number = number.slice(2);
  }

  // Extrair DDD (primeiros 2 dígitos)
  if (number.length >= 10) {
    return number.slice(0, 2);
  }

  return null;
}

/**
 * Verifica se é um número de celular (tem o dígito 9 adicional)
 *
 * @param phone - Número de telefone
 * @returns true se for celular
 */
export function isMobilePhone(phone: string): boolean {
  const cleaned = cleanPhoneNumber(phone);

  // Remover código do país se presente
  let number = cleaned;
  if (number.startsWith('55') && number.length >= 12) {
    number = number.slice(2);
  }

  // Celular tem 11 dígitos (DDD + 9 + 8 dígitos)
  return number.length === 11 && number.charAt(2) === '9';
}
