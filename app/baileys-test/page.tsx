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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Compare as CompareIcon,
  BugReport as BugIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface TestLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

interface TestResult {
  success: boolean;
  message: string;
  duration: number;
  environment: any;
  testResults?: any;
  logs: TestLog[];
  logCount: number;
  summary: any;
}

export default function BaileysTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testType, setTestType] = useState('full');
  const [timeout, setTimeout] = useState(120000); // 2 minutes
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);
    setProgress(0);
    setCurrentStep('Iniciando teste...');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 1000);

      const steps = [
        'Verificando ambiente...',
        'Testando conectividade...',
        'Importando dependências...',
        'Testando QRCode...',
        'Verificando sistema de arquivos...',
        'Criando socket Baileys...',
        'Aguardando QR code...'
      ];

      let stepIndex = 0;
      const stepInterval = setInterval(() => {
        if (stepIndex < steps.length) {
          setCurrentStep(steps[stepIndex]);
          stepIndex++;
        }
      }, timeout / steps.length);

      const response = await fetch('/api/comprehensive-baileys-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testType, timeout }),
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

  const downloadLogs = () => {
    if (!results) return;

    const logData = {
      environment: results.environment,
      summary: results.summary,
      logs: results.logs,
      testResults: results.testResults,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baileys-test-${results.environment.isRailway ? 'railway' : 'local'}-${Date.now()}.json`;
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

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <ErrorIcon color="error" fontSize="small" />;
      case 'warn': return <WarningIcon color="warning" fontSize="small" />;
      case 'info': return <InfoIcon color="info" fontSize="small" />;
      case 'debug': return <BugIcon color="action" fontSize="small" />;
      default: return <InfoIcon color="action" fontSize="small" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'info': return 'info';
      case 'debug': return 'default';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom align="center">
        🧪 Teste Completo do Baileys
      </Typography>
      
      <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
        Comparação detalhada entre Local (npm run dev) e Railway (produção)
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
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Teste</InputLabel>
                  <Select
                    value={testType}
                    label="Tipo de Teste"
                    onChange={(e) => setTestType(e.target.value)}
                    disabled={isRunning}
                  >
                    <MenuItem value="full">Teste Completo</MenuItem>
                    <MenuItem value="quick">Teste Rápido</MenuItem>
                    <MenuItem value="socket-only">Apenas Socket</MenuItem>
                  </Select>
                </FormControl>
              </Box>

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
                startIcon={isRunning ? <CircularProgress size={20} /> : <PlayIcon />}
                onClick={runComprehensiveTest}
                disabled={isRunning}
                fullWidth
                size="large"
              >
                {isRunning ? 'Executando...' : 'Iniciar Teste'}
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
                    onClick={downloadLogs}
                    size="small"
                  >
                    Baixar Logs
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
                    📊 Resultados do Teste
                  </Typography>
                  <Chip
                    icon={results.success ? <CheckIcon /> : <ErrorIcon />}
                    label={results.success ? 'SUCESSO' : 'FALHOU'}
                    color={results.success ? 'success' : 'error'}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Duração:</strong> {results.duration}ms | 
                  <strong> Logs:</strong> {results.logCount} | 
                  <strong> Ambiente:</strong> {results.environment.isRailway ? 'Railway' : 'Local'}
                </Typography>

                <Alert severity={results.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                  {results.message}
                </Alert>

                {/* Test Results Accordion */}
                {results.testResults && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>📋 Resultados Detalhados dos Testes</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <pre style={{ 
                        whiteSpace: 'pre-wrap', 
                        fontSize: '12px',
                        maxHeight: '300px',
                        overflow: 'auto',
                        backgroundColor: '#f5f5f5',
                        padding: '10px',
                        borderRadius: '4px'
                      }}>
                        {JSON.stringify(results.testResults, null, 2)}
                      </pre>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* QR Code Display */}
                {results.testResults?.socketTests?.qrCode && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      🔲 QR Code Gerado!
                    </Typography>
                    <img 
                      src={results.testResults.socketTests.qrCode}
                      alt="QR Code"
                      style={{ maxWidth: '256px', border: '1px solid #ddd' }}
                    />
                    <Typography variant="caption" display="block">
                      Tamanho: {results.testResults.socketTests.qrLength} bytes
                    </Typography>
                  </Box>
                )}

                {/* Summary */}
                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>📈 Resumo por Nível de Log</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {Object.entries(results.summary.logsByLevel).map(([level, count]) => (
                        <Grid item xs={6} sm={3} key={level}>
                          <Box sx={{ textAlign: 'center' }}>
                            {getLevelIcon(level)}
                            <Typography variant="h6">{count as number}</Typography>
                            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                              {level}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>

                {/* Detailed Logs */}
                <Accordion sx={{ mt: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>📝 Logs Detalhados ({results.logs.length})</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ maxHeight: '500px', overflow: 'auto' }}>
                      {results.logs.map((log, index) => (
                        <Box key={index} sx={{ mb: 1, p: 1, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getLevelIcon(log.level)}
                            <Chip 
                              label={log.level.toUpperCase()} 
                              size="small" 
                              color={getLevelColor(log.level) as any}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {log.message}
                          </Typography>
                          {log.data && (
                            <pre style={{ 
                              fontSize: '11px', 
                              margin: '4px 0 0 0',
                              whiteSpace: 'pre-wrap',
                              color: '#666'
                            }}>
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!results && !isRunning && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📋 Instruções
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>1.</strong> Execute este teste em LOCAL (npm run dev) primeiro
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>2.</strong> Baixe os logs e salve como "local-logs.json"
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>3.</strong> Execute o mesmo teste em RAILWAY (produção)
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>4.</strong> Baixe os logs e salve como "railway-logs.json"
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>5.</strong> Compare os dois arquivos para encontrar diferenças
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="body2" color="text.secondary">
                  Este teste verifica todos os aspectos: ambiente, rede, dependências, 
                  sistema de arquivos e criação do socket Baileys com logs extremamente detalhados.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}