import { NextRequest, NextResponse } from 'next/server';
import { settingsService } from '@/lib/services/settings-service';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Property } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await request.json();

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'TenantId is required'
      }, { status: 400 });
    }

    console.log('🚀 Activating mini-site for tenant:', tenantId);

    // 1. Verificar se já existem propriedades para este tenant
    const propertyService = new FirestoreService<Property>('properties');
    const allProperties = await propertyService.getAll();
    const tenantProperties = allProperties.filter(p => p.tenantId === tenantId);
    
    console.log('📊 Found properties for tenant:', tenantProperties.length);

    // 2. Criar propriedades demo se não existirem
    if (tenantProperties.length === 0) {
      console.log('🎭 Creating demo properties...');
      
      const demoProperties: Omit<Property, 'id'>[] = [
        {
          tenantId,
          title: 'Casa de Praia Aconchegante',
          description: 'Linda casa de praia com vista para o mar, perfeita para relaxar e aproveitar as férias em família.',
          type: 'Casa',
          bedrooms: 3,
          bathrooms: 2,
          maxGuests: 6,
          area: 120,
          address: 'Rua das Ondas, 123',
          city: 'Ubatuba',
          neighborhood: 'Centro',
          basePrice: 350,
          minimumNights: 2,
          cleaningFee: 50,
          pricePerExtraGuest: 30,
          isActive: true,
          status: 'active',
          isFeatured: true,
          amenities: ['Wi-Fi', 'Piscina', 'Ar Condicionado', 'Cozinha', 'Estacionamento', 'Varanda'],
          photos: [
            {
              url: 'https://images.unsplash.com/photo-1520637736862-4d197d17c795?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
              caption: 'Casa de Praia Aconchegante',
              order: 1,
              isMain: true
            },
            {
              url: 'https://images.unsplash.com/photo-1505015920881-0f83c2f7c95e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
              caption: 'Sala de estar',
              order: 2,
              isMain: false
            }
          ],
          videos: [],
          unavailableDates: [],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          tenantId,
          title: 'Apartamento Moderno no Centro',
          description: 'Apartamento moderno e bem localizado no centro da cidade, com fácil acesso a restaurantes e pontos turísticos.',
          type: 'Apartamento',
          bedrooms: 2,
          bathrooms: 1,
          maxGuests: 4,
          area: 80,
          address: 'Avenida Central, 456',
          city: 'São Paulo',
          neighborhood: 'Centro',
          basePrice: 180,
          minimumNights: 1,
          cleaningFee: 30,
          pricePerExtraGuest: 20,
          isActive: true,
          status: 'active',
          isFeatured: false,
          amenities: ['Wi-Fi', 'Ar Condicionado', 'Cozinha', 'Elevador', 'Segurança', 'TV'],
          photos: [
            {
              url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
              caption: 'Apartamento Moderno no Centro',
              order: 1,
              isMain: true
            },
            {
              url: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
              caption: 'Sala moderna',
              order: 2,
              isMain: false
            }
          ],
          videos: [],
          unavailableDates: [],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          tenantId,
          title: 'Chalé na Montanha',
          description: 'Chalé aconchegante na montanha, perfeito para quem busca tranquilidade e contato com a natureza.',
          type: 'Chalé',
          bedrooms: 2,
          bathrooms: 1,
          maxGuests: 4,
          area: 90,
          address: 'Estrada da Montanha, 789',
          city: 'Campos do Jordão',
          neighborhood: 'Alto da Boa Vista',
          basePrice: 220,
          minimumNights: 2,
          cleaningFee: 40,
          pricePerExtraGuest: 25,
          isActive: true,
          status: 'active',
          isFeatured: false,
          amenities: ['Wi-Fi', 'Lareira', 'Cozinha', 'Estacionamento', 'Varanda', 'Jardim'],
          photos: [
            {
              url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
              caption: 'Chalé na Montanha',
              order: 1,
              isMain: true
            },
            {
              url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
              caption: 'Interior do chalé',
              order: 2,
              isMain: false
            }
          ],
          videos: [],
          unavailableDates: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Criar as propriedades demo
      for (const property of demoProperties) {
        await propertyService.create(property);
      }

      console.log('✅ Demo properties created successfully');
    }

    // 3. Ativar o mini-site nas configurações
    console.log('🔧 Activating mini-site in settings...');
    
    await settingsService.updateMiniSiteSettings(tenantId, {
      active: true,
      title: 'Minha Imobiliária',
      description: 'Encontre o imóvel perfeito para você',
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      accentColor: '#ed6c02',
      fontFamily: 'modern',
      borderRadius: 'rounded',
      showPrices: true,
      showAvailability: true,
      showReviews: true,
      whatsappNumber: '',
      companyEmail: '',
      seoKeywords: 'imóveis, aluguel, venda, imobiliária'
    });

    console.log('✅ Mini-site activated successfully');

    // 4. Gerar URL do mini-site
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const miniSiteUrl = `${baseUrl}/site/${tenantId}`;

    return NextResponse.json({
      success: true,
      message: 'Mini-site activated successfully',
      miniSiteUrl,
      propertiesCreated: tenantProperties.length === 0 ? 3 : 0,
      data: {
        tenantId,
        miniSiteUrl,
        isActive: true
      }
    });

  } catch (error) {
    console.error('Error activating mini-site:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}