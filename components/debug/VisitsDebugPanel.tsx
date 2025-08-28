// components/debug/VisitsDebugPanel.tsx
// Painel de debug para testar sistema de visitas

'use client';

import React, { useState } from 'react';
import { ApiClient } from '@/lib/utils/api-client';
import {
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Divider
} from '@mui/material';
import {
  BugReport,
  PlayArrow,
  CheckCircle,
  Error,
  Refresh
} from '@mui/icons-material';
import { logger } from '@/lib/utils/logger';
import { useVisits } from '@/lib/firebase/hooks/useVisits';
import { useTenant } from '@/contexts/TenantContext';

interface DebugResult {
  test: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: any;
}

export function VisitsDebugPanel() {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [testing, setTesting] = useState(false);
  const { tenantId } = useTenant();
  const visitsHook = useVisits();

  const runDebugTests = async () => {
    setTesting(true);
    const newResults: DebugResult[] = [];

    // Test 1: Tenant ID
    newResults.push({
      test: 'Verificar Tenant ID',
      status: tenantId ? 'success' : 'error',
      message: tenantId ? `Tenant ID: ${tenantId}` : 'Tenant ID não encontrado',
      details: { tenantId }
    });

    // Test 2: Hook de visitas
    newResults.push({
      test: 'Hook useVisits',
      status: visitsHook.error ? 'error' : 'success',
      message: visitsHook.error ? 
        `Erro: ${visitsHook.error.message}` : 
        `${visitsHook.data?.length || 0} visitas carregadas`,
      details: {
        loading: visitsHook.loading,
        dataLength: visitsHook.data?.length,
        error: visitsHook.error?.message
      }
    });

    // Test 3: API GET /api/visits
    try {
      const response = await ApiClient.get('/api/visits');
      const data = await response.json();
      
      newResults.push({
        test: 'API GET /api/visits',
        status: response.ok && data.success ? 'success' : 'error',
        message: response.ok ? 
          `API funcionando: ${data.data?.length || 0} visitas` : 
          `Erro HTTP ${response.status}: ${data.error}`,
        details: {
          status: response.status,
          success: data.success,
          dataCount: data.data?.length,
          error: data.error
        }
      });
    } catch (error) {
      newResults.push({
        test: 'API GET /api/visits',
        status: 'error',
        message: `Erro de conexão: ${error instanceof Error ? error.message : 'Unknown'}`,
        details: { error }
      });
    }

    // Test 4: Verificar se há visitas no hook
    if (visitsHook.data && visitsHook.data.length > 0) {
      newResults.push({
        test: 'Visitas no Hook',
        status: 'success',
        message: `${visitsHook.data.length} visitas encontradas`,
        details: visitsHook.data.slice(0, 3).map(v => ({
          id: v.id,
          clientName: v.clientName,
          scheduledDate: v.scheduledDate,
          status: v.status
        }))
      });
    } else {
      newResults.push({
        test: 'Visitas no Hook',
        status: 'error',
        message: 'Nenhuma visita encontrada no hook',
        details: { dataLength: 0 }
      });
    }

    // Test 5: Teste de criação (sem realmente criar)
    const mockData = {
      clientName: 'Debug Test Client',
      clientPhone: '+5511999999999',
      propertyId: 'debug_property',
      propertyName: 'Debug Property',
      scheduledDate: new Date().toISOString(),
      scheduledTime: '14:00'
    };

    try {
      // Fazemos uma tentativa de POST para ver se a API aceita
      const response = await ApiClient.post('/api/visits', mockData);

      const data = await response.json();
      
      newResults.push({
        test: 'API POST /api/visits (teste)',
        status: response.ok ? 'success' : 'error',
        message: response.ok ? 
          'API aceita POST corretamente' : 
          `Erro HTTP ${response.status}: ${data.error}`,
        details: {
          status: response.status,
          response: data
        }
      });
    } catch (error) {
      newResults.push({
        test: 'API POST /api/visits (teste)',
        status: 'error',
        message: `Erro de conexão: ${error instanceof Error ? error.message : 'Unknown'}`,
        details: { error }
      });
    }

    setResults(newResults);
    setTesting(false);

    // Log resultados
    logger.info('🧪 Resultados do debug de visitas', { 
      tests: newResults.length,
      passed: newResults.filter(r => r.status === 'success').length,
      failed: newResults.filter(r => r.status === 'error').length
    });
  };

  const getStatusIcon = (status: DebugResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'pending':
        return <CircularProgress size={24} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: DebugResult['status']) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3, border: '2px dashed orange' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <BugReport color="warning" />
        <Typography variant="h6" color="warning.main">
          Debug: Sistema de Visitas
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Este painel debug testa a integração completa do sistema de visitas.
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={testing ? <CircularProgress size={16} /> : <PlayArrow />}
          onClick={runDebugTests}
          disabled={testing}
          color="warning"
        >
          {testing ? 'Testando...' : 'Executar Testes'}
        </Button>
        
        {results.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => visitsHook.refetch()}
            sx={{ ml: 2 }}
          >
            Recarregar Visitas
          </Button>
        )}
      </Box>

      {results.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Resultados dos Testes:
          </Typography>

          <Stack spacing={2}>
            {results.map((result, index) => (
              <Alert
                key={index}
                severity={result.status === 'success' ? 'success' : 'error'}
                icon={getStatusIcon(result.status)}
                sx={{ 
                  '& .MuiAlert-message': { 
                    width: '100%' 
                  } 
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle2">
                      {result.test}
                    </Typography>
                    <Typography variant="body2">
                      {result.message}
                    </Typography>
                  </Box>
                  <Chip
                    label={result.status.toUpperCase()}
                    color={getStatusColor(result.status) as any}
                    size="small"
                  />
                </Stack>
                
                {result.details && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="caption" component="pre" sx={{ fontSize: '0.7rem' }}>
                      {JSON.stringify(result.details, null, 2)}
                    </Typography>
                  </Box>
                )}
              </Alert>
            ))}
          </Stack>

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              ✅ Passou: {results.filter(r => r.status === 'success').length} | 
              ❌ Falhou: {results.filter(r => r.status === 'error').length} | 
              Total: {results.length}
            </Typography>
          </Box>
        </>
      )}
    </Paper>
  );
}