/**
 * Airbnb Translation Service
 * Traduz dados importados do Airbnb (em inglês) para português
 */

import { logger } from './logger';

/**
 * Mapeamento de amenidades do Airbnb (inglês -> português)
 * Baseado nas amenidades mais comuns do Airbnb
 */
const AMENITIES_MAP: Record<string, string> = {
  // Essenciais
  'Wifi': 'Wi-Fi',
  'Kitchen': 'Cozinha',
  'Washer': 'Máquina de lavar',
  'Dryer': 'Secadora',
  'Air conditioning': 'Ar-condicionado',
  'Heating': 'Aquecedor',
  'Dedicated workspace': 'Espaço de trabalho dedicado',
  'TV': 'TV',
  'Hair dryer': 'Secador de cabelo',
  'Iron': 'Ferro de passar',

  // Recursos
  'Pool': 'Piscina',
  'Hot tub': 'Banheira de hidromassagem',
  'Free parking': 'Estacionamento gratuito',
  'Paid parking': 'Estacionamento pago',
  'EV charger': 'Carregador para veículos elétricos',
  'Crib': 'Berço',
  'Gym': 'Academia',
  'BBQ grill': 'Churrasqueira',
  'Breakfast': 'Café da manhã',
  'Indoor fireplace': 'Lareira',
  'Smoking allowed': 'Fumar permitido',
  'Beachfront': 'Frente para a praia',
  'Waterfront': 'À beira-mar',

  // Localização
  'Private entrance': 'Entrada privativa',
  'Beach access': 'Acesso à praia',
  'Ski-in/Ski-out': 'Acesso direto às pistas',

  // Segurança
  'Smoke alarm': 'Detector de fumaça',
  'Carbon monoxide alarm': 'Detector de monóxido de carbono',
  'First aid kit': 'Kit de primeiros socorros',
  'Fire extinguisher': 'Extintor de incêndio',
  'Lock on bedroom door': 'Fechadura na porta do quarto',

  // Cozinha e refeições
  'Refrigerator': 'Geladeira',
  'Microwave': 'Micro-ondas',
  'Dishes and silverware': 'Pratos e talheres',
  'Dishwasher': 'Lava-louças',
  'Coffee maker': 'Cafeteira',
  'Wine glasses': 'Taças de vinho',
  'Toaster': 'Torradeira',
  'Stove': 'Fogão',
  'Oven': 'Forno',
  'Dining table': 'Mesa de jantar',

  // Banheiro
  'Shampoo': 'Xampu',
  'Conditioner': 'Condicionador',
  'Body soap': 'Sabonete',
  'Hot water': 'Água quente',
  'Shower gel': 'Gel de banho',
  'Bathtub': 'Banheira',
  'Bidet': 'Bidê',

  // Quarto e lavanderia
  'Essentials': 'Essenciais',
  'Towels, bed sheets, soap, and toilet paper': 'Toalhas, lençóis, sabão e papel higiênico',
  'Hangers': 'Cabides',
  'Bed linens': 'Roupas de cama',
  'Extra pillows and blankets': 'Travesseiros e cobertores extras',
  'Room-darkening shades': 'Cortinas blackout',
  'Clothing storage': 'Armário',

  // Entretenimento
  'Ethernet connection': 'Conexão Ethernet',
  'Pocket wifi': 'Wi-Fi portátil',
  'Game console': 'Console de jogos',
  'Piano': 'Piano',
  'Exercise equipment': 'Equipamento de ginástica',
  'Pool table': 'Mesa de sinuca',
  'Ping pong table': 'Mesa de pingue-pongue',

  // Família
  "Children's books and toys": 'Livros e brinquedos infantis',
  "Children's dinnerware": 'Utensílios infantis',
  'High chair': 'Cadeira alta',
  "Pack 'n play/Travel crib": 'Berço de viagem',
  'Baby bath': 'Banheira de bebê',
  'Baby monitor': 'Babá eletrônica',
  'Changing table': 'Trocador',

  // Exterior
  'Patio or balcony': 'Pátio ou varanda',
  'Garden or backyard': 'Jardim ou quintal',
  'Beach essentials': 'Itens de praia',
  'Outdoor furniture': 'Móveis externos',
  'Outdoor dining area': 'Área de refeições externa',
  'Sun loungers': 'Espreguiçadeiras',

  // Serviços
  'Long term stays allowed': 'Estadias longas permitidas',
  'Luggage dropoff allowed': 'Depósito de bagagem permitido',
  'Self check-in': 'Check-in autônomo',
  'Keypad': 'Teclado numérico',
  'Lockbox': 'Caixa de chaves',
  'Smart lock': 'Fechadura inteligente',

  // Não incluído
  'Not included: Smoke alarm': 'Não incluído: Detector de fumaça',
  'Not included: Carbon monoxide alarm': 'Não incluído: Detector de monóxido de carbono',

  // Comuns em propriedades brasileiras
  'Elevator': 'Elevador',
  'Doorman': 'Porteiro',
  'Security cameras': 'Câmeras de segurança',
  'Pets allowed': 'Animais permitidos',
  'Sound system': 'Sistema de som',
};

