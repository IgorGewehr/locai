'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Collapse,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  ExpandMore,
  ExpandLess,
  Home,
  Code,
  ContentCopy
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { styled } from '@mui/material/styles';

interface ImportProgress {
  total: number;
  completed: number;
  failed: number;
  currentProperty?: string;
  stage: 'validating' | 'processing_media' | 'saving_properties' | 'completed' | 'failed';
  errors: ImportError[];
}

interface ImportError {
  propertyIndex: number;
  propertyTitle?: string;
  field?: string;
  message: string;
  type: 'validation' | 'media' | 'database' | 'duplicate';
}

interface PropertyImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

const DropzoneArea = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backgroundColor: theme.palette.grey[50],
  '&:hover': {
    borderColor: theme.palette.primary.dark,
    backgroundColor: theme.palette.primary.main + '08',
  },
  '&.drag-active': {
    borderColor: theme.palette.success.main,
    backgroundColor: theme.palette.success.main + '08',
  }
}));

const steps = [
  'Upload do Arquivo',
  'Validação dos Dados',
  'Processamento de Mídias',
  'Salvamento das Propriedades',
  'Concluído'
];

export default function PropertyImportDialog({
  open,
  onClose,
  onSuccess
}: PropertyImportDialogProps) {
  const { getFirebaseToken } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<any>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fileValidated, setFileValidated] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getStepFromStage = (stage: ImportProgress['stage']): number => {
    switch (stage) {
      case 'validating': return 1;
      case 'processing_media': return 2;
      case 'saving_properties': return 3;
      case 'completed': return 4;
      case 'failed': return 1;
      default: return 0;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];

      // Validate file type
      if (!uploadedFile.name.toLowerCase().endsWith('.json')) {
        setValidationErrors(['Por favor, selecione um arquivo JSON válido.']);
        return;
      }

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (uploadedFile.size > maxSize) {
        setValidationErrors(['Arquivo muito grande. O tamanho máximo é 10MB.']);
        return;
      }

      console.log(`Arquivo selecionado: ${uploadedFile.name} (${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB)`);

      // Validate JSON content immediately
      setFile(uploadedFile);
      setFileValidated(false);
      setValidationErrors([]);
      await validateFileContent(uploadedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json']
    },
    multiple: false,
    disabled: importing
  });

  const exampleTemplate = {
    "source": "manual_import",
    "importedAt": new Date().toISOString(),
    "settings": {
      "skipDuplicates": true,
      "updateExisting": false,
      "downloadMedia": true,
      "validateMedia": true,
      "createThumbnails": true
    },
    "properties": [
      {
        "title": "Apartamento 2 Quartos Centro",
        "description": "Apartamento mobiliado em ótima localização, próximo ao centro e transporte público.",
        "address": "Rua das Flores, 123",
        "neighborhood": "Centro",
        "city": "São Paulo",
        "category": "apartment",
        "type": "vacation",
        "bedrooms": 2,
        "bathrooms": 1,
        "maxGuests": 4,
        "basePrice": 200,
        "cleaningFee": 50,
        "pricePerExtraGuest": 30,
        "minimumNights": 2,
        "photos": [
          "https://exemplo.com/foto1.jpg",
          "https://exemplo.com/foto2.jpg"
        ],
        "videos": [],
        "amenities": ["Wi-Fi", "Ar Condicionado", "TV", "Cozinha Equipada"],
        "allowsPets": false,
        "isFeatured": false,
        "weekendSurcharge": 15,
        "holidaySurcharge": 25,
        "advancePaymentPercentage": 30,
        "externalId": "ext_001",
        "externalSource": "meu_sistema"
      }
    ]
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(exampleTemplate, null, 2));
    alert('Formato copiado para a área de transferência!');
  };

  const validateFileContent = async (file: File) => {
    try {
      const fileContent = await file.text();

      // Import the validation function from the service
      const response = await fetch('/api/properties/import/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: fileContent })
      });

      const validation = await response.json();

      if (validation.valid) {
        setFileValidated(true);
        setValidationErrors([]);
        setActiveStep(1);
      } else {
        setFileValidated(false);
        setValidationErrors(validation.errors || ['Erro de validação desconhecido']);
        setActiveStep(0);
      }
    } catch (error) {
      console.error('Erro na validação do arquivo:', error);
      setFileValidated(false);
      setValidationErrors(['Erro ao validar o arquivo. Verifique se é um JSON válido.']);
      setActiveStep(0);
    }
  };

  const startImport = async () => {
    if (!file || !fileValidated) return;

    setImporting(true);
    setActiveStep(1);
    setProgress(null);
    setResult(null);

    try {
      // Read file content
      const fileContent = await file.text();
      let importData;

      try {
        importData = JSON.parse(fileContent);
      } catch (parseError) {
        const message = parseError instanceof Error ? parseError.message : 'Erro desconhecido';
        throw new Error(`Arquivo JSON inválido: ${message}`);
      }

      // Get authentication token
      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Não foi possível obter token de autenticação. Tente fazer login novamente.');
      }

      // Start import
      const response = await fetch('/api/properties/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(importData)
      });

      // Handle different response types
      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If not JSON, it might be HTML error page
        const textResponse = await response.text();
        if (textResponse.includes('<!DOCTYPE') || textResponse.includes('<html')) {
          throw new Error('Erro do servidor. Verifique sua conexão e tente novamente.');
        } else {
          throw new Error(`Resposta inesperada do servidor: ${textResponse.substring(0, 100)}...`);
        }
      }

      if (!response.ok) {
        const errorMessage = data.message || data.error || 'Erro na importação';
        const details = data.details ? `\nDetalhes: ${Array.isArray(data.details) ? data.details.join(', ') : data.details}` : '';
        throw new Error(errorMessage + details);
      }

      if (data.completed) {
        // Import completed immediately
        setResult(data.result);
        setActiveStep(4);
        onSuccess?.(data.result);
      } else {
        // Start polling for progress
        startProgressPolling();
      }

    } catch (error) {
      console.error('Erro na importação:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      setProgress({
        total: 0,
        completed: 0,
        failed: 0,
        stage: 'failed',
        errors: [{
          propertyIndex: -1,
          message: errorMessage,
          type: 'validation'
        }]
      });
      setActiveStep(1);
    } finally {
      setImporting(false);
    }
  };

  const startProgressPolling = () => {
    let pollAttempts = 0;
    const maxPollAttempts = 150; // 5 minutes at 2s intervals

    intervalRef.current = setInterval(async () => {
      pollAttempts++;

      // Stop polling after max attempts to prevent infinite polling
      if (pollAttempts >= maxPollAttempts) {
        console.warn('Polling timeout reached, stopping progress checks');
        setProgress(prev => prev ? {
          ...prev,
          stage: 'failed',
          errors: [...prev.errors, {
            propertyIndex: -1,
            message: 'Tempo limite atingido. Verifique o status da importação manualmente.',
            type: 'database'
          }]
        } : null);
        stopProgressPolling();
        return;
      }

      try {
        const token = await getFirebaseToken();
        if (!token) {
          console.error('Token de autenticação não disponível para verificar progresso');
          // Don't stop polling immediately, token might be refreshed
          if (pollAttempts > 5) {
            setProgress(prev => prev ? {
              ...prev,
              stage: 'failed',
              errors: [...prev.errors, {
                propertyIndex: -1,
                message: 'Erro de autenticação. Faça login novamente.',
                type: 'database'
              }]
            } : null);
            stopProgressPolling();
          }
          return;
        }

        const response = await fetch('/api/properties/import/status', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.progress) {
            setProgress(data.progress);
            setActiveStep(getStepFromStage(data.progress.stage));

            if (data.completed) {
              setResult(data);
              stopProgressPolling();
              onSuccess?.(data);
            }
          }
        } else if (response.status === 404) {
          // No import in progress - this might mean it completed or failed
          console.info('No active import found, stopping polling');
          stopProgressPolling();
        } else {
          console.warn(`Unexpected response status: ${response.status}`);
          if (pollAttempts > 10) {
            setProgress(prev => prev ? {
              ...prev,
              stage: 'failed',
              errors: [...prev.errors, {
                propertyIndex: -1,
                message: 'Erro ao verificar o progresso da importação.',
                type: 'database'
              }]
            } : null);
            stopProgressPolling();
          }
        }
      } catch (error) {
        console.error('Erro ao verificar progresso:', error);
        if (pollAttempts > 10) {
          setProgress(prev => prev ? {
            ...prev,
            stage: 'failed',
            errors: [...prev.errors, {
              propertyIndex: -1,
              message: 'Erro de conexão ao verificar progresso.',
              type: 'database'
            }]
          } : null);
          stopProgressPolling();
        }
      }
    }, 2000); // Poll every 2 seconds
  };

  const stopProgressPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleClose = () => {
    stopProgressPolling();
    setFile(null);
    setImporting(false);
    setProgress(null);
    setResult(null);
    setActiveStep(0);
    setShowErrors(false);
    setValidationErrors([]);
    setFileValidated(false);
    onClose();
  };

  const getProgressPercentage = () => {
    if (!progress) return 0;
    if (progress.total === 0) return 0;
    return Math.round(((progress.completed + progress.failed) / progress.total) * 100);
  };

  const getErrorTypeIcon = (type: ImportError['type']) => {
    switch (type) {
      case 'validation': return <ErrorIcon color="error" />;
      case 'media': return <Warning color="warning" />;
      case 'database': return <ErrorIcon color="error" />;
      case 'duplicate': return <Info color="info" />;
      default: return <ErrorIcon color="error" />;
    }
  };

  const getErrorTypeColor = (type: ImportError['type']) => {
    switch (type) {
      case 'validation': return 'error';
      case 'media': return 'warning';
      case 'database': return 'error';
      case 'duplicate': return 'info';
      default: return 'error';
    }
  };

  const getStageLabel = (stage: ImportProgress['stage']): string => {
    switch (stage) {
      case 'validating': return 'Validando dados...';
      case 'processing_media': return 'Processando mídias...';
      case 'saving_properties': return 'Salvando propriedades...';
      case 'completed': return 'Concluída com sucesso!';
      case 'failed': return 'Falhou';
      default: return 'Preparando...';
    }
  };

  React.useEffect(() => {
    return () => {
      stopProgressPolling();
    };
  }, []);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={importing}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Home />
          Importação de Propriedades
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box mb={3}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {activeStep === 0 && (
          <Box>
            <Paper sx={{ p: 2, mb: 3, backgroundColor: 'grey.50' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Code color="primary" />
                  <Typography variant="h6">
                    Formato do Arquivo JSON
                  </Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<ContentCopy />}
                  onClick={copyToClipboard}
                >
                  Copiar
                </Button>
              </Box>

              <Typography variant="body2" color="text.secondary" mb={2}>
                Seu arquivo JSON deve seguir este formato exato:
              </Typography>

              <Box
                component="pre"
                sx={{
                  fontSize: '0.75rem',
                  backgroundColor: 'background.paper',
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'auto',
                  maxHeight: '300px',
                  fontFamily: 'monospace'
                }}
              >
                {JSON.stringify(exampleTemplate, null, 2)}
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                💡 Dica: Clique em "Copiar" para usar este formato como base
              </Typography>
            </Paper>

            <DropzoneArea
              {...getRootProps()}
              className={isDragActive ? 'drag-active' : ''}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive
                  ? 'Solte o arquivo JSON aqui'
                  : 'Arraste o arquivo JSON ou clique para selecionar'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Arquivo JSON com dados das propriedades
              </Typography>
            </DropzoneArea>

            {file && (
              <Paper sx={{ mt: 2, p: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="subtitle2">
                    Arquivo Selecionado:
                  </Typography>
                  {fileValidated ? (
                    <Chip
                      icon={<CheckCircle />}
                      label="Válido"
                      color="success"
                      size="small"
                    />
                  ) : validationErrors.length > 0 ? (
                    <Chip
                      icon={<ErrorIcon />}
                      label="Inválido"
                      color="error"
                      size="small"
                    />
                  ) : (
                    <CircularProgress size={16} />
                  )}
                </Box>
                <Typography variant="body2" mb={validationErrors.length > 0 ? 2 : 0}>
                  📄 {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </Typography>

                {validationErrors.length > 0 && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Erros de Validação:
                    </Typography>
                    <List dense>
                      {validationErrors.slice(0, 5).map((error, index) => (
                        <ListItem key={index} sx={{ py: 0 }}>
                          <ListItemIcon sx={{ minWidth: 24 }}>
                            <ErrorIcon fontSize="small" color="error" />
                          </ListItemIcon>
                          <ListItemText
                            primary={<Typography variant="body2">{error}</Typography>}
                          />
                        </ListItem>
                      ))}
                      {validationErrors.length > 5 && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 3 }}>
                          ... e mais {validationErrors.length - 5} erros
                        </Typography>
                      )}
                    </List>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      💡 Dica: Corrija os erros acima ou use o formato de exemplo como base.
                    </Typography>
                  </Alert>
                )}

                {fileValidated && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    ✅ Arquivo validado com sucesso! Pronto para importação.
                  </Alert>
                )}
              </Paper>
            )}
          </Box>
        )}

        {activeStep > 0 && progress && (
          <Box>
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body1">
                  Progresso: {progress.completed + progress.failed} / {progress.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getProgressPercentage()}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getProgressPercentage()}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'grey.300',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: progress.stage === 'failed' ? 'error.main' :
                                     progress.stage === 'completed' ? 'success.main' : 'primary.main'
                  }
                }}
              />
            </Box>

            {/* Status atual */}
            <Box mb={2}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Status: {getStageLabel(progress.stage)}
              </Typography>
              {progress.currentProperty && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={16} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Processando: {progress.currentProperty}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {progress.completed} de {progress.total} concluídas
                      </Typography>
                    </Box>
                  </Box>
                </Alert>
              )}
            </Box>

            {/* Resumo de resultados */}
            <Box display="flex" gap={2} mb={2} flexWrap="wrap">
              <Chip
                icon={<CheckCircle />}
                label={`${progress.completed} Criadas`}
                color="success"
                variant={progress.completed > 0 ? "filled" : "outlined"}
                size="small"
              />
              <Chip
                icon={<ErrorIcon />}
                label={`${progress.failed} Falharam`}
                color="error"
                variant={progress.failed > 0 ? "filled" : "outlined"}
                size="small"
              />
              {progress.stage === 'completed' && (
                <Chip
                  icon={<Info />}
                  label={`${progress.total - progress.completed - progress.failed} Ignoradas`}
                  color="default"
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>

            {progress.errors.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" color="error">
                    Erros Encontrados ({progress.errors.length})
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setShowErrors(!showErrors)}
                  >
                    {showErrors ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
                <Collapse in={showErrors}>
                  <List dense>
                    {progress.errors.slice(0, 10).map((error, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          {getErrorTypeIcon(error.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={error.message}
                          secondary={
                            <Box>
                              {error.propertyTitle && `Propriedade: ${error.propertyTitle}`}
                              {error.field && ` • Campo: ${error.field}`}
                              <Chip
                                size="small"
                                label={error.type}
                                color={getErrorTypeColor(error.type) as any}
                                sx={{ ml: 1 }}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                    {progress.errors.length > 10 && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                        ... e mais {progress.errors.length - 10} erros
                      </Typography>
                    )}
                  </List>
                </Collapse>
              </Paper>
            )}
          </Box>
        )}

        {result && (
          <Paper sx={{ p: 3, mt: 2 }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              {result.success ? (
                <CheckCircle sx={{ fontSize: 32, color: 'success.main' }} />
              ) : (
                <ErrorIcon sx={{ fontSize: 32, color: 'error.main' }} />
              )}
              <Box>
                <Typography variant="h6" color={result.success ? 'success.main' : 'error.main'}>
                  {result.success ? "Importação Concluída!" : "Importação Falhou"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {result.message}
                </Typography>
              </Box>
            </Box>

            {result.result && (
              <Box>
                <Divider sx={{ mb: 2 }} />

                {/* Resumo numérico */}
                <Box display="flex" gap={2} mb={2} flexWrap="wrap">
                  {result.result.createdProperties.length > 0 && (
                    <Paper sx={{ p: 2, textAlign: 'center', minWidth: 120, backgroundColor: 'success.main', color: 'success.contrastText' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {result.result.createdProperties.length}
                      </Typography>
                      <Typography variant="body2">
                        Criadas
                      </Typography>
                    </Paper>
                  )}

                  {result.result.skippedProperties.length > 0 && (
                    <Paper sx={{ p: 2, textAlign: 'center', minWidth: 120, backgroundColor: 'warning.main', color: 'warning.contrastText' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {result.result.skippedProperties.length}
                      </Typography>
                      <Typography variant="body2">
                        Ignoradas
                      </Typography>
                    </Paper>
                  )}
                </Box>

                {/* Lista de propriedades criadas */}
                {result.result.createdProperties.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" color="success.main" gutterBottom>
                      ✅ Propriedades Criadas:
                    </Typography>
                    <List dense sx={{ maxHeight: 150, overflow: 'auto' }}>
                      {result.result.createdProperties.slice(0, 10).map((property: string, index: number) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <CheckCircle fontSize="small" color="success" />
                          </ListItemIcon>
                          <ListItemText primary={property} />
                        </ListItem>
                      ))}
                      {result.result.createdProperties.length > 10 && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 1 }}>
                          ... e mais {result.result.createdProperties.length - 10} propriedades
                        </Typography>
                      )}
                    </List>
                  </Box>
                )}

                {/* Lista de propriedades ignoradas */}
                {result.result.skippedProperties.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom>
                      ⚠️ Propriedades Ignoradas:
                    </Typography>
                    <List dense sx={{ maxHeight: 150, overflow: 'auto' }}>
                      {result.result.skippedProperties.slice(0, 10).map((property: string, index: number) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <Warning fontSize="small" color="warning" />
                          </ListItemIcon>
                          <ListItemText
                            primary={property}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                      {result.result.skippedProperties.length > 10 && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 1 }}>
                          ... e mais {result.result.skippedProperties.length - 10} propriedades
                        </Typography>
                      )}
                    </List>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={importing}
        >
          {result ? 'Fechar' : 'Cancelar'}
        </Button>
        {file && !result && (
          <Button
            variant="contained"
            onClick={startImport}
            disabled={importing || !fileValidated}
            startIcon={importing ? <CircularProgress size={16} /> : <CloudUpload />}
          >
            {importing ? 'Importando...' : 'Iniciar Importação'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}