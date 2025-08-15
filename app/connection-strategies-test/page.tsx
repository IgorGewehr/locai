'use client';

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  TextField,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Speed as StrategyIcon,
  Timeline as TimelineIcon,
  PhoneAndroid as MobileIcon,
  Computer as DesktopIcon,
  Settings as ConfigIcon
} from '@mui/icons-material';

interface TestResult {
  success: boolean;
  message: string;
  duration: number;
  environment: any;
  results?: any[];
  summary?: any;
}

export default function ConnectionStrategiesTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeout, setTimeout] = useState(60000); // 60 seconds per strategy
  const [progress, setProgress] = useState(0);
  const [currentStrategy, setCurrentStrategy] = useState('');

  const strategies = [
    { 
      name: 'Conservative', 
      description: 'Long timeouts, minimal retries',
      icon: <TimelineIcon />,
      color: 'primary'
    },
    { 
      name: 'Mobile Emulation', 
      description: 'Pretend to be mobile WhatsApp',
      icon: <MobileIcon />,
      color: 'secondary'
    },
    { 
      name: 'Minimal Config', 
      description: 'Bare minimum configuration',
      icon: <ConfigIcon />,
      color: 'success'
    },
    { 
      name: 'Legacy Compatible', 
      description: 'Use older WhatsApp version',
      icon: <DesktopIcon />,
      color: 'warning'
    }
  ];

  const runStrategiesTest = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);
    setProgress(0);
    setCurrentStrategy('Iniciando teste de estratégias...');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 5;
        });
      }, 2000);

      let strategyIndex = 0;
      const strategyInterval = setInterval(() => {
        if (strategyIndex < strategies.length) {
          setCurrentStrategy(`Testando: ${strategies[strategyIndex].name}`);
          strategyIndex++;
        }
      }, timeout / strategies.length);

      const response = await fetch('/api/test-railway-connection-strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timeout }),
      });

      clearInterval(progressInterval);
      clearInterval(strategyInterval);
      setProgress(100);
      setCurrentStrategy('Teste concluído!');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: TestResult = await response.json();
      setResults(result);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsRunning(false);
    }
  };

  const downloadResults = () => {
    if (!results) return;

    const resultData = {
      ...results,
      timestamp: new Date().toISOString(),
      testType: 'railway_connection_strategies'
    };

    const blob = new Blob([JSON.stringify(resultData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connection-strategies-test-${results.environment.isRailway ? 'railway' : 'local'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearResults = () => {
    setResults(null);
    setError(null);
    setProgress(0);
    setCurrentStrategy('');
  };

  const getStrategyIcon = (strategyName: string) => {
    const strategy = strategies.find(s => s.name === strategyName);
    return strategy ? strategy.icon : <StrategyIcon />;
  };

  const getStrategyColor = (strategyName: string) => {
    const strategy = strategies.find(s => s.name === strategyName);
    return strategy ? strategy.color : 'default';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom align="center">
        🚀 Teste de Estratégias de Conexão
      </Typography>
      
      <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
        Testa diferentes estratégias de conexão para encontrar a que funciona melhor no Railway
      </Typography>

      <Grid container spacing={3}>
        {/* Control Panel */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🎛️ Painel de Controle
              </Typography>

              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Timeout por estratégia (ms)"
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(Number(e.target.value))}
                  disabled={isRunning}
                />
              </Box>

              {isRunning && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    {currentStrategy}
                  </Typography>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    {Math.round(progress)}% concluído
                  </Typography>
                </Box>
              )}
            </CardContent>

            <CardActions>
              <Button
                variant="contained"
                startIcon={isRunning ? <CircularProgress size={20} /> : <StrategyIcon />}
                onClick={runStrategiesTest}
                disabled={isRunning}
                fullWidth
                size="large"
                color="primary"
              >
                {isRunning ? 'Testando Estratégias...' : 'Testar Estratégias'}
              </Button>
            </CardActions>

            {(results || error) && (
              <CardActions>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={clearResults}
                  size="small"
                >
                  Limpar
                </Button>
                {results && (
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={downloadResults}
                    size="small"
                  >
                    Baixar
                  </Button>
                )}
              </CardActions>
            )}
          </Card>

          {/* Strategies List */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🚀 Estratégias Testadas
              </Typography>
              <List dense>
                {strategies.map((strategy, index) => (
                  <ListItem key={strategy.name}>
                    <ListItemIcon>
                      {strategy.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={strategy.name}
                      secondary={strategy.description}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Environment Info */}
          {results && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🌍 Ambiente
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Chip 
                    label={results.environment.isRailway ? '🚂 Railway' : '💻 Local'} 
                    color={results.environment.isRailway ? 'secondary' : 'primary'}
                    size="small"
                  />
                  <Chip 
                    label={`Node.js ${results.environment.nodeVersion}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip 
                    label={`${results.environment.platform}`}
                    size="small" 
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Results Panel */}
        <Grid item xs={12} md={8}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <strong>Erro:</strong> {error}
            </Alert>
          )}

          {results && (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    🚀 Resultados das Estratégias
                  </Typography>
                  <Chip
                    icon={results.success ? <CheckIcon /> : <ErrorIcon />}
                    label={results.success ? 'ESTRATÉGIA ENCONTRADA!' : 'TODAS FALHARAM'}
                    color={results.success ? 'success' : 'error'}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Duração:</strong> {results.duration}ms | 
                  <strong> Ambiente:</strong> {results.environment.isRailway ? 'Railway' : 'Local'}
                </Typography>

                <Alert severity={results.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                  {results.message}
                </Alert>

                {/* Summary */}
                {results.summary && (
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        📊 Resumo
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Total de Estratégias:</strong> {results.summary.totalStrategies}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Funcionando:</strong> {results.summary.workingStrategies}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Falharam:</strong> {results.summary.failedStrategies}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Melhor:</strong> {results.summary.bestStrategy || 'Nenhuma'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                {/* Individual Strategy Results */}
                {results.results && (
                  <Box>
                    {results.results.map((result, index) => (
                      <Accordion key={index}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStrategyIcon(result.strategy)}
                            <Typography sx={{ flexGrow: 1 }}>
                              {result.strategy}: {result.description}
                            </Typography>
                            <Chip
                              label={result.success ? 'SUCESSO' : 'FALHOU'}
                              color={result.success ? 'success' : 'error'}
                              size="small"
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box>
                            {result.success ? (
                              <Box>
                                <Typography variant="body2" gutterBottom>
                                  <strong>✅ Esta estratégia funcionou!</strong>
                                </Typography>
                                {result.qrCode && (
                                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                                    <Typography variant="h6" gutterBottom>
                                      QR Code Gerado
                                    </Typography>
                                    <img 
                                      src={result.qrCode}
                                      alt="QR Code"
                                      style={{ maxWidth: '200px', border: '1px solid #ddd' }}
                                    />
                                    <Typography variant="caption" display="block">
                                      Tamanho: {result.qrLength} bytes
                                    </Typography>
                                  </Box>
                                )}
                                {result.reason && (
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Motivo:</strong> {result.reason}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Box>
                                <Typography variant="body2" gutterBottom color="error">
                                  <strong>❌ Erro:</strong> {result.error}
                                </Typography>
                              </Box>
                            )}
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Typography variant="subtitle2" gutterBottom>
                              Configuração da Estratégia:
                            </Typography>
                            <pre style={{ 
                              fontSize: '12px',
                              backgroundColor: '#f5f5f5',
                              padding: '10px',
                              borderRadius: '4px',
                              overflow: 'auto',
                              maxHeight: '200px'
                            }}>
                              {JSON.stringify(result.strategyConfig || {}, null, 2)}
                            </pre>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!results && !isRunning && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🚀 Sobre Este Teste
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>O que este teste faz:</strong>
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>1.</strong> Testa 4 estratégias diferentes de conexão
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>2.</strong> Cada estratégia usa configurações otimizadas diferentes
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>3.</strong> Para quando encontra uma estratégia que funciona
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>4.</strong> Mostra qual configuração gera QR code com sucesso
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="body2" color="text.secondary">
                  Este teste ajuda a identificar qual abordagem de conexão funciona melhor 
                  no ambiente Railway para resolver o problema de conexão fechada prematuramente.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}