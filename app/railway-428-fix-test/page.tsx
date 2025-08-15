'use client';

import React, { useState, useEffect } from 'react';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Build as FixIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Web as WebIcon,
  Timer as TimerIcon
} from '@mui/icons-material';

interface TestResult {
  success: boolean;
  message: string;
  duration: number;
  environment: any;
  result?: any;
  fix?: any;
  error?: string;
  is428Error?: boolean;
}

interface FixInfo {
  fix: {
    name: string;
    description: string;
    errorCode: number;
    errorMeaning: string;
    solution: any;
    features: string[];
  };
  usage: any;
  environment: any;
}

export default function Railway428FixTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixInfo, setFixInfo] = useState<FixInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  useEffect(() => {
    // Load fix information on component mount
    loadFixInfo();
  }, []);

  const loadFixInfo = async () => {
    try {
      const response = await fetch('/api/test-railway-428-fix', {
        method: 'GET'
      });
      
      if (response.ok) {
        const info = await response.json();
        setFixInfo(info);
      }
    } catch (err) {
      console.warn('Failed to load fix info:', err);
    }
  };

  const run428FixTest = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);
    setProgress(0);
    setCurrentStep('Iniciando teste do fix 428...');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 5;
        });
      }, 2000);

      const steps = [
        'Aplicando headers específicos...',
        'Configurando WebSocket compatível...',
        'Criando socket com fix 428...',
        'Aguardando conexão estável...',
        'Gerando QR code...'
      ];

      let stepIndex = 0;
      const stepInterval = setInterval(() => {
        if (stepIndex < steps.length) {
          setCurrentStep(steps[stepIndex]);
          stepIndex++;
        }
      }, 180000 / steps.length); // 3 minutes total

      const response = await fetch('/api/test-railway-428-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
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
      testType: 'railway_428_fix'
    };

    const blob = new Blob([JSON.stringify(resultData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `428-fix-test-${results.environment.isRailway ? 'railway' : 'local'}-${Date.now()}.json`;
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom align="center">
        🚨 Fix para Erro 428 Railway
      </Typography>
      
      <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
        Correção específica para "Connection closed before QR: 428" no Railway
      </Typography>

      <Grid container spacing={3}>
        {/* Control Panel */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🎛️ Teste do Fix 428
              </Typography>

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

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Erro 428:</strong> Precondition Required
                  <br />
                  Indica que o WhatsApp precisa de headers/condições específicas.
                </Typography>
              </Alert>
            </CardContent>

            <CardActions>
              <Button
                variant="contained"
                startIcon={isRunning ? <CircularProgress size={20} /> : <FixIcon />}
                onClick={run428FixTest}
                disabled={isRunning}
                fullWidth
                size="large"
                color="primary"
              >
                {isRunning ? 'Testando Fix 428...' : 'Testar Fix 428'}
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

          {/* Fix Information */}
          {fixInfo && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🔧 Informações do Fix
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Chip 
                    label={`Erro ${fixInfo.fix.errorCode}: ${fixInfo.fix.errorMeaning}`}
                    color="warning"
                    size="small"
                    icon={<ErrorIcon />}
                  />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Solução:</strong> {fixInfo.fix.description}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

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
                    🚨 Resultado do Fix 428
                  </Typography>
                  <Chip
                    icon={results.success ? <CheckIcon /> : <ErrorIcon />}
                    label={results.success ? 'FIX FUNCIONOU!' : 'FIX FALHOU'}
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

                {/* Error Analysis */}
                {!results.success && results.is428Error && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Análise:</strong> O erro 428 ainda está ocorrendo. 
                      O fix precisa de refinamento adicional.
                    </Typography>
                  </Alert>
                )}

                {!results.success && !results.is428Error && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Análise:</strong> Não é mais erro 428! 
                      O fix resolveu o problema original, mas há outro issue.
                    </Typography>
                  </Alert>
                )}

                {/* QR Code Display */}
                {results.success && results.result?.qrCode && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      🎉 QR Code Gerado com Fix 428!
                    </Typography>
                    <img 
                      src={results.result.qrCode}
                      alt="QR Code"
                      style={{ maxWidth: '256px', border: '1px solid #ddd' }}
                    />
                    <Typography variant="caption" display="block">
                      Tamanho: {results.result.qrLength} bytes
                    </Typography>
                  </Box>
                )}

                {/* Fix Details */}
                {results.fix && (
                  <Accordion sx={{ mt: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>🔧 Detalhes do Fix Aplicado</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          <strong>Tipo:</strong> {results.fix.type}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Descrição:</strong> {results.fix.description}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Status:</strong> {results.fix.applied ? 'Aplicado' : 'Não aplicado'}
                        </Typography>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Fix Features */}
                {fixInfo && (
                  <Accordion sx={{ mt: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>✨ Recursos do Fix</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {fixInfo.fix.features.map((feature, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <CheckIcon color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={feature} />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Technical Details */}
                {fixInfo && (
                  <Accordion sx={{ mt: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>⚙️ Detalhes Técnicos</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Headers:
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            {fixInfo.fix.solution.headers}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Versão:
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            {fixInfo.fix.solution.version}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Timeouts:
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            {fixInfo.fix.solution.timeouts}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            WebSocket:
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            {fixInfo.fix.solution.websocket}
                          </Typography>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!results && !isRunning && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🚨 Sobre o Erro 428
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>HTTP 428 - Precondition Required:</strong>
                </Typography>
                <Typography variant="body2" paragraph>
                  Este erro indica que o servidor (WhatsApp) requer condições específicas
                  que não estão sendo atendidas na requisição.
                </Typography>
                
                <Typography variant="body2" paragraph>
                  <strong>Causas comuns:</strong>
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><SecurityIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Headers de User-Agent incorretos ou ausentes" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><WebIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Origin/Referer headers inadequados" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><SpeedIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Versão do WhatsApp incompatível" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><TimerIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Timeouts muito agressivos" />
                  </ListItem>
                </List>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="body2" color="text.secondary">
                  Este fix implementa headers apropriados, timeouts estendidos, e 
                  configuração de WebSocket compatível para resolver o erro 428.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}