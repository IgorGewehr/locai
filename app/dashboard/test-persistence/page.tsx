'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Alert,
  Paper,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  History as HistoryIcon,
  Storage as StorageIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Memory as MemoryIcon,
} from '@mui/icons-material';

interface TestResult {
  test: string;
  success: boolean;
  results?: any;
  error?: string;
}

export default function TestPersistencePage() {
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const runTest = async (testType: string) => {
    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/test-persistence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: testType }),
      });

      const data = await response.json();
      setTestResult({
        test: testType,
        success: data.success,
        results: data.results,
        error: data.error,
      });
    } catch (error) {
      setTestResult({
        test: testType,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderBasicTestResults = (results: any) => {
    if (!results) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          📊 Resultados do Teste Básico
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Primeira Mensagem
              </Typography>
              <Typography variant="body2" color="text.secondary">
                👤 Usuário: {results.first_message.user}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                🤖 Bot: {results.first_message.assistant}
              </Typography>
              <Chip 
                label={`Intent: ${results.first_message.intent}`} 
                size="small" 
                sx={{ mt: 1 }}
              />
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Segunda Mensagem (após limpar memória)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                👤 Usuário: {results.second_message.user}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                🤖 Bot: {results.second_message.assistant}
              </Typography>
              <Chip 
                label={`Intent: ${results.second_message.intent}`} 
                size="small" 
                sx={{ mt: 1 }}
              />
            </Paper>
          </Grid>
        </Grid>

        <Paper sx={{ p: 2, mt: 2, bgcolor: 'primary.50' }}>
          <Typography variant="subtitle2" gutterBottom>
            💾 Contexto Recuperado do Banco
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Chip 
              icon={<StorageIcon />}
              label={`Cidade: ${results.context_from_db.city || 'não definida'}`}
              color={results.context_from_db.city ? 'success' : 'default'}
            />
            <Chip 
              label={`Estágio: ${results.context_from_db.stage}`}
            />
            <Chip 
              label={`Mensagens: ${results.context_from_db.messageCount}`}
            />
          </Stack>
        </Paper>

        <Alert 
          severity={results.context_from_db.city ? 'success' : 'warning'}
          sx={{ mt: 2 }}
        >
          {results.context_from_db.city ? 
            '✅ Contexto foi persistido e recuperado com sucesso!' :
            '⚠️ Contexto não foi totalmente preservado'
          }
        </Alert>
      </Box>
    );
  };

  const renderHistoryTestResults = (results: any) => {
    if (!results) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          📜 Resultados do Teste de Histórico
        </Typography>

        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom>
            Pergunta Final
          </Typography>
          <Typography variant="body2" color="text.secondary">
            👤 Usuário: {results.final_question}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            🤖 Bot: {results.final_response}
          </Typography>
        </Paper>

        <Alert 
          severity={results.context_preserved ? 'success' : 'error'}
          sx={{ mt: 2 }}
        >
          {results.context_preserved ? 
            '✅ O bot lembrou da cidade mencionada anteriormente (Florianópolis)!' :
            '❌ O bot não conseguiu lembrar da cidade mencionada'
          }
        </Alert>

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
          💬 Histórico Completo ({results.conversation_length} mensagens)
        </Typography>
        <List sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
          {results.full_history?.map((msg: any, index: number) => (
            <ListItem key={index} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip 
                      label={msg.role === 'user' ? '👤 Usuário' : '🤖 Bot'} 
                      size="small"
                      color={msg.role === 'user' ? 'primary' : 'secondary'}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Stack>
                }
                secondary={msg.content}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <StorageIcon /> Teste de Persistência e Histórico
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Verifica se o contexto e histórico são salvos e recuperados corretamente do banco de dados
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <MemoryIcon color="primary" />
                <Typography variant="h6">
                  Teste de Persistência Básica
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Testa se o contexto é salvo no banco e recuperado corretamente quando a memória é limpa
              </Typography>
              <Button
                variant="contained"
                onClick={() => runTest('basic')}
                disabled={loading}
                startIcon={<PlayIcon />}
                fullWidth
              >
                Executar Teste Básico
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <HistoryIcon color="primary" />
                <Typography variant="h6">
                  Teste de Histórico
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Testa se o histórico de conversas é carregado e influencia as respostas do bot
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => runTest('history')}
                disabled={loading}
                startIcon={<PlayIcon />}
                fullWidth
              >
                Executar Teste de Histórico
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {testResult && (
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              {testResult.success ? (
                <CheckIcon color="success" />
              ) : (
                <ErrorIcon color="error" />
              )}
              <Typography variant="h6">
                Resultado do Teste: {testResult.test}
              </Typography>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {testResult.success ? (
              testResult.test === 'basic' ? 
                renderBasicTestResults(testResult.results) : 
                renderHistoryTestResults(testResult.results)
            ) : (
              <Alert severity="error">
                Erro: {testResult.error}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card sx={{ mt: 4, bgcolor: 'info.50' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            💡 Como Funciona
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="1. Persistência de Contexto"
                secondary="Salva informações da conversa (cidade, nome, preferências) no Firestore para recuperar mesmo após reiniciar o servidor"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="2. Histórico de Mensagens"
                secondary="Armazena todas as mensagens trocadas para o bot entender o contexto completo da conversa"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="3. TTL de 24 horas"
                secondary="Contextos são mantidos por 24 horas de inatividade antes de expirar"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}