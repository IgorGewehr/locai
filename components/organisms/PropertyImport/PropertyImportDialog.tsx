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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];

      // Validate file type
      if (!uploadedFile.name.toLowerCase().endsWith('.json')) {
        alert('Por favor, selecione um arquivo JSON válido.');
        return;
      }

      // Log file size for reference
      console.log(`Arquivo selecionado: ${uploadedFile.name} (${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB)`);

      setFile(uploadedFile);
      setActiveStep(1);
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

  const startImport = async () => {
    if (!file) return;

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
      } catch {
        throw new Error('Arquivo JSON inválido');
      }

      // Get authentication token
      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Não foi possível obter token de autenticação');
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro na importação');
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
      setProgress({
        total: 0,
        completed: 0,
        failed: 0,
        stage: 'failed',
        errors: [{
          propertyIndex: -1,
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          type: 'validation'
        }]
      });
      setActiveStep(1);
    } finally {
      setImporting(false);
    }
  };

  const startProgressPolling = () => {
    intervalRef.current = setInterval(async () => {
      try {
        const token = await getFirebaseToken();
        if (!token) {
          console.error('Token de autenticação não disponível para verificar progresso');
          return;
        }

        const response = await fetch('/api/properties/import/status', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (response.ok && data.progress) {
          setProgress(data.progress);
          setActiveStep(getStepFromStage(data.progress.stage));

          if (data.completed) {
            setResult(data);
            stopProgressPolling();
            onSuccess?.(data);
          }
        } else if (response.status === 404) {
          // No import in progress
          stopProgressPolling();
        }
      } catch (error) {
        console.error('Erro ao verificar progresso:', error);
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
                <Typography variant="subtitle2" gutterBottom>
                  Arquivo Selecionado:
                </Typography>
                <Typography variant="body2">
                  📄 {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </Typography>
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
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            {progress.currentProperty && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={16} />
                  Processando: {progress.currentProperty}
                </Box>
              </Alert>
            )}

            <Box display="flex" gap={2} mb={2}>
              <Chip
                icon={<CheckCircle />}
                label={`${progress.completed} Criadas`}
                color="success"
                variant="outlined"
              />
              <Chip
                icon={<ErrorIcon />}
                label={`${progress.failed} Falharam`}
                color="error"
                variant="outlined"
              />
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
          <Alert severity={result.success ? "success" : "error"} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {result.success ? "Importação Concluída!" : "Importação Falhou"}
            </Typography>
            <Typography variant="body2">
              {result.message}
            </Typography>
            {result.result && (
              <Box mt={1}>
                <Typography variant="body2">
                  • {result.result.createdProperties.length} propriedades criadas
                  {result.result.skippedProperties.length > 0 &&
                    ` • ${result.result.skippedProperties.length} ignoradas`
                  }
                </Typography>
              </Box>
            )}
          </Alert>
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
            disabled={importing}
            startIcon={importing ? <CircularProgress size={16} /> : <CloudUpload />}
          >
            {importing ? 'Importando...' : 'Iniciar Importação'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}