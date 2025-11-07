'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
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
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  Link as MuiLink
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
  ContentCopy,
  Link as LinkIcon,
  Description,
  CalendarMonth
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { styled } from '@mui/material/styles';
import {
  importFromAirbnbUrl,
  isValidAirbnbUrl,
} from '@/lib/services/airbnb-import-service';
import { mapAirbnbToProperty, validateMappedProperty } from '@/lib/utils/airbnb-mapper';
import { PropertyCompletionDialog } from '@/components/organisms/PropertyCompletionDialog';

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
  const { tenantId } = useTenant();

  // Import mode state
  const [importMode, setImportMode] = useState<'json' | 'url'>('url');

  // JSON import state
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<any>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fileValidated, setFileValidated] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // URL import state
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [urlImporting, setUrlImporting] = useState(false);
  const [urlValidation, setUrlValidation] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);
  const [importedData, setImportedData] = useState<any>(null);

  // iCal sync state
  const [iCalUrl, setICalUrl] = useState('');
  const [showICalField, setShowICalField] = useState(false);
  const [iCalValidation, setICalValidation] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  // Property completion dialog state
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [mappedPropertyData, setMappedPropertyData] = useState<any>(null);

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

  // ============================================================================
  // URL IMPORT FUNCTIONS
  // ============================================================================

  const validateAirbnbUrlInput = (url: string) => {
    if (!url || url.trim() === '') {
      setUrlValidation(null);
      return;
    }

    const valid = isValidAirbnbUrl(url);
    setUrlValidation({
      valid,
      message: valid
        ? '✅ URL válida do Airbnb'
        : '❌ URL inválida. Use um link do Airbnb (ex: airbnb.com.br/rooms/123...)',
    });
  };

  const handleAirbnbUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    setAirbnbUrl(url);
    validateAirbnbUrlInput(url);
  };

  const handleICalUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    setICalUrl(url);
    validateICalUrlInput(url);
  };

  const validateICalUrlInput = (url: string) => {
    if (!url || url.trim() === '') {
      setICalValidation(null);
      return;
    }

    // Validate iCal URL format
    const isValid = url.includes('airbnb.com/calendar/ical/') && url.includes('.ics');

    setICalValidation({
      valid: isValid,
      message: isValid
        ? '✅ URL de calendário válida'
        : '❌ URL inválida. Deve ser um link de calendário do Airbnb (.ics)',
    });
  };

  const startUrlImport = async () => {
    if (!airbnbUrl || !urlValidation?.valid || !tenantId) return;

    setUrlImporting(true);
    setImportedData(null);
    setActiveStep(1);

    try {
      // Step 1: Import from Airbnb URL
      const importResult = await importFromAirbnbUrl(airbnbUrl);

      if (!importResult.success || !importResult.data) {
        throw new Error(importResult.error || 'Erro ao importar do Airbnb');
      }

      // Step 2: Map to our Property format
      const mappedProperty = mapAirbnbToProperty(importResult.data, tenantId);

      // Step 3: Validate mapped property
      const validation = validateMappedProperty(mappedProperty);

      if (!validation.valid) {
        throw new Error(
          'Dados da propriedade inválidos:\n' + validation.errors.join('\n')
        );
      }

      setActiveStep(2);

      // Step 4: Instead of creating immediately, store data and open completion dialog
      setMappedPropertyData(mappedProperty);
      setUrlImporting(false);
      setShowCompletionDialog(true);
    } catch (error) {
      console.error('Erro na importação via URL:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      setResult({
        success: false,
        message: errorMessage,
      });

      setActiveStep(1);
    } finally {
      setUrlImporting(false);
    }
  };

  /**
   * Handle property completion from PropertyCompletionDialog
   */
  const handlePropertyCompletion = async (completedData: any) => {
    try {
      // Step 1: Create the property via API with completed data
      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Não foi possível obter token de autenticação');
      }

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(completedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar propriedade');
      }

      const createdProperty = await response.json();

      // Step 2: Create iCal sync configuration if URL provided
      if (iCalUrl && iCalValidation?.valid && createdProperty.id) {
        try {
          const syncResponse = await fetch('/api/calendar/sync/configure', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              propertyId: createdProperty.id,
              iCalUrl,
              source: 'airbnb',
              syncFrequency: 'daily',
            }),
          });

          if (syncResponse.ok) {
            console.log('iCal sync configured successfully');
          } else {
            console.warn('Failed to configure iCal sync, but property was created');
          }
        } catch (syncError) {
          console.warn('Error configuring iCal sync:', syncError);
          // Don't fail the entire import if sync configuration fails
        }
      }

      // Step 3: Close completion dialog and show success
      setShowCompletionDialog(false);
      setActiveStep(4);
      setResult({
        success: true,
        message: 'Propriedade criada com sucesso!',
        result: {
          createdProperties: [completedData.title],
          skippedProperties: [],
        },
      });

      // Step 4: Call onSuccess callback
      onSuccess?.({
        success: true,
        propertiesCreated: 1,
        property: createdProperty,
      });
    } catch (error) {
      console.error('Erro ao salvar propriedade:', error);
      throw error; // Re-throw to let PropertyCompletionDialog handle it
    }
  };

  const handleClose = () => {
    stopProgressPolling();

    // Reset JSON import state
    setFile(null);
    setImporting(false);
    setProgress(null);
    setValidationErrors([]);
    setFileValidated(false);

    // Reset URL import state
    setAirbnbUrl('');
    setUrlImporting(false);
    setUrlValidation(null);
    setImportedData(null);

    // Reset iCal sync state
    setICalUrl('');
    setShowICalField(false);
    setICalValidation(null);

    // Reset common state
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
    <>
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={importing}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Home color="primary" />
            <Typography variant="h6">Importar Propriedade</Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Import Mode Tabs */}
        <Tabs
          value={importMode}
          onChange={(_, newValue) => setImportMode(newValue)}
          variant="fullWidth"
          sx={{ mb: 3 }}
        >
          <Tab
            icon={<LinkIcon />}
            label="Via URL Airbnb"
            value="url"
            iconPosition="start"
          />
          <Tab
            icon={<Description />}
            label="Via Arquivo JSON"
            value="json"
            iconPosition="start"
          />
        </Tabs>

        {activeStep > 0 && (
          <Box mb={3}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        {/* URL IMPORT MODE */}
        {importMode === 'url' && activeStep === 0 && (
          <Box>
            <TextField
              fullWidth
              placeholder="https://www.airbnb.com.br/rooms/1537685406266226838"
              value={airbnbUrl}
              onChange={handleAirbnbUrlChange}
              disabled={urlImporting}
              variant="outlined"
              size="large"
              sx={{ mb: 2 }}
              helperText={urlValidation?.message || 'Cole a URL completa do anúncio no Airbnb'}
              error={urlValidation ? !urlValidation.valid : false}
              InputProps={{
                startAdornment: (
                  <LinkIcon sx={{ mr: 1, color: urlValidation?.valid ? 'success.main' : 'action.active' }} />
                ),
              }}
            />

            {/* iCal Sync Field - Collapsible */}
            <Box mb={2}>
              {!showICalField ? (
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    border: '2px dashed',
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                      transform: 'translateY(-2px)',
                      boxShadow: 4
                    }
                  }}
                  onClick={() => setShowICalField(true)}
                >
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                    <CalendarMonth sx={{ fontSize: 48, color: 'primary.main' }} />
                    <Typography variant="h6" color="primary" fontWeight={600}>
                      Sincronizar Calendário
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      Importe automaticamente as reservas e bloqueios do Airbnb
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<CalendarMonth />}
                      sx={{ mt: 1 }}
                    >
                      Configurar Sincronização
                    </Button>
                  </Box>
                </Paper>
              ) : (
                <Box>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2" color="primary">
                      📅 Sincronização de Calendário
                    </Typography>
                    <IconButton size="small" onClick={() => {
                      setShowICalField(false);
                      setICalUrl('');
                      setICalValidation(null);
                    }}>
                      <ExpandLess />
                    </IconButton>
                  </Box>

                  <TextField
                    fullWidth
                    placeholder="https://www.airbnb.com/calendar/ical/12345678.ics?s=..."
                    value={iCalUrl}
                    onChange={handleICalUrlChange}
                    disabled={urlImporting}
                    variant="outlined"
                    size="small"
                    sx={{ mb: 1 }}
                    helperText={iCalValidation?.message || 'Cole a URL do calendário iCal do Airbnb'}
                    error={iCalValidation ? !iCalValidation.valid : false}
                    InputProps={{
                      startAdornment: (
                        <CalendarMonth sx={{ mr: 1, color: iCalValidation?.valid ? 'success.main' : 'action.active' }} />
                      ),
                    }}
                  />

                  <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                    <Typography variant="caption" display="block" gutterBottom>
                      <strong>Como obter a URL do calendário:</strong>
                    </Typography>
                    <Typography variant="caption" component="div">
                      1. Acesse seu painel no Airbnb<br />
                      2. Vá em "Anúncios" → Selecione o anúncio<br />
                      3. "Preços e disponibilidade" → "Sincronização de calendário"<br />
                      4. Copie a URL em "Exportar calendário"
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Box>

            <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
              <Chip
                icon={<CheckCircle />}
                label="Fotos"
                color="primary"
                variant="outlined"
                size="small"
              />
              <Chip
                icon={<CheckCircle />}
                label="Comodidades"
                color="primary"
                variant="outlined"
                size="small"
              />
              <Chip
                icon={<CheckCircle />}
                label="Informações"
                color="primary"
                variant="outlined"
                size="small"
              />
              {iCalUrl && iCalValidation?.valid && (
                <Chip
                  icon={<CalendarMonth />}
                  label="Sincronização automática"
                  color="success"
                  variant="filled"
                  size="small"
                />
              )}
              <Chip
                icon={<Warning />}
                label="Configure preços depois"
                color="warning"
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>
        )}

        {/* JSON IMPORT MODE */}
        {importMode === 'json' && activeStep === 0 && (
          <Box>
            <DropzoneArea
              {...getRootProps()}
              className={isDragActive ? 'drag-active' : ''}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive
                  ? 'Solte o arquivo aqui'
                  : 'Arraste ou clique para selecionar'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Arquivo .json com propriedades
              </Typography>
            </DropzoneArea>

            <Box display="flex" justifyContent="center" mt={2}>
              <Button
                size="small"
                startIcon={<Code />}
                endIcon={<ContentCopy />}
                onClick={copyToClipboard}
                variant="text"
              >
                Ver formato esperado
              </Button>
            </Box>

            {file && (
              <Paper sx={{ mt: 2, p: 2 }} elevation={2}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={1}>
                    {fileValidated ? (
                      <CheckCircle color="success" />
                    ) : validationErrors.length > 0 ? (
                      <ErrorIcon color="error" />
                    ) : (
                      <CircularProgress size={20} />
                    )}
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={
                      fileValidated
                        ? 'Válido'
                        : validationErrors.length > 0
                        ? 'Inválido'
                        : 'Validando...'
                    }
                    color={
                      fileValidated
                        ? 'success'
                        : validationErrors.length > 0
                        ? 'error'
                        : 'default'
                    }
                    size="small"
                  />
                </Box>

                {validationErrors.length > 0 && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {validationErrors.slice(0, 3).map((error, index) => (
                      <Typography key={index} variant="body2">
                        • {error}
                      </Typography>
                    ))}
                    {validationErrors.length > 3 && (
                      <Typography variant="body2" color="text.secondary">
                        ... e mais {validationErrors.length - 3} erros
                      </Typography>
                    )}
                  </Alert>
                )}
              </Paper>
            )}
          </Box>
        )}

        {activeStep > 0 && progress && (
          <Box>
            <Box mb={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" fontWeight="medium">
                  {progress.completed + progress.failed} / {progress.total}
                </Typography>
                <Typography variant="h6" color="primary" fontWeight="bold">
                  {getProgressPercentage()}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getProgressPercentage()}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: progress.stage === 'failed' ? 'error.main' :
                                     progress.stage === 'completed' ? 'success.main' : 'primary.main'
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" mt={0.5}>
                {getStageLabel(progress.stage)}
              </Typography>
            </Box>

            {progress.currentProperty && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <CircularProgress size={20} color="inherit" />
                  <Typography variant="body2" fontWeight="medium">
                    {progress.currentProperty}
                  </Typography>
                </Box>
              </Paper>
            )}

            <Box display="flex" gap={1.5} mb={2} flexWrap="wrap">
              {progress.completed > 0 && (
                <Chip
                  icon={<CheckCircle />}
                  label={`${progress.completed} criadas`}
                  color="success"
                  variant="filled"
                />
              )}
              {progress.failed > 0 && (
                <Chip
                  icon={<ErrorIcon />}
                  label={`${progress.failed} erros`}
                  color="error"
                  variant="filled"
                />
              )}
            </Box>

            {progress.errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {progress.errors.length} erro(s)
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setShowErrors(!showErrors)}
                  >
                    {showErrors ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
                <Collapse in={showErrors}>
                  {progress.errors.slice(0, 5).map((error, index) => (
                    <Typography key={index} variant="body2" sx={{ mt: 0.5 }}>
                      • {error.message}
                    </Typography>
                  ))}
                  {progress.errors.length > 5 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      ... e mais {progress.errors.length - 5} erros
                    </Typography>
                  )}
                </Collapse>
              </Alert>
            )}
          </Box>
        )}

        {result && (
          <Box>
            <Paper
              sx={{
                p: 3,
                textAlign: 'center',
                bgcolor: result.success ? 'success.light' : 'error.light',
                color: result.success ? 'success.contrastText' : 'error.contrastText'
              }}
            >
              {result.success ? (
                <CheckCircle sx={{ fontSize: 56, mb: 1 }} />
              ) : (
                <ErrorIcon sx={{ fontSize: 56, mb: 1 }} />
              )}
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {result.success ? "Concluído!" : "Falhou"}
              </Typography>
              <Typography variant="body2">
                {result.message}
              </Typography>
            </Paper>

            {result.result && (
              <Box mt={2}>
                <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
                  {result.result.createdProperties.length > 0 && (
                    <Paper sx={{ p: 2, textAlign: 'center', minWidth: 140 }} elevation={3}>
                      <Typography variant="h3" color="success.main" fontWeight="bold">
                        {result.result.createdProperties.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Criadas
                      </Typography>
                    </Paper>
                  )}

                  {result.result.skippedProperties.length > 0 && (
                    <Paper sx={{ p: 2, textAlign: 'center', minWidth: 140 }} elevation={3}>
                      <Typography variant="h3" color="warning.main" fontWeight="bold">
                        {result.result.skippedProperties.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Ignoradas
                      </Typography>
                    </Paper>
                  )}
                </Box>

                {result.result.createdProperties.length > 0 && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Propriedades Criadas
                    </Typography>
                    {result.result.createdProperties.slice(0, 5).map((property: string, index: number) => (
                      <Typography key={index} variant="body2" sx={{ mt: 0.5 }}>
                        • {property}
                      </Typography>
                    ))}
                    {result.result.createdProperties.length > 5 && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        + {result.result.createdProperties.length - 5} propriedades
                      </Typography>
                    )}
                  </Alert>
                )}

                {result.result.skippedProperties.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Propriedades Ignoradas
                    </Typography>
                    {result.result.skippedProperties.slice(0, 5).map((property: string, index: number) => (
                      <Typography key={index} variant="body2" sx={{ mt: 0.5 }}>
                        • {property}
                      </Typography>
                    ))}
                    {result.result.skippedProperties.length > 5 && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        + {result.result.skippedProperties.length - 5} propriedades
                      </Typography>
                    )}
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={importing || urlImporting}
          variant="outlined"
          color="inherit"
        >
          {result ? 'Fechar' : 'Cancelar'}
        </Button>

        {/* URL Import Button */}
        {importMode === 'url' && !result && (
          <Button
            variant="contained"
            onClick={startUrlImport}
            disabled={urlImporting || !urlValidation?.valid || !airbnbUrl}
            startIcon={
              urlImporting ? <CircularProgress size={18} color="inherit" /> : <LinkIcon />
            }
            color="primary"
            size="large"
          >
            {urlImporting ? 'Importando...' : 'Importar'}
          </Button>
        )}

        {/* JSON Import Button */}
        {importMode === 'json' && file && !result && (
          <Button
            variant="contained"
            onClick={startImport}
            disabled={importing || !fileValidated}
            startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <CloudUpload />}
            color="primary"
            size="large"
          >
            {importing ? 'Importando...' : 'Importar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>

    {/* Property Completion Dialog */}
    {mappedPropertyData && (
      <PropertyCompletionDialog
        open={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        propertyData={mappedPropertyData}
        onComplete={handlePropertyCompletion}
      />
    )}
    </>
  );
}