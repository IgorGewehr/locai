'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link as MuiLink
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthProvider';

export default function DiagnosticoPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    setDiagnostics(null);

    try {
      const token = await user?.getIdToken();

      const response = await fetch('/api/admin/diagnose', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao executar diagnóstico');
      }

      setDiagnostics(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
      case 'needs_index':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <SuccessIcon sx={{ color: '#10b981' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#ef4444' }} />;
      case 'warning':
      case 'needs_index':
        return <WarningIcon sx={{ color: '#f59e0b' }} />;
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 4
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        {/* Header */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px'
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <BugIcon sx={{ fontSize: 40, color: '#ffffff' }} />
            <Box>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#ffffff' }}>
                Diagnóstico do Painel Admin
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Verifique a saúde dos dados e configurações do Firebase
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Run Button */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px'
          }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <PlayIcon />}
            onClick={runDiagnostics}
            disabled={loading}
            sx={{
              py: 1.5,
              px: 4,
              bgcolor: '#8b5cf6',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#7c3aed'
              }
            }}
          >
            {loading ? 'Executando...' : 'Executar Diagnóstico'}
          </Button>

          {loading && (
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 2 }}>
              Analisando Firebase, usuários, tickets e índices...
            </Typography>
          )}
        </Paper>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Erro ao executar diagnóstico</AlertTitle>
            {error}
          </Alert>
        )}

        {/* Results */}
        {diagnostics && (
          <>
            {/* Summary */}
            <Paper
              sx={{
                p: 3,
                mb: 3,
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px'
              }}
            >
              <Typography variant="h6" fontWeight={600} sx={{ color: '#ffffff', mb: 2 }}>
                Resumo
              </Typography>

              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip
                  label={`${diagnostics.summary.success} Sucessos`}
                  color="success"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label={`${diagnostics.summary.warnings} Avisos`}
                  color="warning"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label={`${diagnostics.summary.errors} Erros`}
                  color="error"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label={`Status: ${diagnostics.summary.overallStatus}`}
                  sx={{
                    fontWeight: 600,
                    bgcolor: diagnostics.summary.overallStatus === 'healthy' ? '#10b981' :
                             diagnostics.summary.overallStatus === 'needs_attention' ? '#f59e0b' :
                             '#ef4444',
                    color: '#ffffff'
                  }}
                />
              </Stack>
            </Paper>

            {/* Recommendations */}
            {diagnostics.recommendations && diagnostics.recommendations.length > 0 && (
              <Paper
                sx={{
                  p: 3,
                  mb: 3,
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px'
                }}
              >
                <Typography variant="h6" fontWeight={600} sx={{ color: '#ffffff', mb: 2 }}>
                  Recomendações
                </Typography>

                <Stack spacing={2}>
                  {diagnostics.recommendations.map((rec: any, index: number) => (
                    <Alert
                      key={index}
                      severity={rec.priority === 'high' ? 'error' : 'warning'}
                      sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      <AlertTitle sx={{ fontWeight: 600 }}>
                        {rec.priority === 'high' ? 'Ação Necessária' : 'Recomendação'}
                      </AlertTitle>
                      {rec.message}
                      {rec.link && (
                        <Box sx={{ mt: 1 }}>
                          <MuiLink
                            href={rec.link}
                            target="_blank"
                            rel="noopener"
                            sx={{ color: '#8b5cf6', fontWeight: 600 }}
                          >
                            Criar Índice no Firebase →
                          </MuiLink>
                        </Box>
                      )}
                    </Alert>
                  ))}
                </Stack>
              </Paper>
            )}

            {/* Test Results */}
            <Paper
              sx={{
                p: 3,
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px'
              }}
            >
              <Typography variant="h6" fontWeight={600} sx={{ color: '#ffffff', mb: 2 }}>
                Resultados Detalhados
              </Typography>

              <Stack spacing={2}>
                {diagnostics.tests.map((test: any, index: number) => (
                  <Accordion
                    key={index}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      '&:before': { display: 'none' }
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}>
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
                        {getStatusIcon(test.status)}
                        <Typography fontWeight={600}>{test.name}</Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <Chip
                          label={test.status}
                          color={getStatusColor(test.status)}
                          size="small"
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box
                        component="pre"
                        sx={{
                          bgcolor: 'rgba(0, 0, 0, 0.3)',
                          p: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          fontSize: '0.875rem',
                          fontFamily: 'monospace'
                        }}
                      >
                        {JSON.stringify(test, null, 2)}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </Paper>
          </>
        )}
      </Box>
    </Box>
  );
}
