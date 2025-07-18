/**
 * Fix Automático do Mini-Site
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsService } from '@/lib/services/settings-service';
import { miniSiteService } from '@/lib/services/mini-site-service';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Property } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { tenantId = 'default-tenant' } = await request.json();
    
    console.log('🔧 Iniciando correção automática do mini-site para tenant:', tenantId);
    
    const fixResults = {
      tenantId,
      timestamp: new Date().toISOString(),
      step1_settings: { success: false, action: null, error: null },
      step2_properties: { success: false, action: null, error: null },
      step3_activation: { success: false, action: null, error: null },
      step4_verification: { success: false, action: null, error: null },
    };

    // Step 1: Criar/atualizar configurações
    try {
      console.log('📋 Step 1: Criando/atualizando configurações...');
      
      const existingSettings = await settingsService.getSettings(tenantId);
      const miniSiteSettings = {
        active: true,
        title: 'Minha Imobiliária',
        description: 'Encontre o imóvel perfeito para suas férias',
        whatsappNumber: '5511999999999',
        companyEmail: 'contato@imobiliaria.com',
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        accentColor: '#ed6c02',
        fontFamily: 'modern',
        borderRadius: 'rounded',
        showPrices: true,
        showAvailability: true,
        showReviews: true,
        seoKeywords: 'imóveis, aluguel, temporada, férias, propriedades',
      };

      await settingsService.updateMiniSiteSettings(tenantId, miniSiteSettings);
      
      fixResults.step1_settings = {
        success: true,
        action: 'Configurações criadas/atualizadas com sucesso',
        error: null
      };
    } catch (error) {
      fixResults.step1_settings = {
        success: false,
        action: 'Falha ao criar configurações',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }

    // Step 2: Verificar e criar propriedades se necessário
    try {
      console.log('🏠 Step 2: Verificando propriedades...');
      
      const propertyService = new FirestoreService<Property>('properties');
      const allProperties = await propertyService.getAll();
      const tenantProperties = allProperties.filter(p => p.tenantId === tenantId);
      
      let action = '';
      
      if (tenantProperties.length === 0) {
        // Criar propriedades demo
        console.log('Criando propriedades demo...');
        
        const demoProperties: Partial<Property>[] = [
          {
            tenantId,
            title: 'Casa de Praia Aconchegante',
            description: 'Linda casa de praia com vista para o mar, perfeita para relaxar.',
            type: 'Casa',
            bedrooms: 3,
            bathrooms: 2,
            maxGuests: 6,
            basePrice: 350,
            address: 'Rua das Ondas, 123',
            city: 'Ubatuba',
            neighborhood: 'SP',
            isActive: true,
            status: 'active',
            photos: [
              {
                url: 'https://images.unsplash.com/photo-1520637836862-4d197d17c795?w=800&q=80',
                caption: 'Vista externa',
                order: 1,
                isMain: true
              }
            ],
            amenities: ['Wi-Fi', 'Piscina', 'Ar Condicionado', 'Cozinha', 'Estacionamento'],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            tenantId,
            title: 'Apartamento Moderno no Centro',
            description: 'Apartamento moderno bem localizado no centro da cidade.',
            type: 'Apartamento',
            bedrooms: 2,
            bathrooms: 1,
            maxGuests: 4,
            basePrice: 180,
            address: 'Avenida Central, 456',
            city: 'São Paulo',
            neighborhood: 'SP',
            isActive: true,
            status: 'active',
            photos: [
              {
                url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
                caption: 'Vista externa',
                order: 1,
                isMain: true
              }
            ],
            amenities: ['Wi-Fi', 'Ar Condicionado', 'Cozinha', 'Elevador', 'Segurança'],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            tenantId,
            title: 'Chalé na Montanha',
            description: 'Chalé aconchegante na montanha, perfeito para relaxar.',
            type: 'Chalé',
            bedrooms: 2,
            bathrooms: 1,
            maxGuests: 4,
            basePrice: 220,
            address: 'Estrada da Montanha, 789',
            city: 'Campos do Jordão',
            neighborhood: 'SP',
            isActive: true,
            status: 'active',
            photos: [
              {
                url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
                caption: 'Vista externa',
                order: 1,
                isMain: true
              }
            ],
            amenities: ['Wi-Fi', 'Lareira', 'Cozinha', 'Estacionamento', 'Varanda'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        for (const property of demoProperties) {
          await propertyService.create(property as Property);
        }
        
        action = `Criadas ${demoProperties.length} propriedades demo`;
      } else {
        // Ativar propriedades existentes se necessário
        const inactiveProperties = tenantProperties.filter(p => p.isActive === false);
        
        for (const property of inactiveProperties) {
          await propertyService.update(property.id!, { ...property, isActive: true });
        }
        
        action = `${tenantProperties.length} propriedades encontradas, ${inactiveProperties.length} ativadas`;
      }
      
      fixResults.step2_properties = {
        success: true,
        action,
        error: null
      };
    } catch (error) {
      fixResults.step2_properties = {
        success: false,
        action: 'Falha ao verificar/criar propriedades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }

    // Step 3: Ativar mini-site
    try {
      console.log('🌐 Step 3: Ativando mini-site...');
      
      const config = await miniSiteService.getConfig(tenantId);
      if (config) {
        await miniSiteService.updateConfig({
          tenantId,
          isActive: true
        });
        
        fixResults.step3_activation = {
          success: true,
          action: 'Mini-site ativado com sucesso',
          error: null
        };
      } else {
        throw new Error('Config do mini-site não encontrada');
      }
    } catch (error) {
      fixResults.step3_activation = {
        success: false,
        action: 'Falha ao ativar mini-site',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }

    // Step 4: Verificar se tudo está funcionando
    try {
      console.log('✅ Step 4: Verificando funcionamento...');
      
      const config = await miniSiteService.getConfig(tenantId);
      const properties = await miniSiteService.getPublicProperties(tenantId);
      
      if (config && properties.length > 0) {
        fixResults.step4_verification = {
          success: true,
          action: `Mini-site verificado: ${properties.length} propriedades disponíveis`,
          error: null
        };
      } else {
        throw new Error('Verificação falhou: config ou propriedades não encontradas');
      }
    } catch (error) {
      fixResults.step4_verification = {
        success: false,
        action: 'Falha na verificação',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }

    // Gerar relatório final
    const successCount = Object.values(fixResults).filter(step => 
      typeof step === 'object' && step.success
    ).length - 2; // Subtract tenantId and timestamp

    const origin = new URL(request.url).origin;
    const miniSiteUrl = `${origin}/site/${tenantId}`;
    const dashboardUrl = `${origin}/dashboard/mini-site`;

    return NextResponse.json({
      success: successCount >= 3, // Pelo menos 3 dos 4 steps devem funcionar
      summary: {
        status: successCount >= 3 ? '✅ CORRIGIDO' : '❌ FALHA PARCIAL',
        stepsCompleted: successCount,
        totalSteps: 4,
        miniSiteUrl,
        dashboardUrl
      },
      fixResults,
      nextSteps: [
        `1. Acesse ${miniSiteUrl} para ver o mini-site`,
        `2. Acesse ${dashboardUrl} para gerenciar`,
        '3. Adicione suas próprias propriedades',
        '4. Personalize as configurações'
      ]
    });

  } catch (error) {
    console.error('Error in fix API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}