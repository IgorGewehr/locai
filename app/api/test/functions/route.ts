import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * Endpoint para testar todas as funções CRUD
 * Útil para verificar se os logs estão funcionando
 */

// GET /api/test/functions - Lista todas as funções disponíveis
export async function GET(request: NextRequest) {
    const functions = [
        { name: 'search-properties', description: 'Buscar propriedades', params: { location: 'Praia Grande', bedrooms: 2 }},
        { name: 'get-property-details', description: 'Detalhes da propriedade', params: { propertyId: 'prop-123' }},
        { name: 'calculate-price', description: 'Calcular preço', params: { propertyId: 'prop-123', checkIn: '2024-03-01', checkOut: '2024-03-05' }},
        { name: 'check-availability', description: 'Verificar disponibilidade', params: { propertyId: 'prop-123', checkIn: '2024-03-01', checkOut: '2024-03-05' }},
        { name: 'create-reservation', description: 'Criar reserva', params: { propertyId: 'prop-123', clientPhone: '5511999999999', checkIn: '2024-03-01', checkOut: '2024-03-05' }},
        { name: 'register-client', description: 'Registrar cliente', params: { phone: '5511999999999', name: 'Cliente Teste' }},
        { name: 'create-lead', description: 'Criar lead', params: { clientPhone: '5511999999999', source: 'whatsapp' }},
        { name: 'schedule-visit', description: 'Agendar visita', params: { propertyId: 'prop-123', clientPhone: '5511999999999', date: '2024-03-01' }},
    ];

    return NextResponse.json({
        success: true,
        message: 'Funções disponíveis para teste',
        functions,
        usage: {
            testAll: 'POST /api/test/functions {"testAll": true}',
            testOne: 'POST /api/test/functions {"function": "search-properties"}',
            customParams: 'POST /api/test/functions {"function": "search-properties", "params": {...}}'
        }
    });
}

// POST /api/test/functions - Testar uma ou todas as funções
export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const testId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    try {
        const body = await request.json();
        const { testAll, function: funcName, params, tenantId = 'test-tenant' } = body;

        logger.info('🧪 [FUNCTION-TEST] Iniciando testes', {
            testId,
            testAll: !!testAll,
            singleFunction: funcName,
            customParams: !!params
        });

        const baseUrl = new URL(request.url).origin;
        const results = [];

        // Funções para testar
        const functionsToTest = testAll ? [
            { name: 'search-properties', params: { location: 'Praia Grande', bedrooms: 2 }},
            { name: 'get-property-details', params: { propertyId: 'prop-123' }},
            { name: 'calculate-price', params: { propertyId: 'prop-123', checkIn: '2024-03-01', checkOut: '2024-03-05' }},
            { name: 'register-client', params: { phone: '5511999999999', name: 'Cliente Teste' }}
        ] : [{ name: funcName, params: params || { test: true } }];

        // Testar cada função
        for (const func of functionsToTest) {
            const funcStartTime = Date.now();
            
            try {
                logger.info(`🔍 [FUNCTION-TEST] Testando ${func.name}`, {
                    testId,
                    function: func.name,
                    params: func.params
                });

                const response = await fetch(`${baseUrl}/api/ai/functions/${func.name}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-source': 'function-test'
                    },
                    body: JSON.stringify({
                        tenantId,
                        ...func.params
                    })
                });

                const responseData = await response.json();
                const funcTime = Date.now() - funcStartTime;

                results.push({
                    function: func.name,
                    status: response.status,
                    success: response.ok,
                    responseTime: `${funcTime}ms`,
                    data: responseData,
                    error: response.ok ? null : responseData.error
                });

                logger.info(`${response.ok ? '✅' : '❌'} [FUNCTION-TEST] ${func.name} - ${response.status}`, {
                    testId,
                    function: func.name,
                    status: response.status,
                    responseTime: funcTime,
                    success: response.ok
                });

            } catch (error) {
                const funcTime = Date.now() - funcStartTime;
                
                results.push({
                    function: func.name,
                    status: 500,
                    success: false,
                    responseTime: `${funcTime}ms`,
                    data: null,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });

                logger.error(`❌ [FUNCTION-TEST] Erro testando ${func.name}`, {
                    testId,
                    function: func.name,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        const totalTime = Date.now() - startTime;
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        logger.info('🎉 [FUNCTION-TEST] Testes concluídos', {
            testId,
            totalFunctions: results.length,
            successful: successCount,
            failed: failureCount,
            totalTime: `${totalTime}ms`,
            avgTime: `${Math.round(totalTime / results.length)}ms`
        });

        return NextResponse.json({
            success: true,
            testId,
            summary: {
                totalFunctions: results.length,
                successful: successCount,
                failed: failureCount,
                totalTime: `${totalTime}ms`,
                avgTime: `${Math.round(totalTime / results.length)}ms`
            },
            results,
            logs: {
                message: 'Verifique os logs detalhados com:',
                command: `grep "${testId}" logs/app.log`
            }
        });

    } catch (error) {
        const totalTime = Date.now() - startTime;
        
        logger.error('❌ [FUNCTION-TEST] Falha nos testes', {
            testId,
            error: error instanceof Error ? error.message : 'Unknown error',
            totalTime: `${totalTime}ms`
        });

        return NextResponse.json({
            success: false,
            error: 'Function tests failed',
            testId,
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}