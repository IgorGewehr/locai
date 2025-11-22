'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  Link,
  Chip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  LinearProgress,
  Collapse,
  Paper,
  Skeleton,
} from '@mui/material';
import {
  ContentCopy,
  Sync,
  OpenInNew,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  Download,
  Upload,
  CloudSync,
  Refresh,
  Visibility,
  VisibilityOff,
  Done,
  Warning,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import { logger } from '@/lib/utils/logger';
import {
  extractAirbnbPropertyId,
  generateAirbnbCalendarSettingsUrl,
  isValidICalUrl,
  parseAirbnbUrl,
  isValidAirbnbUrl,
} from '@/lib/utils/airbnb-helpers';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

interface PropertyICalManagementProps {
  propertyId: string;
  propertyName: string;
  currentData?: {
    iCalExportToken?: string;
    iCalImportUrl?: string;
    airbnbPropertyId?: string;
    iCalLastSync?: Date;
    externalCalendarUrls?: Array<{
      source: 'airbnb' | 'booking' | 'vrbo' | 'other';
      url: string;
      isActive: boolean;
      lastSync?: Date;
    }>;
  };
  onUpdate?: () => void;
}

export const PropertyICalManagement: React.FC<PropertyICalManagementProps> = ({
  propertyId,
  propertyName,
  currentData,
  onUpdate,
}) => {
  const { getFirebaseToken } = useAuth();
  const { tenantId } = useTenant();

  // Export state
  const [exportFeedUrl, setExportFeedUrl] = useState<string>('');
  const [generatingToken, setGeneratingToken] = useState(false);
  const [showExportUrl, setShowExportUrl] = useState(false);

  // Import state
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [extractedAirbnbId, setExtractedAirbnbId] = useState<string | null>(
    currentData?.airbnbPropertyId || null
  );
  const [iCalImportUrl, setICalImportUrl] = useState(currentData?.iCalImportUrl || '');
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Dialog state
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);
  const [showSyncDetailsDialog, setShowSyncDetailsDialog] = useState(false);
  const [lastSyncDetails, setLastSyncDetails] = useState<any>(null);

  // Validation state
  const [airbnbUrlError, setAirbnbUrlError] = useState<string | null>(null);
  const [iCalUrlError, setICalUrlError] = useState<string | null>(null);

  useEffect(() => {
    // Load current export URL if token exists
    if (currentData?.iCalExportToken && tenantId) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/api/ical/${tenantId}/${propertyId}?token=${currentData.iCalExportToken}`;
      setExportFeedUrl(url);
    }
  }, [currentData, tenantId, propertyId]);

  // Real-time validation for Airbnb URL
  useEffect(() => {
    if (!airbnbUrl) {
      setAirbnbUrlError(null);
      return;
    }

    const timer = setTimeout(() => {
      if (!isValidAirbnbUrl(airbnbUrl)) {
        setAirbnbUrlError('URL do Airbnb inválida. Deve conter /rooms/[ID]');
      } else {
        setAirbnbUrlError(null);
        // Auto-extract ID
        const urlInfo = parseAirbnbUrl(airbnbUrl);
        if (urlInfo.propertyId) {
          setExtractedAirbnbId(urlInfo.propertyId);
          // Auto-save Airbnb ID
          saveAirbnbPropertyId(urlInfo.propertyId);
        }
      }
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [airbnbUrl]);

  // Real-time validation for iCal URL
  useEffect(() => {
    if (!iCalImportUrl) {
      setICalUrlError(null);
      return;
    }

    const timer = setTimeout(() => {
      if (!isValidICalUrl(iCalImportUrl)) {
        setICalUrlError('URL do iCal inválida. Deve ser HTTPS e terminar com .ics');
      } else {
        setICalUrlError(null);
      }
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [iCalImportUrl]);

  /**
   * Auto-save Airbnb Property ID
   */
  const saveAirbnbPropertyId = async (airbnbId: string) => {
    try {
      const token = await getFirebaseToken();
      const services = new TenantServiceFactory(tenantId!);

      await services.properties.update(propertyId, {
        airbnbPropertyId: airbnbId,
        updatedAt: new Date(),
      });

      logger.info('Airbnb property ID saved', { propertyId, airbnbId });
    } catch (error) {
      logger.error('Error saving Airbnb ID', { error });
    }
  };

  /**
   * Show snackbar message
   */
  const showSnackbar = useCallback(
    (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  /**
   * Copy to clipboard
   */
  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSnackbar('Copiado para área de transferência!', 'success');
    } catch (error) {
      logger.error('Error copying to clipboard', { error });
      showSnackbar('Erro ao copiar', 'error');
    }
  };

  /**
   * Generate new export token
   */
  const handleGenerateExportToken = async () => {
    try {
      setGeneratingToken(true);
      const token = await getFirebaseToken();

      const response = await fetch(`/api/properties/${propertyId}/ical/generate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate token');
      }

      setExportFeedUrl(data.feedUrl);
      showSnackbar('Link de exportação gerado com sucesso!', 'success');
      logger.info('iCal export token generated', { propertyId });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      logger.error('Error generating export token', { error });
      showSnackbar('Erro ao gerar token de exportação', 'error');
    } finally {
      setGeneratingToken(false);
    }
  };

  /**
   * Configure iCal import
   */
  const handleConfigureImport = async () => {
    if (!iCalImportUrl) {
      showSnackbar('URL do iCal é obrigatória', 'warning');
      return;
    }

    if (iCalUrlError) {
      showSnackbar('Corrija os erros antes de continuar', 'warning');
      return;
    }

    try {
      setImporting(true);
      setSyncProgress(10);
      const token = await getFirebaseToken();

      setSyncProgress(30);

      const response = await fetch('/api/calendar/sync/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          propertyId,
          iCalUrl: iCalImportUrl,
          source: extractedAirbnbId ? 'airbnb' : 'ical_url',
          syncFrequency: 'daily',
        }),
      });

      setSyncProgress(60);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to configure import');
      }

      setSyncProgress(100);
      showSnackbar('Importação configurada! Sincronização inicial em andamento...', 'success');
      logger.info('iCal import configured', { propertyId });

      // Wait a bit to show the sync details
      setTimeout(() => {
        if (onUpdate) {
          onUpdate();
        }
      }, 1000);
    } catch (error) {
      logger.error('Error configuring import', { error });
      showSnackbar(
        error instanceof Error ? error.message : 'Erro ao configurar importação',
        'error'
      );
    } finally {
      setImporting(false);
      setSyncProgress(0);
    }
  };

  /**
   * Trigger manual sync
   */
  const handleManualSync = async () => {
    try {
      setSyncing(true);
      setSyncProgress(10);
      const token = await getFirebaseToken();

      setSyncProgress(30);

      const response = await fetch(`/api/calendar/sync/${propertyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      setSyncProgress(70);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setSyncProgress(100);
      setLastSyncDetails(data.result);
      showSnackbar(
        `Sincronização concluída! ${data.result?.eventsImported || 0} eventos importados.`,
        'success'
      );
      logger.info('Manual sync completed', { propertyId });

      setTimeout(() => {
        if (onUpdate) {
          onUpdate();
        }
      }, 1000);
    } catch (error) {
      logger.error('Error during manual sync', { error });
      showSnackbar(
        error instanceof Error ? error.message : 'Erro ao sincronizar',
        'error'
      );
    } finally {
      setSyncing(false);
      setSyncProgress(0);
    }
  };

  return (
    <Box>
      <Stack spacing={3}>
        {/* Export Section */}
        <Card elevation={2}>
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Download color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Exportar Calendário (Locai → Airbnb)
                </Typography>
              </Box>

              <Alert severity="info" icon={<Info />}>
                Use este link para importar suas reservas do Locai no Airbnb.
                O Airbnb bloqueará automaticamente as datas ocupadas.
              </Alert>

              {!exportFeedUrl ? (
                <Button
                  variant="contained"
                  onClick={handleGenerateExportToken}
                  disabled={generatingToken}
                  startIcon={generatingToken ? <CircularProgress size={20} /> : <CloudSync />}
                  size="large"
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  {generatingToken ? 'Gerando...' : 'Gerar Link de Exportação'}
                </Button>
              ) : (
                <Box>
                  <TextField
                    fullWidth
                    label="Link de Exportação iCal"
                    value={exportFeedUrl}
                    type={showExportUrl ? 'text' : 'password'}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title={showExportUrl ? 'Ocultar' : 'Mostrar'}>
                              <IconButton
                                onClick={() => setShowExportUrl(!showExportUrl)}
                                edge="end"
                                size="small"
                              >
                                {showExportUrl ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Copiar">
                              <IconButton
                                onClick={() => handleCopyToClipboard(exportFeedUrl)}
                                edge="end"
                                size="small"
                                color="primary"
                              >
                                <ContentCopy />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </InputAdornment>
                      ),
                    }}
                    size="small"
                    sx={{ mb: 2 }}
                  />

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setShowInstructionsDialog(true)}
                      startIcon={<Info />}
                    >
                      Como Importar no Airbnb
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleGenerateExportToken}
                      disabled={generatingToken}
                      startIcon={<Refresh />}
                    >
                      Regenerar Token
                    </Button>
                  </Stack>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Divider />

        {/* Import Section */}
        <Card elevation={2}>
          <CardContent>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Upload color="secondary" />
                <Typography variant="h6" fontWeight={600}>
                  Importar Calendário (Airbnb → Locai)
                </Typography>
              </Box>

              <Alert severity="info" icon={<Info />}>
                Importe o calendário do Airbnb para bloquear automaticamente as datas
                ocupadas no Locai. Reservas externas serão criadas automaticamente.
              </Alert>

              {/* Step 1: Extract Airbnb ID */}
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  <Chip label="1" size="small" color="primary" sx={{ mr: 1 }} />
                  Cole o link da propriedade no Airbnb
                </Typography>
                <TextField
                  fullWidth
                  placeholder="https://www.airbnb.com.br/rooms/1537685406266226838..."
                  value={airbnbUrl}
                  onChange={(e) => setAirbnbUrl(e.target.value)}
                  size="small"
                  error={!!airbnbUrlError}
                  helperText={airbnbUrlError}
                  InputProps={{
                    endAdornment: extractedAirbnbId && (
                      <InputAdornment position="end">
                        <Chip
                          label={`ID: ${extractedAirbnbId}`}
                          size="small"
                          color="success"
                          icon={<CheckCircle />}
                        />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mt: 1 }}
                />
              </Paper>

              {/* Step 2: Get iCal URL */}
              <Collapse in={!!extractedAirbnbId}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    <Chip label="2" size="small" color="primary" sx={{ mr: 1 }} />
                    Obtenha o link iCal do Airbnb
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<OpenInNew />}
                    onClick={() => {
                      const url = parseAirbnbUrl(airbnbUrl).calendarSettingsUrl;
                      if (url) window.open(url, '_blank');
                    }}
                    sx={{ mt: 1 }}
                  >
                    Abrir Configurações do Airbnb
                  </Button>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                    💡 Copie o link de "Exportar calendário" e cole abaixo
                  </Typography>
                </Paper>
              </Collapse>

              {/* Step 3: Configure Import */}
              <Collapse in={!!extractedAirbnbId}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    <Chip label="3" size="small" color="primary" sx={{ mr: 1 }} />
                    Cole o link iCal do Airbnb
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="https://www.airbnb.com/calendar/ical/1234567.ics?s=..."
                    value={iCalImportUrl}
                    onChange={(e) => setICalImportUrl(e.target.value)}
                    size="small"
                    multiline
                    rows={2}
                    error={!!iCalUrlError}
                    helperText={iCalUrlError || 'Cole a URL completa do iCal do Airbnb'}
                    sx={{ mt: 1, mb: 2 }}
                  />

                  {importing && (
                    <Box sx={{ mb: 2 }}>
                      <LinearProgress variant="determinate" value={syncProgress} />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        Configurando importação... {syncProgress}%
                      </Typography>
                    </Box>
                  )}

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      variant="contained"
                      onClick={handleConfigureImport}
                      disabled={importing || !iCalImportUrl || !!iCalUrlError}
                      startIcon={importing ? <CircularProgress size={20} /> : <CloudSync />}
                    >
                      {importing ? 'Configurando...' : 'Configurar Importação'}
                    </Button>
                    {currentData?.iCalImportUrl && (
                      <Button
                        variant="outlined"
                        onClick={handleManualSync}
                        disabled={syncing}
                        startIcon={syncing ? <CircularProgress size={20} /> : <Sync />}
                      >
                        {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                      </Button>
                    )}
                  </Stack>

                  {syncing && (
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress variant="determinate" value={syncProgress} />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        Sincronizando calendário... {syncProgress}%
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Collapse>

              {/* Last Sync Info */}
              {currentData?.iCalLastSync && (
                <Alert severity="success" icon={<Done />}>
                  Última sincronização:{' '}
                  {new Date(currentData.iCalLastSync).toLocaleString('pt-BR')}
                  {lastSyncDetails && (
                    <Button
                      size="small"
                      onClick={() => setShowSyncDetailsDialog(true)}
                      sx={{ ml: 2 }}
                    >
                      Ver Detalhes
                    </Button>
                  )}
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Instructions Dialog */}
      <Dialog
        open={showInstructionsDialog}
        onClose={() => setShowInstructionsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Como Importar no Airbnb</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Siga estas etapas para importar o calendário do Locai no Airbnb:
            </Alert>

            <List>
              <ListItem>
                <ListItemText
                  primary="1. Copie o link de exportação acima"
                  secondary="Clique no botão de copiar ao lado do campo"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="2. Acesse as configurações de calendário no Airbnb"
                  secondary={
                    extractedAirbnbId && (
                      <Link
                        href={generateAirbnbCalendarSettingsUrl(extractedAirbnbId)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Abrir configurações do Airbnb →
                      </Link>
                    )
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="3. Encontre a seção 'Importar calendário'"
                  secondary="Procure por 'Import calendar' ou 'Importar calendário'"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="4. Cole o link de exportação"
                  secondary="Cole o link copiado no passo 1"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="5. Nomeie o calendário"
                  secondary={`Por exemplo: "${propertyName} - Locai"`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="6. Salve as alterações"
                  secondary="O Airbnb começará a sincronizar automaticamente"
                />
              </ListItem>
            </List>

            <Alert severity="warning" icon={<Warning />}>
              O Airbnb atualiza calendários importados a cada 24 horas.
              Alterações podem levar até 1 dia para aparecer.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInstructionsDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Sync Details Dialog */}
      <Dialog
        open={showSyncDetailsDialog}
        onClose={() => setShowSyncDetailsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Detalhes da Sincronização</DialogTitle>
        <DialogContent>
          {lastSyncDetails && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Eventos Processados
                </Typography>
                <Typography variant="h4">{lastSyncDetails.eventsProcessed || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Eventos Importados
                </Typography>
                <Typography variant="h4" color="success.main">
                  {lastSyncDetails.eventsImported || 0}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Períodos Criados
                </Typography>
                <Typography variant="h4">{lastSyncDetails.periodsCreated || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Duração
                </Typography>
                <Typography variant="body1">{lastSyncDetails.duration || 0}ms</Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSyncDetailsDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PropertyICalManagement;
