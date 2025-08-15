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
  LinearProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Build as FixIcon
} from '@mui/icons-material';

interface TestResult {
  success: boolean;
  message: string;
  duration: number;
  environment: any;
  testResults?: any;
}

export default function WebSocketFixTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeout, setTimeout] = useState(90000); // 90 seconds
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const runWebSocketFixTest = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);
    setProgress(0);
    setCurrentStep('Iniciando teste do fix...');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 1000);

      const steps = [
        'Testando polyfill WebSocket...',
        'Verificando funcionalidade de masking...',
        'Criando socket Railway-compatível...',
        'Aguardando QR code...',
        'Finalizando teste...'
      ];

      let stepIndex = 0;
      const stepInterval = setInterval(() => {
        if (stepIndex < steps.length) {
          setCurrentStep(steps[stepIndex]);
          stepIndex++;
        }
      }, timeout / steps.length);

      const response = await fetch('/api/test-railway-websocket-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timeout }),
      });

      clearInterval(progressInterval);
      clearInterval(stepInterval);
      setProgress(100);
      setCurrentStep('Teste concluído!');

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
      testType: 'railway_websocket_fix'
    };

    const blob = new Blob([JSON.stringify(resultData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `websocket-fix-test-${results.environment.isRailway ? 'railway' : 'local'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearResults = () => {
    setResults(null);
    setError(null);
    setProgress(0);
    setCurrentStep('');
  };

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckIcon color="success" /> : <ErrorIcon color="error" />;
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'success' : 'error';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom align="center">
        🔧 Teste do Fix WebSocket Masking
      </Typography>
      
      <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
        Teste da correção para o erro "TypeError: b.mask is not a function" no Railway
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
                  label="Timeout (ms)"
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(Number(e.target.value))}
                  disabled={isRunning}
                />
              </Box>

              {isRunning && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    {currentStep}
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
                startIcon={isRunning ? <CircularProgress size={20} /> : <FixIcon />}
                onClick={runWebSocketFixTest}
                disabled={isRunning}
                fullWidth
                size="large"
                color="primary"
              >
                {isRunning ? 'Testando Fix...' : 'Testar Fix WebSocket'}
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
                  <Chip 
                    label={`ENV: ${results.environment.nodeEnv}`}
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
                    🔧 Resultados do Teste de Fix
                  </Typography>
                  <Chip
                    icon={getStatusIcon(results.success)}
                    label={results.success ? 'FIX FUNCIONA!' : 'FIX FALHOU'}
                    color={getStatusColor(results.success)}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Duração:</strong> {results.duration}ms | 
                  <strong> Ambiente:</strong> {results.environment.isRailway ? 'Railway' : 'Local'}
                </Typography>

                <Alert severity={results.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                  {results.message}
                </Alert>

                {/* Detailed Test Results */}
                {results.testResults && (
                  <>
                    {/* Polyfill Test */}
                    {results.testResults.polyfillTest && (
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon(results.testResults.polyfillTest.success)}
                            <Typography>🔧 Teste do Polyfill WebSocket</Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" gutterBottom>
                              <strong>Ambiente Railway:</strong> {results.testResults.polyfillTest.isRailway ? 'Sim' : 'Não'}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              <strong>Masking Funciona:</strong> {results.testResults.polyfillTest.maskingWorks ? 'Sim' : 'Não'}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              <strong>Polyfill Aplicado:</strong> {results.testResults.polyfillTest.polyfillApplied ? 'Sim' : 'Não'}
                            </Typography>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {/* Masking Test */}
                    {results.testResults.maskingTest && (
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon(results.testResults.maskingTest.success)}
                            <Typography>🧪 Teste de Funcionalidade de Masking</Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {results.testResults.maskingTest.tests && (
                            <Box>
                              <Typography variant="body2" gutterBottom>
                                <strong>XOR Básico:</strong> {results.testResults.maskingTest.tests.basicXOR ? '✅' : '❌'}
                              </Typography>
                              <Typography variant="body2" gutterBottom>
                                <strong>Round-trip:</strong> {results.testResults.maskingTest.tests.roundTrip ? '✅' : '❌'}
                              </Typography>
                              <Typography variant="body2" gutterBottom>
                                <strong>Buffer Prototype:</strong> {results.testResults.maskingTest.tests.bufferPrototype ? '✅' : '❌'}
                              </Typography>
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {/* Socket Test */}
                    {results.testResults.socketTest && (
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon(results.testResults.socketTest.success)}
                            <Typography>🔌 Teste do Socket Railway Baileys</Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box>
                            {results.testResults.socketTest.success ? (
                              <Box>
                                <Typography variant="body2" gutterBottom>
                                  <strong>QR Gerado:</strong> {results.testResults.socketTest.qrGenerated ? 'Sim' : 'Não'}
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Tamanho QR:</strong> {results.testResults.socketTest.qrLength} bytes
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Eventos:</strong> {results.testResults.socketTest.eventCount}
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Motivo:</strong> {results.testResults.socketTest.reason}
                                </Typography>
                              </Box>
                            ) : (
                              <Box>
                                <Typography variant="body2" gutterBottom color="error">
                                  <strong>Erro:</strong> {results.testResults.socketTest.error}
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Erro de Masking:</strong> {results.testResults.socketTest.isMaskingError ? 'Sim' : 'Não'}
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Erro Original:</strong> {results.testResults.socketTest.isOriginalError ? 'Sim' : 'Não'}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {/* Raw Data */}
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>📋 Dados Completos</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <pre style={{ 
                          whiteSpace: 'pre-wrap', 
                          fontSize: '12px',
                          maxHeight: '400px',
                          overflow: 'auto',
                          backgroundColor: '#f5f5f5',
                          padding: '10px',
                          borderRadius: '4px'
                        }}>
                          {JSON.stringify(results.testResults, null, 2)}
                        </pre>
                      </AccordionDetails>
                    </Accordion>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!results && !isRunning && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🔧 Sobre Este Teste
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>O que este teste faz:</strong>
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>1.</strong> Testa o polyfill WebSocket para Railway
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>2.</strong> Verifica se a funcionalidade de masking está funcionando
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>3.</strong> Cria um socket Baileys usando o fix compatível com Railway
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>4.</strong> Gera um QR code para verificar se o problema "b.mask is not a function" foi resolvido
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="body2" color="text.secondary">
                  Este teste implementa uma correção específica para o erro de WebSocket masking
                  que estava impedindo a geração de QR codes no ambiente Railway.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}