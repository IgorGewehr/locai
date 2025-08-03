// lib/ai-agent/demo-properties.ts
// Propriedades de demonstração para testar todas as funções

export const DEMO_PROPERTIES = [
  {
    id: 'demo_prop_001_florianopolis_luxo',
    name: 'Apartamento Luxo Vista Mar - Florianópolis',
    title: 'Apartamento Luxo Vista Mar - Florianópolis',
    location: 'Florianópolis',
    address: 'Rua das Rendeiras, 123 - Lagoa da Conceição, Florianópolis/SC',
    bedrooms: 2,
    bathrooms: 2,
    guests: 4,
    size: 85,
    basePrice: 250,
    isActive: true,
    amenities: ['Wi-Fi', 'Ar Condicionado', 'Piscina', 'Academia', 'Garagem'],
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
    ],
    videos: ['https://example.com/video1.mp4'],
    description: 'Apartamento moderno com vista incrível para o mar, localizado no coração da Lagoa da Conceição. Ambiente sofisticado e aconchegante, perfeito para casais ou famílias pequenas.',
    rules: 'Não fumantes. Animais permitidos com taxa adicional.',
    checkinTime: '15:00',
    checkoutTime: '11:00'
  },
  {
    id: 'demo_prop_002_florianopolis_economico',
    name: 'Studio Aconchegante Centro - Florianópolis',
    title: 'Studio Aconchegante Centro - Florianópolis',
    location: 'Florianópolis',
    address: 'Rua Felipe Schmidt, 456 - Centro, Florianópolis/SC',
    bedrooms: 1,
    bathrooms: 1,
    guests: 2,
    size: 45,
    basePrice: 120,
    isActive: true,
    amenities: ['Wi-Fi', 'Ar Condicionado', 'Cozinha Completa'],
    photos: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'
    ],
    videos: [],
    description: 'Studio moderno e funcional no centro de Florianópolis. Ideal para viajantes que buscam praticidade e localização privilegiada.',
    rules: 'Não fumantes. Não são permitidos animais.',
    checkinTime: '14:00',
    checkoutTime: '12:00'
  },
  {
    id: 'demo_prop_003_florianopolis_familia',
    name: 'Casa Familiar Praia dos Ingleses - Florianópolis',
    title: 'Casa Familiar Praia dos Ingleses - Florianópolis',
    location: 'Florianópolis',
    address: 'Rua das Gaivotas, 789 - Praia dos Ingleses, Florianópolis/SC',
    bedrooms: 3,
    bathrooms: 2,
    guests: 6,
    size: 120,
    basePrice: 350,
    isActive: true,
    amenities: ['Wi-Fi', 'Ar Condicionado', 'Churrasqueira', 'Garagem', 'Jardim'],
    photos: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
      'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=800'
    ],
    videos: ['https://example.com/video3.mp4'],
    description: 'Casa espaçosa a apenas 200m da praia dos Ingleses. Perfeita para famílias que buscam conforto e diversão. Área externa com churrasqueira.',
    rules: 'Festa permitida até 22h. Animais bem-vindos.',
    checkinTime: '16:00',
    checkoutTime: '10:00'
  }
];

export function getDemoProperties(): any[] {
  return DEMO_PROPERTIES.map(prop => ({
    ...prop,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
}

export function findDemoPropertyById(id: string): any | null {
  return DEMO_PROPERTIES.find(prop => prop.id === id) || null;
}