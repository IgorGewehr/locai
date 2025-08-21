import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromCookie } from '@/lib/utils/auth-cookie';
import { createSettingsService } from '@/lib/services/settings-service';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import type { WhatsAppSettings } from '@/lib/types/whatsapp';

// WhatsApp configuration validation schema - APENAS Baileys Microservice
const whatsappConfigSchema = z.object({
  // NÃO há configuração para Business API - apenas para Baileys via microservice
  businessName: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  mode: z.enum(['baileys_microservice']).default('baileys_microservice'),
  tenantId: z.string().min(1, 'Tenant ID é obrigatório'),
});

// GET /api/config/whatsapp - Get WhatsApp configuration
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId || 'default-tenant';
    logger.info('Fetching WhatsApp configuration', { tenantId });

    const settingsService = createSettingsService(tenantId);
    const settings = await settingsService.getSettings(tenantId);
    const whatsappConfig = (settings?.whatsapp || {}) as Partial<WhatsAppSettings>;

    // Dados seguros - apenas Baileys microservice
    const safeConfig = {
      ...whatsappConfig,
      businessName: whatsappConfig.businessName || '',
      webhookUrl: whatsappConfig.webhookUrl || '',
      mode: 'baileys_microservice',
      connected: whatsappConfig.connected || false,
      lastSync: whatsappConfig.lastSync || null,
      // Status baseado na conexão do microservice
      isConfigured: true, // Sempre configurado via microservice
      microserviceUrl: process.env.WHATSAPP_MICROSERVICE_URL ? 'Configurado' : 'Não configurado',
    };

    return NextResponse.json({
      success: true,
      data: safeConfig,
    });

  } catch (error) {
    logger.error('Error fetching WhatsApp configuration', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch WhatsApp configuration' },
      { status: 500 }
    );
  }
}

// POST /api/config/whatsapp - Save WhatsApp configuration
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId || 'default-tenant';
    const body = await request.json();

    logger.info('Saving WhatsApp configuration', { tenantId });

    // Validate the configuration
    const validatedConfig = whatsappConfigSchema.parse(body);

    // Prepare WhatsApp settings for storage
    const whatsappSettings = {
      ...validatedConfig,
      connected: false, // Reset connection status when config changes
      lastSync: new Date(),
      updatedAt: new Date(),
      updatedBy: auth.userId,
    };

    // Save to settings
    const settingsService = createSettingsService(tenantId);
    await settingsService.updateWhatsAppSettings(tenantId, whatsappSettings);

    logger.info('WhatsApp configuration saved successfully', { tenantId });

    return NextResponse.json({
      success: true,
      message: 'Configuração do WhatsApp salva com sucesso',
      data: {
        phoneNumberId: validatedConfig.phoneNumberId,
        businessName: validatedConfig.businessName,
        mode: validatedConfig.mode,
        isConfigured: true,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('WhatsApp configuration validation error', { error: error.errors });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados de configuração inválidos',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    logger.error('Error saving WhatsApp configuration', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { success: false, error: 'Falha ao salvar configuração do WhatsApp' },
      { status: 500 }
    );
  }
}

// PUT /api/config/whatsapp - Update WhatsApp configuration
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId || 'default-tenant';
    const body = await request.json();

    logger.info('Updating WhatsApp configuration', { tenantId });

    // Get current settings
    const settingsService = createSettingsService(tenantId);
    const currentSettings = await settingsService.getSettings(tenantId);
    const currentWhatsApp = (currentSettings?.whatsapp || {}) as Partial<WhatsAppSettings>;

    // Merge with new data (partial update)
    const updatedConfig = {
      ...currentWhatsApp,
      ...body,
      updatedAt: new Date(),
      updatedBy: auth.userId,
    };

    // If we're updating credentials, validate them
    if (body.accessToken || body.phoneNumberId || body.verifyToken) {
      const configToValidate = {
        accessToken: body.accessToken || currentWhatsApp.accessToken,
        phoneNumberId: body.phoneNumberId || currentWhatsApp.phoneNumberId,
        verifyToken: body.verifyToken || currentWhatsApp.verifyToken,
        businessName: body.businessName || currentWhatsApp.businessName,
        mode: body.mode || currentWhatsApp.mode || 'business_api',
      };

      whatsappConfigSchema.parse(configToValidate);
      
      // Reset connection status if credentials changed
      updatedConfig.connected = false;
    }

    // Save to settings
    await settingsService.updateWhatsAppSettings(tenantId, updatedConfig);

    logger.info('WhatsApp configuration updated successfully', { tenantId });

    return NextResponse.json({
      success: true,
      message: 'Configuração do WhatsApp atualizada com sucesso',
      data: {
        phoneNumberId: updatedConfig.phoneNumberId,
        businessName: updatedConfig.businessName,
        mode: updatedConfig.mode,
        connected: updatedConfig.connected,
        isConfigured: !!(updatedConfig.accessToken && updatedConfig.phoneNumberId && updatedConfig.verifyToken),
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('WhatsApp configuration validation error', { error: error.errors });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados de configuração inválidos',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    logger.error('Error updating WhatsApp configuration', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { success: false, error: 'Falha ao atualizar configuração do WhatsApp' },
      { status: 500 }
    );
  }
}

// DELETE /api/config/whatsapp - Reset WhatsApp configuration
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId || 'default-tenant';
    logger.info('Resetting WhatsApp configuration', { tenantId });

    // Reset WhatsApp settings
    const resetConfig: Partial<WhatsAppSettings> = {
      accessToken: '',
      phoneNumberId: '',
      verifyToken: '',
      businessName: '',
      webhookUrl: '',
      mode: 'business_api',
      connected: false,
      lastSync: null,
      updatedAt: new Date(),
    };

    const settingsService = createSettingsService(tenantId);
    await settingsService.updateWhatsAppSettings(tenantId, resetConfig);

    logger.info('WhatsApp configuration reset successfully', { tenantId });

    return NextResponse.json({
      success: true,
      message: 'Configuração do WhatsApp foi redefinida',
    });

  } catch (error) {
    logger.error('Error resetting WhatsApp configuration', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { success: false, error: 'Falha ao redefinir configuração do WhatsApp' },
      { status: 500 }
    );
  }
}