/**
 * Traduz uma amenidade do inglês para português
 */
export function translateAmenity(amenityName: string): string {
  // Tenta match exato primeiro
  if (AMENITIES_MAP[amenityName]) {
    return AMENITIES_MAP[amenityName];
  }

  // Tenta match case-insensitive
  const lowerName = amenityName.toLowerCase();
  const found = Object.keys(AMENITIES_MAP).find(
    key => key.toLowerCase() === lowerName
  );

  if (found) {
    return AMENITIES_MAP[found];
  }

  // Tenta match parcial (para variações)
  const partialMatch = Object.keys(AMENITIES_MAP).find(
    key => key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())
  );

  if (partialMatch) {
    return AMENITIES_MAP[partialMatch];
  }

  // Se não encontrou, retorna original (será traduzido depois se necessário)
  logger.debug('Amenity not in dictionary', { amenityName });
  return amenityName;
}

/**
 * Traduz texto usando Google Translate API (gratuita)
 * Fallback: retorna texto original se falhar
 */
export async function translateText(text: string, from: string = 'en', to: string = 'pt'): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Se já está em português (heurística simples), retorna direto
  if (seemsPortuguese(text)) {
    return text;
  }

  try {
    // Usando API pública do Google Translate (sem autenticação)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Translation API returned ${response.status}`);
    }

    const data = await response.json();

    // API retorna array aninhado: [[[tradução, original, ...]]]
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      const translated = data[0].map((item: any) => item[0]).join('');
      logger.debug('Text translated successfully', {
        original: text.substring(0, 50) + '...',
        translated: translated.substring(0, 50) + '...',
      });
      return translated;
    }

    throw new Error('Invalid translation response format');
  } catch (error) {
    logger.error('Translation failed, returning original text', error as Error, {
      text: text.substring(0, 100),
    });
    return text;
  }
}

/**
 * Verifica se o texto parece estar em português (heurística)
 */
function seemsPortuguese(text: string): boolean {
  const portugueseWords = [
    'com', 'para', 'de', 'em', 'à', 'do', 'da', 'dos', 'das',
    'uma', 'um', 'são', 'é', 'está', 'e', 'ou', 'não', 'mais',
    'casa', 'quarto', 'banheiro', 'cozinha', 'sala', 'vista', 'praia',
  ];

  const lowerText = text.toLowerCase();
  const matches = portugueseWords.filter(word =>
    lowerText.includes(` ${word} `) ||
    lowerText.startsWith(`${word} `) ||
    lowerText.endsWith(` ${word}`)
  );

  return matches.length >= 2;
}

/**
 * Traduz um array de amenidades
 */
export async function translateAmenities(
  amenities: Array<{ id: string; type: string; name: string; category?: string }>
): Promise<Array<{ id: string; type: string; name: string; category?: string }>> {
  return amenities.map(amenity => ({
    ...amenity,
    name: translateAmenity(amenity.name),
  }));
}

/**
 * Traduz propriedade completa do Airbnb
 */
export async function translateAirbnbProperty(property: any): Promise<any> {
  logger.info('Starting property translation', {
    hasTitle: !!property.title,
    hasDescription: !!property.description,
    amenitiesCount: property.amenities?.length || 0,
  });

  try {
    // Traduz título (até 200 chars para não estourar API)
    const title = property.title
      ? await translateText(property.title.substring(0, 200))
      : property.title;

    // Traduz descrição (até 5000 chars)
    const description = property.description
      ? await translateText(property.description.substring(0, 5000))
      : property.description;

    // Traduz amenidades
    const amenities = property.amenities
      ? await translateAmenities(property.amenities)
      : property.amenities;

    logger.info('Property translation completed', {
      originalTitle: property.title?.substring(0, 50),
      translatedTitle: title?.substring(0, 50),
      amenitiesTranslated: amenities?.length || 0,
    });

    return {
      ...property,
      title,
      description,
      amenities,
    };
  } catch (error) {
    logger.error('Error translating property, returning original', error as Error);
    return property;
  }
}
