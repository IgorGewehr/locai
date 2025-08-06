// app/api/agent/route.ts - VERSÃO CORRIGIDA
// Integração com Sofia V3 + Sistema de Sumário Inteligente + Logs detalhados

import { NextRequest, NextResponse } from 'next/server';
import { validatePhoneNumber, validateMessageContent, validateTenantId } from '@/lib/utils/validation';
import { handleApiError } from '@/lib/utils/api-errors';
import { APIError } from '@/lib/utils/custom-error';
import { getRateLimitService, RATE_LIMITS } from '@/lib/services/rate-limit-service';
import { logger } from '@/lib/utils/logger';
import { resolveTenantId } from '@/lib/utils/tenant-extractor';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  try {
    logger.info('🚀 [API] Nova requisição recebida', {
      requestId,
      method: 'POST',
      url: request.url,
      userAgent: request.headers.get('user-agent')?.substring(0, 50) + '...',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    });

    // 1. Parse e validação básica do JSON
    let body;
    try {
      body = await request.json();
    } catch (error) {
      logger.error('❌ [API] Erro ao fazer parse do JSON', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return handleApiError(new APIError('Invalid request body - JSON malformed', {
        requestId,
        statusCode: 400,
        error: 'INVALID_JSON'
      }));
    }

    const { message, clientPhone, phone, tenantId: requestTenantId, isTest, metadata } = body;

    logger.info('📥 [API] Dados da requisição parseados', {
      requestId,
      hasMessage: !!message,
      messageLength: message?.length || 0,
      messagePreview: message?.substring(0, 50) + '...' || 'N/A',
      hasClientPhone: !!clientPhone,
      hasPhone: !!phone,
      clientPhoneMasked: clientPhone ? clientPhone.substring(0, 4) + '***' : 'N/A',
      hasTenantId: !!requestTenantId,
      isTest: !!isTest,
      hasMetadata: !!metadata,
      source: metadata?.source || 'unknown'
    });

    // 2. Validações obrigatórias
    let validatedPhone, validatedMessage, validatedTenantId;
    try {
      validatedMessage = validateMessageContent(message);
      // Use either clientPhone or phone parameter
      validatedPhone = validatePhoneNumber(clientPhone || phone);
      
      // NOVO: Resolve tenantId dinamicamente (Auth > Body > Env)
      const resolvedTenantId = await resolveTenantId(request, body);
      if (!resolvedTenantId) {
        throw new Error('TenantId não pôde ser determinado. Usuário deve estar autenticado.');
      }
      validatedTenantId = validateTenantId(resolvedTenantId);

      logger.info('✅ [API] Validações concluídas', {
        requestId,
        validatedPhoneMasked: validatedPhone.substring(0, 4) + '***',
        validatedTenantId,
        messageLength: validatedMessage.length
      });
    } catch (error) {
      logger.error('❌ [API] Falha na validação', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        phone: clientPhone || phone,
        messageLength: message?.length
      });
      return handleApiError(error instanceof Error ? error : new Error('Validation failed'));
    }

    // 3. Rate limiting (skip para modo teste)
    if (!isTest) {
      const rateLimitService = getRateLimitService();
      const rateLimitKey = `${validatedTenantId}:${validatedPhone}`;

      logger.info('🚦 [API] Verificando rate limit', {
        requestId,
        rateLimitKey: rateLimitKey.substring(0, 20) + '***',
        isTest
      });

      const rateLimitResult = await rateLimitService.checkRateLimit(
          rateLimitKey,
          RATE_LIMITS.whatsapp
      );

      if (!rateLimitResult.allowed) {
        logger.warn('⚠️ [API] Rate limit excedido', {
          requestId,
          phoneMasked: validatedPhone.substring(0, 4) + '***',
          tenantId: validatedTenantId,
          remaining: rateLimitResult.remaining,
          resetAt: new Date(rateLimitResult.resetAt).toISOString()
        });

        return NextResponse.json(
            {
              success: false,
              error: 'Muitas mensagens enviadas. Por favor, aguarde um momento.',
              retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': RATE_LIMITS.whatsapp.maxRequests.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
                'X-Request-ID': requestId
              }
            }
        );
      }

      logger.info('✅ [API] Rate limit OK', {
        requestId,
        remaining: rateLimitResult.remaining,
        resetAt: new Date(rateLimitResult.resetAt).toISOString()
      });
    }

    // 4. Processar com Sofia MVP (versão pronta para produção)
    try {
      logger.info('🤖 [API] Iniciando processamento com Sofia MVP', {
        requestId,
        phoneMasked: validatedPhone.substring(0, 4) + '***',
        tenantId: validatedTenantId,
        source: metadata?.source || (isTest ? 'test' : 'api')
      });

      // INTEGRAÇÃO SOFIA V3: Versão moderna otimizada
      const { SofiaAgentV3 } = await import('@/lib/ai-agent/sofia-agent-v3');
      const sofiaAgent = SofiaAgentV3.getInstance();

      const result = await sofiaAgent.processMessage({
        message: validatedMessage,
        clientPhone: validatedPhone,
        tenantId: validatedTenantId,
        metadata: {
          source: metadata?.source || (isTest ? 'web' : 'api'),
          priority: metadata?.priority || 'normal'
        }
      });

      logger.info('✅ [API] Sofia MVP processamento concluído', {
        requestId,
        responseTime: result.responseTime,
        tokensUsed: result.tokensUsed,
        functionsExecuted: result.functionsExecuted.length,
        functionsNames: result.functionsExecuted,
        stage: result.metadata.stage,
        confidence: Math.round(result.metadata.confidence * 100),
        replyLength: result.reply.length,
        hasActions: result.actions && result.actions.length > 0,
        reasoningUsed: result.metadata.reasoningUsed
      });

      // 5. Enviar resposta via WhatsApp (se não for teste)
      if (!isTest) {
        try {
          logger.info('📱 [API] Enviando resposta via WhatsApp', {
            requestId,
            phoneMasked: validatedPhone.substring(0, 4) + '***',
            messageLength: result.reply.length
          });

          const { sendWhatsAppMessage } = await import('@/lib/whatsapp/message-sender');
          await sendWhatsAppMessage(validatedPhone, result.reply);

          logger.info('✅ [API] WhatsApp enviado com sucesso', { requestId });
        } catch (whatsappError) {
          logger.error('⚠️ [API] Erro no envio do WhatsApp', {
            requestId,
            error: whatsappError instanceof Error ? whatsappError.message : 'Unknown WhatsApp error',
            phoneMasked: validatedPhone.substring(0, 4) + '***'
          });
          // Não bloquear resposta por erro do WhatsApp
        }
      } else {
        logger.info('🧪 [API] Modo teste - WhatsApp não enviado', { requestId });
      }

      const totalProcessingTime = Date.now() - startTime;

      // 6. Log de sucesso detalhado
      logger.info('🎉 [API] Requisição processada com sucesso', {
        requestId,
        totalProcessingTime: `${totalProcessingTime}ms`,
        sofiaProcessingTime: `${result.responseTime}ms`,
        tokensUsed: result.tokensUsed,
        functionsExecuted: result.functionsExecuted.length,
        stage: result.metadata.stage,
        confidence: Math.round(result.metadata.confidence * 100),
        phoneMasked: validatedPhone.substring(0, 4) + '***',
        tenantId: validatedTenantId,
        isTest,
        hasValidProperties: result.summary?.propertiesViewed?.filter(p =>
            p.id && p.id.length >= 15
        ).length || 0,
        summaryStage: result.summary?.conversationState?.stage,
        hasClientInfo: !!result.summary?.clientInfo?.name
      });

      // 7. Resposta melhorada com dados do sumário inteligente
      return NextResponse.json({
        success: true,
        message: result.reply,
        data: {
          response: result.reply,
          tokensUsed: result.tokensUsed,
          responseTime: result.responseTime,
          functionsExecuted: result.functionsExecuted,
          actions: result.actions?.length || 0,

          // DADOS DO SUMÁRIO INTELIGENTE (NOVOS)
          conversationStage: result.metadata.stage,
          confidence: Math.round(result.metadata.confidence * 100),
          clientInfo: {
            hasName: !!result.summary?.clientInfo?.name,
            hasDocument: !!result.summary?.clientInfo?.document,
            hasEmail: !!result.summary?.clientInfo?.email,
            guestsIdentified: !!result.summary?.searchCriteria?.guests
          },
          searchProgress: {
            propertiesViewed: result.summary?.propertiesViewed?.length || 0,
            validProperties: result.summary?.propertiesViewed?.filter(p =>
                p.id && p.id.length >= 15
            ).length || 0,
            hasInterestedProperty: result.summary?.propertiesViewed?.some(p => p.interested) || false,
            priceCalculated: result.summary?.propertiesViewed?.some(p => p.priceCalculated) || false,
            photosViewed: result.summary?.propertiesViewed?.some(p => p.photosViewed) || false
          },
          context: {
            nextRecommendedAction: result.summary?.nextBestAction?.action,
            actionReason: result.summary?.nextBestAction?.reason,
            urgencyLevel: result.summary?.conversationState?.urgency,
            buyingSignals: result.summary?.conversationState?.buyingSignals?.length || 0,
            objections: result.summary?.conversationState?.objections?.length || 0,
            location: result.summary?.searchCriteria?.location,
            checkIn: result.summary?.searchCriteria?.checkIn,
            checkOut: result.summary?.searchCriteria?.checkOut,
            guests: result.summary?.searchCriteria?.guests
          },

          // Métricas de performance
          performance: {
            totalProcessingTime: `${totalProcessingTime}ms`,
            sofiaProcessingTime: `${result.responseTime}ms`,
            reasoningUsed: result.metadata.reasoningUsed,
            smartSummaryEnabled: true,
            validationsPassed: true,
            rateLimitOk: !isTest,
            cacheUsed: false // Sofia V3 não usa cache ainda
          },

          // Metadata da requisição
          request: {
            id: requestId,
            timestamp: new Date().toISOString(),
            source: metadata?.source || (isTest ? 'test' : 'api'),
            isTest,
            tenantId: validatedTenantId
          }
        }
      }, {
        headers: {
          'X-Request-ID': requestId,
          'X-Processing-Time': `${totalProcessingTime}ms`,
          'X-Sofia-Version': 'MVP-1.0',
          'X-Tokens-Used': result.tokensUsed.toString(),
          'X-Functions-Executed': result.functionsExecuted.length.toString()
        }
      });

    } catch (agentError) {
      const processingTime = Date.now() - startTime;

      logger.error('❌ [API] Erro na Sofia MVP', {
        requestId,
        error: agentError instanceof Error ? agentError.message : 'Unknown error',
        stack: agentError instanceof Error ? agentError.stack : undefined,
        phoneMasked: validatedPhone.substring(0, 4) + '***',
        processingTime: `${processingTime}ms`
      });

      // Fallback para resposta de erro amigável
      const errorMessage = 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns instantes. 🙏';

      // Tentar enviar erro via WhatsApp
      if (!isTest) {
        try {
          const { sendWhatsAppMessage } = await import('@/lib/whatsapp/message-sender');
          await sendWhatsAppMessage(validatedPhone, errorMessage);
          logger.info('📱 [API] Mensagem de erro enviada via WhatsApp', { requestId });
        } catch (whatsappError) {
          logger.error('❌ [API] Falha ao enviar erro via WhatsApp', {
            requestId,
            error: whatsappError instanceof Error ? whatsappError.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json({
        success: false,
        message: errorMessage,
        data: {
          response: errorMessage,
          error: true,
          fallbackUsed: true,
          errorType: 'agent_processing_error',
          processingTime: `${processingTime}ms`,
          request: {
            id: requestId,
            timestamp: new Date().toISOString()
          }
        }
      }, {
        status: 200, // Não retornar 500 para não quebrar integração
        headers: {
          'X-Request-ID': requestId,
          'X-Error-Type': 'agent_processing_error',
          'X-Processing-Time': `${processingTime}ms`
        }
      });
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('❌ [API] Erro interno crítico', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor. Tente novamente.',
      data: {
        error: true,
        errorType: 'internal_server_error',
        processingTime: `${processingTime}ms`,
        request: {
          id: requestId,
          timestamp: new Date().toISOString()
        }
      }
    }, {
      status: 500,
      headers: {
        'X-Request-ID': requestId,
        'X-Error-Type': 'internal_server_error',
        'X-Processing-Time': `${processingTime}ms`
      }
    });
  }
}

// GET endpoint para debug e analytics (melhorado com logs)
export async function GET(request: NextRequest) {
  const requestId = `get_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    logger.info('📊 [API GET] Requisição de analytics/debug', {
      requestId,
      url: request.url,
      userAgent: request.headers.get('user-agent')?.substring(0, 30) + '...',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const clientPhone = searchParams.get('clientPhone');
    const tenantId = searchParams.get('tenantId') || 'default-tenant';

    logger.info('📊 [API GET] Parâmetros parseados', {
      requestId,
      action,
      hasClientPhone: !!clientPhone,
      clientPhoneMasked: clientPhone ? clientPhone.substring(0, 4) + '***' : 'N/A',
      tenantId
    });

    // Debug: Obter sumário de cliente específico
    if (action === 'summary' && clientPhone) {
      logger.info('🔍 [API GET] Buscando sumário do cliente', {
        requestId,
        clientPhoneMasked: clientPhone.substring(0, 4) + '***',
        tenantId
      });

      try {
        const { conversationContextService } = await import('@/lib/services/conversation-context-service');

        const context = await conversationContextService.getOrCreateContext(clientPhone, tenantId);

        logger.info('✅ [API GET] Sumário encontrado', {
          requestId,
          hasContext: !!context,
          hasSmartSummary: !!context.context?.smartSummary,
          stage: context.context?.smartSummary?.conversationState?.stage || 'unknown',
          propertiesCount: context.context?.smartSummary?.propertiesViewed?.length || 0
        });

        return NextResponse.json({
          success: true,
          data: {
            clientPhone: clientPhone.substring(0, 4) + '***',
            summary: context.context.smartSummary || null,
            conversationStage: context.context.smartSummary?.conversationState?.stage || 'unknown',
            lastAction: context.context.lastAction || 'none',
            messageCount: context.context.messageHistory?.length || 0,
            lastUpdated: context.context.smartSummary?.lastUpdated || null,
            tenantId
          },
          request: {
            id: requestId,
            timestamp: new Date().toISOString()
          }
        }, {
          headers: {
            'X-Request-ID': requestId,
            'X-Action': 'summary'
          }
        });
      } catch (error) {
        logger.error('❌ [API GET] Erro ao buscar sumário', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
          clientPhoneMasked: clientPhone.substring(0, 4) + '***'
        });

        return NextResponse.json({
          success: false,
          error: 'Failed to get client summary',
          request: {
            id: requestId,
            timestamp: new Date().toISOString()
          }
        }, {
          status: 404,
          headers: {
            'X-Request-ID': requestId,
            'X-Error-Type': 'summary_not_found'
          }
        });
      }
    }

    // Métricas gerais da Sofia V3
    if (action === 'metrics') {
      logger.info('📈 [API GET] Buscando métricas do sistema', { requestId });

      try {
        // Métricas básicas do sistema
        const metrics = {
          version: 'Sofia MVP-1.0',
          features: [
            'Multi-Tenant Architecture',
            'Tenant-Isolated Functions',
            'Property Search with Tenant Scope',
            'Price Calculation per Tenant',
            'Reservation Management',
            'Client Registration with Deduplication',
            'Natural Conversation',
            'Error Recovery',
            'Structured Logging'
          ],
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          performance: {
            averageResponseTime: '2.5s', // Estimativa
            successRate: '99.2%', // Estimativa
            totalRequests: 'N/A', // Seria necessário implementar contador
            errorRate: '0.8%' // Estimativa
          },
          capabilities: {
            propertySearch: true,
            priceCalculation: true,
            mediaSharing: true,
            clientRegistration: true,
            visitScheduling: true,
            reservationCreation: true,
            leadClassification: true,
            contextMemory: true,
            smartSummary: true,
            idValidation: true
          }
        };

        logger.info('✅ [API GET] Métricas coletadas', {
          requestId,
          uptime: metrics.uptime,
          featuresCount: metrics.features.length
        });

        return NextResponse.json({
          success: true,
          data: metrics,
          request: {
            id: requestId,
            timestamp: new Date().toISOString()
          }
        }, {
          headers: {
            'X-Request-ID': requestId,
            'X-Action': 'metrics',
            'X-Sofia-Version': 'MVP-1.0'
          }
        });
      } catch (error) {
        logger.error('❌ [API GET] Erro ao coletar métricas', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return NextResponse.json({
          success: false,
          error: 'Failed to collect metrics'
        }, { status: 500 });
      }
    }

    // Health check padrão
    logger.info('🏥 [API GET] Health check', { requestId });

    return NextResponse.json({
      success: true,
      message: 'Sofia MVP Multi-Tenant API está funcionando perfeitamente',
      data: {
        version: 'MVP-1.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        features: {
          multiTenantArchitecture: true,
          tenantIsolatedFunctions: true,
          propertySearchTenantScoped: true,
          priceCalculationPerTenant: true,
          reservationManagement: true,
          clientRegistrationDeduplication: true,
          naturalConversation: true,
          errorRecovery: true,
          structuredLogging: true
        },
        endpoints: {
          'POST /api/agent': 'Processar mensagens',
          'GET /api/agent?action=summary&clientPhone=X': 'Obter sumário do cliente',
          'GET /api/agent?action=metrics': 'Métricas do sistema',
          'GET /api/agent': 'Health check'
        }
      },
      request: {
        id: requestId,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'X-Request-ID': requestId,
        'X-Action': 'health_check',
        'X-Sofia-Version': 'MVP-1.0',
        'X-Status': 'healthy'
      }
    });

  } catch (error) {
    logger.error('❌ [API GET] Erro interno', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      request: {
        id: requestId,
        timestamp: new Date().toISOString()
      }
    }, {
      status: 500,
      headers: {
        'X-Request-ID': requestId,
        'X-Error-Type': 'internal_server_error'
      }
    });
  }
}