'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Link as MuiLink,
  Chip,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import {
  OpenInNew,
  ContentCopy,
  CalendarMonth,
  CheckCircle,
  Info,
} from '@mui/icons-material';
import { generateAirbnbCalendarSettingsUrl } from '@/lib/utils/airbnb-helpers';

interface AirbnbICalHelperProps {
  open: boolean;
  onClose: () => void;
  airbnbPropertyId: string | null;
  onICalUrlProvided?: (url: string) => void;
}

/**
 * Helper component to guide users through getting their Airbnb iCal export URL
 *
 * This component provides step-by-step instructions with direct links to Airbnb settings
 */
export default function AirbnbICalHelper({
  open,
  onClose,
  airbnbPropertyId,
  onICalUrlProvided,
}: AirbnbICalHelperProps) {
  const theme = useTheme();
  const [copiedExport, setCopiedExport] = React.useState(false);

  const airbnbCalendarUrl = airbnbPropertyId
    ? generateAirbnbCalendarSettingsUrl(airbnbPropertyId)
    : null;

  const handleCopyExportUrl = () => {
    if (airbnbCalendarUrl) {
      navigator.clipboard.writeText(airbnbCalendarUrl);
      setCopiedExport(true);
      setTimeout(() => setCopiedExport(false), 2000);
    }
  };

  const handleOpenAirbnbSettings = () => {
    if (airbnbCalendarUrl) {
      window.open(airbnbCalendarUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pb: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <CalendarMonth color="primary" />
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Como configurar a sincronização com Airbnb
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Siga os passos para importar e exportar reservas automaticamente
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="info" icon={<Info />} sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Por que isso é importante?
          </Typography>
          <Typography variant="body2">
            • <strong>Importar do Airbnb</strong>: Suas reservas do Airbnb serão bloqueadas automaticamente aqui
            <br />
            • <strong>Exportar para Airbnb</strong>: Reservas criadas aqui serão bloqueadas no Airbnb
            <br />
            • Evita double booking e mantém calendários sempre sincronizados
          </Typography>
        </Alert>

        <Stepper orientation="vertical" activeStep={-1}>
          {/* Step 1: Open Airbnb Settings */}
          <Step expanded>
            <StepLabel
              icon="1"
              StepIconProps={{
                sx: { color: theme.palette.primary.main },
              }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                Abra as configurações do Airbnb
              </Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Clique no botão abaixo para abrir diretamente a página de configurações de calendário do seu imóvel no Airbnb.
              </Typography>

              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<OpenInNew />}
                  onClick={handleOpenAirbnbSettings}
                  disabled={!airbnbCalendarUrl}
                  size="large"
                >
                  Abrir Configurações do Airbnb
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<ContentCopy />}
                  onClick={handleCopyExportUrl}
                  disabled={!airbnbCalendarUrl}
                >
                  {copiedExport ? <CheckCircle fontSize="small" /> : 'Copiar Link'}
                </Button>
              </Box>

              {airbnbCalendarUrl && (
                <Paper
                  variant="outlined"
                  sx={{
                    mt: 2,
                    p: 1.5,
                    bgcolor: alpha(theme.palette.info.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Link direto (caso não abra automaticamente):
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      color: theme.palette.info.main,
                    }}
                  >
                    {airbnbCalendarUrl}
                  </Typography>
                </Paper>
              )}
            </StepContent>
          </Step>

          {/* Step 2: Get Export URL (Import to Locai) */}
          <Step expanded>
            <StepLabel
              icon="2"
              StepIconProps={{
                sx: { color: theme.palette.success.main },
              }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                Copie o link de exportação do Airbnb
              </Typography>
              <Chip
                label="Importar para Locai"
                size="small"
                color="success"
                sx={{ ml: 1 }}
              />
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Na página que abriu:
              </Typography>
              <Box component="ol" sx={{ pl: 2, my: 1 }}>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  Procure pela seção <strong>"Exportar calendário"</strong>
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  Copie o <strong>"Link do calendário secreto"</strong> (termina com .ics)
                </Typography>
                <Typography component="li" variant="body2">
                  Cole esse link no campo <strong>"Link iCal do Airbnb"</strong> aqui no sistema
                </Typography>
              </Box>

              <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 2 }}>
                <Typography variant="body2">
                  ✓ Isso permite importar suas <strong>reservas do Airbnb</strong> automaticamente para o Locai
                </Typography>
              </Alert>
            </StepContent>
          </Step>

          {/* Step 3: Import our calendar (Export from Locai) */}
          <Step expanded>
            <StepLabel
              icon="3"
              StepIconProps={{
                sx: { color: theme.palette.warning.main },
              }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                Importe nosso calendário no Airbnb
              </Typography>
              <Chip
                label="Exportar do Locai"
                size="small"
                color="warning"
                sx={{ ml: 1 }}
              />
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Ainda na mesma página do Airbnb:
              </Typography>
              <Box component="ol" sx={{ pl: 2, my: 1 }}>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  Procure pela seção <strong>"Importar calendário"</strong>
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  Clique em <strong>"Importar calendário"</strong>
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  Cole o <strong>link do Locai</strong> (você receberá após concluir a importação)
                </Typography>
                <Typography component="li" variant="body2">
                  Dê um nome como "Locai - Reservas Internas"
                </Typography>
              </Box>

              <Alert severity="warning" icon={<Info />} sx={{ mt: 2 }}>
                <Typography variant="body2">
                  ℹ️ Nosso link será gerado após você importar o imóvel. Você poderá configurar isso depois nas configurações do imóvel.
                </Typography>
              </Alert>
            </StepContent>
          </Step>
        </Stepper>

        <Paper
          sx={{
            mt: 3,
            p: 2,
            bgcolor: alpha(theme.palette.success.main, 0.05),
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" fontSize="small" />
            Resultado Final
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ✓ Reservas do Airbnb aparecerão automaticamente aqui
            <br />
            ✓ Reservas criadas aqui aparecerão bloqueadas no Airbnb
            <br />
            ✓ Sincronização automática a cada 24 horas
          </Typography>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button onClick={onClose} variant="outlined" size="large">
          Fechar
        </Button>
        {airbnbCalendarUrl && (
          <Button
            onClick={handleOpenAirbnbSettings}
            variant="contained"
            startIcon={<OpenInNew />}
            size="large"
          >
            Ir para Airbnb
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
