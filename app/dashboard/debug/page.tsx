'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Alert,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  BugReport as BugIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  result?: any;
  error?: string;
  timestamp?: string;
}

export default function DebugPage() {
  const [agentMessage, setAgentMessage] = useState('');
  const [agentPhone, setAgentPhone] = useState('5511999999999');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState<any>(null);

  const runTest = async (testType: 'agent' | 'webhook' | 'functions' | 'all') => {
    setLoading(true);
    const newResults: TestResult[] = [];

    try {
      if (testType === 'agent' || testType === 'all') {
        // Testar agente
        try {
          const response = await fetch('/api/debug/agent-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: agentMessage || 'Olá, quero alugar um apartamento',
              phone: agentPhone,
            }),
          });
          
          const data = await response.json();
          
          newResults.push({
            test: 'Professional Agent',
            status: data.success ? 'success' : 'error',
            result: data,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          newResults.push({
            test: 'Professional Agent',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (testType === 'webhook' || testType === 'all') {
        // Testar webhook
        try {
          const response = await fetch('/api/debug/webhook-test', {
            method: 'GET',
          });
          
          const data = await response.json();
          setWebhookConfig(data);
          
          newResults.push({
            test: 'Webhook Configuration',
            status: data.success ? 'success' : 'error',
            result: data,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          newResults.push({
            test: 'Webhook Configuration',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (testType === 'functions' || testType === 'all') {
        // Testar funções
        try {
          const response = await fetch('/api/debug/functions-test', {
            method: 'GET',
          });
          
          const data = await response.json();
          
          newResults.push({
            test: 'Agent Functions',
            status: data.success ? 'success' : 'error',
            result: data,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          newResults.push({
            test: 'Agent Functions',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });
        }
      }

    } finally {
      setTestResults(newResults);
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckIcon sx={{ color: 'success.main' }} />;
      case 'error': return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'warning': return <WarningIcon sx={{ color: 'warning.main' }} />;
      default: return <InfoIcon sx={{ color: 'info.main' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BugIcon /> Debug Center - Agente de IA
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Centro de diagnóstico e testes para o sistema de IA
        </Typography>
      </Box>

      {/* Test Controls */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🤖 Teste do Agente
              </Typography>
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Mensagem de teste"
                  value={agentMessage}
                  onChange={(e) => setAgentMessage(e.target.value)}
                  placeholder="Ex: Olá, quero alugar um apartamento em Florianópolis"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Telefone de teste"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  placeholder="5511999999999"
                />
              </Box>
              <Button
                variant="contained"
                onClick={() => runTest('agent')}
                disabled={loading}
                startIcon={<PlayIcon />}
              >
                Testar Agente
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔧 Testes Gerais
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Button
                  variant="outlined"
                  onClick={() => runTest('webhook')}
                  disabled={loading}
                  startIcon={<SettingsIcon />}
                >
                  Webhook
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => runTest('functions')}
                  disabled={loading}
                  startIcon={<AnalyticsIcon />}
                >
                  Funções
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => runTest('all')}
                  disabled={loading}
                  startIcon={<RefreshIcon />}
                >
                  Todos os Testes
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Loading */}
      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Executando testes...
          </Typography>
        </Box>
      )}

      {/* Webhook Configuration */}
      {webhookConfig && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📡 Configuração do Webhook
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Webhook URL:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                  {webhookConfig.webhook_config?.webhook_url}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Status das Credenciais:</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip 
                    label={`Verify Token: ${webhookConfig.webhook_config?.verify_token}`}
                    color={webhookConfig.webhook_config?.verify_token?.includes('✅') ? 'success' : 'error'}
                    size="small"
                  />
                  <Chip 
                    label={`Access Token: ${webhookConfig.webhook_config?.access_token}`}
                    color={webhookConfig.webhook_config?.access_token?.includes('✅') ? 'success' : 'error'}
                    size="small"
                  />
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 Resultados dos Testes
            </Typography>
            
            {testResults.map((result, index) => (
              <Accordion key={index} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    {getStatusIcon(result.status)}
                    <Typography variant="subtitle1">
                      {result.test}
                    </Typography>
                    <Chip 
                      label={result.status.toUpperCase()}
                      color={getStatusColor(result.status) as any}
                      size="small"
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {result.error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Erro:</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {result.error}
                      </Typography>
                    </Alert>
                  ) : (
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Resultado:
                      </Typography>
                      <pre style={{ 
                        fontSize: '12px', 
                        overflow: 'auto', 
                        maxHeight: '400px',
                        margin: 0,
                        whiteSpace: 'pre-wrap'
                      }}>
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    </Paper>
                  )}
                  
                  {result.timestamp && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                      Executado em: {new Date(result.timestamp).toLocaleString()}
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📚 Como Usar este Debug Center
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <InfoIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="1. Teste do Agente"
                secondary="Digite uma mensagem e telefone para testar o processamento completo do agente IA"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SettingsIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="2. Teste do Webhook"
                secondary="Verifica se as credenciais do WhatsApp estão configuradas corretamente"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <AnalyticsIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="3. Teste das Funções"
                secondary="Testa a detecção de intenções, busca de propriedades e sistema de cache"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}