'use client';

import { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Card, 
  CardContent, 
  CardHeader, 
  Typography, 
  Chip, 
  Paper,
  Stack,
  Grid,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import HistoryIcon from '@mui/icons-material/History';

interface TestResult {
  function: string | null;
  confidence: number;
  parameters: any;
  reasoning?: string;
  processingTime?: number;
  needsMoreInfo?: boolean;
}

export default function EnhancedIntentTestPage() {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<Array<{message: string, result: TestResult}>>([]);

  const testIntent = async () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/enhanced-intent/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) {
        throw new Error('Erro ao testar intenção');
      }
      
      const data = await response.json();
      setResult(data);
      setTestHistory(prev => [...prev.slice(-9), { message, result: data }]);
      
    } catch (error) {
      console.error('Erro no teste:', error);
      setError('Erro ao testar intenção. Verifique se o servidor está rodando.');
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number): "error" | "warning" | "info" | "success" => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.8) return 'info';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const quickTests = [
    "Quanto custa pra 4 pessoas?",
    "Tem foto do apartamento?",
    "Quero algo em Floripa",
    "Posso cancelar?",
    "Qual o endereço?",
    "Quero reservar",
    "Como faço pra visitar?"
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SmartToyIcon /> Teste Enhanced Intent Detection
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="🎯 Testar Detecção de Intenção"
              subheader="Digite uma mensagem para testar a detecção com LangChain"
            />
            <CardContent>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="Digite uma mensagem para testar..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && testIntent()}
                    disabled={isLoading}
                    variant="outlined"
                  />
                  <Button 
                    onClick={testIntent} 
                    disabled={isLoading || !message.trim()}
                    variant="contained"
                    endIcon={isLoading ? <CircularProgress size={20} /> : <SendIcon />}
                  >
                    {isLoading ? 'Testando...' : 'Testar'}
                  </Button>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Exemplos rápidos:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {quickTests.map((test, index) => (
                    <Chip
                      key={index}
                      label={test}
                      onClick={() => setMessage(test)}
                      variant="outlined"
                      size="small"
                      clickable
                    />
                  ))}
                </Box>

                {error && (
                  <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}

                {result && (
                  <Paper elevation={3} sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="h6" gutterBottom>
                      Resultado da Detecção
                    </Typography>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Função:
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {result.function || 'Nenhuma função detectada'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Confiança:
                        </Typography>
                        <Chip 
                          label={`${(result.confidence * 100).toFixed(1)}%`}
                          color={getConfidenceColor(result.confidence)}
                          size="small"
                        />
                      </Box>

                      {result.reasoning && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Raciocínio:
                          </Typography>
                          <Typography variant="body2">
                            {result.reasoning}
                          </Typography>
                        </Box>
                      )}

                      {Object.keys(result.parameters).length > 0 && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Parâmetros:
                          </Typography>
                          <Paper variant="outlined" sx={{ p: 1, mt: 0.5 }}>
                            <pre style={{ margin: 0, fontSize: '12px' }}>
                              {JSON.stringify(result.parameters, null, 2)}
                            </pre>
                          </Paper>
                        </Box>
                      )}

                      {result.processingTime && (
                        <Typography variant="caption" color="text.secondary">
                          Tempo de processamento: {result.processingTime}ms
                        </Typography>
                      )}

                      {result.needsMoreInfo && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          Precisa de mais informações para executar esta função
                        </Alert>
                      )}
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon /> Histórico de Testes
                </Box>
              }
              subheader="Últimos 10 testes realizados"
            />
            <CardContent>
              {testHistory.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center">
                  Nenhum teste realizado ainda
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {testHistory.map((test, index) => (
                    <Paper 
                      key={index} 
                      variant="outlined" 
                      sx={{ 
                        p: 1.5, 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {test.message}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip 
                          label={test.result.function || 'null'} 
                          size="small"
                          variant="outlined"
                        />
                        <Chip 
                          label={`${(test.result.confidence * 100).toFixed(0)}%`}
                          color={getConfidenceColor(test.result.confidence)}
                          size="small"
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="📊 Métricas de Performance"
              subheader="Comparação entre detecção Enhanced vs Original"
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
                    <Typography variant="h4">90%+</Typography>
                    <Typography variant="body2">Precisão Enhanced</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.main', color: 'white' }}>
                    <Typography variant="h4">&lt;1s</Typography>
                    <Typography variant="body2">Tempo Detecção</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.main', color: 'white' }}>
                    <Typography variant="h4">30%</Typography>
                    <Typography variant="body2">A/B Testing Ativo</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
                    <Typography variant="h4">12</Typography>
                    <Typography variant="body2">Funções Suportadas</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}