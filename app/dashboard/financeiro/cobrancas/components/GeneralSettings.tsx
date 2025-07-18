'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormGroup,
  FormHelperText,
  Alert,
  Divider,
  Button,
  Chip,
  Paper,
} from '@mui/material';
import {
  Info,
  Warning,
  CheckCircle,
  Schedule,
  AttachMoney,
  Category,
  Notifications,
} from '@mui/icons-material';
import { BillingSettings } from '@/lib/types/billing';

interface GeneralSettingsProps {
  settings: BillingSettings | null;
  onChange: (updates: Partial<BillingSettings>) => void;
}

export default function GeneralSettings({ settings, onChange }: GeneralSettingsProps) {
  if (!settings) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body1">
            Configurações não encontradas. O sistema criará configurações padrão quando você salvar.
          </Typography>
        </Alert>
      </Box>
    );
  }

  const handleToggle = (field: keyof BillingSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ [field]: event.target.checked });
  };

  const handleNumberChange = (field: keyof BillingSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value)) {
      onChange({ [field]: value });
    }
  };

  const handleTransactionTypeToggle = (type: keyof typeof settings.transactionTypes) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      transactionTypes: {
        ...settings.transactionTypes,
        [type]: event.target.checked,
      }
    });
  };

  return (
    <Grid container spacing={3}>
      {/* Status Geral */}
      <Grid item xs={12}>
        <Paper elevation={0} sx={{ p: 3, bgcolor: settings.enabled ? 'success.light' : 'grey.100' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CheckCircle sx={{ fontSize: 40, color: settings.enabled ? 'success.main' : 'grey.400' }} />
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Sistema de Cobrança Automática
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {settings.enabled ? 'Ativo e funcionando' : 'Desativado - Ative para começar a enviar lembretes'}
                </Typography>
              </Box>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enabled}
                  onChange={handleToggle('enabled')}
                  size="large"
                  color="success"
                />
              }
              label={settings.enabled ? 'Ativado' : 'Desativado'}
              labelPlacement="start"
            />
          </Box>
        </Paper>
      </Grid>

      {/* Configurações de Tempo */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Schedule sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Tempo de Lembretes</Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Dias antes do vencimento"
                  type="number"
                  value={settings.defaultReminderDays}
                  onChange={handleNumberChange('defaultReminderDays')}
                  InputProps={{
                    inputProps: { min: 0, max: 30 }
                  }}
                  helperText="Quantos dias antes do vencimento enviar o primeiro lembrete"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Dias após vencimento"
                  type="number"
                  value={settings.defaultOverdueDays}
                  onChange={handleNumberChange('defaultOverdueDays')}
                  InputProps={{
                    inputProps: { min: 0, max: 30 }
                  }}
                  helperText="Quantos dias após o vencimento enviar lembrete de atraso"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Máximo de lembretes"
                  type="number"
                  value={settings.maxReminders}
                  onChange={handleNumberChange('maxReminders')}
                  InputProps={{
                    inputProps: { min: 1, max: 10 }
                  }}
                  helperText="Número máximo de lembretes por fatura"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Tipos de Transação */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Category sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Tipos de Transação</Typography>
            </Box>
            
            <FormHelperText sx={{ mb: 2 }}>
              Selecione quais tipos de transação devem gerar lembretes automáticos
            </FormHelperText>
            
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={settings.transactionTypes.all}
                    onChange={handleTransactionTypeToggle('all')}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Todos os tipos
                    <Chip size="small" label="Recomendado" sx={{ ml: 1 }} />
                  </Box>
                }
              />
              
              <Divider sx={{ my: 1 }} />
              
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={settings.transactionTypes.reservation}
                    onChange={handleTransactionTypeToggle('reservation')}
                    disabled={settings.transactionTypes.all}
                  />
                }
                label="Reservas"
              />
              
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={settings.transactionTypes.maintenance}
                    onChange={handleTransactionTypeToggle('maintenance')}
                    disabled={settings.transactionTypes.all}
                  />
                }
                label="Manutenção"
              />
              
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={settings.transactionTypes.cleaning}
                    onChange={handleTransactionTypeToggle('cleaning')}
                    disabled={settings.transactionTypes.all}
                  />
                }
                label="Limpeza"
              />
              
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={settings.transactionTypes.commission}
                    onChange={handleTransactionTypeToggle('commission')}
                    disabled={settings.transactionTypes.all}
                  />
                }
                label="Comissão"
              />
              
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={settings.transactionTypes.other}
                    onChange={handleTransactionTypeToggle('other')}
                    disabled={settings.transactionTypes.all}
                  />
                }
                label="Outros"
              />
            </FormGroup>
          </CardContent>
        </Card>
      </Grid>

      {/* Notificações e Relatórios */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Notifications sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Notificações e Relatórios</Typography>
            </Box>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Você receberá notificações sobre:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <Typography component="li" variant="body2">Lembretes enviados com sucesso</Typography>
                <Typography component="li" variant="body2">Confirmações de pagamento</Typography>
                <Typography component="li" variant="body2">Respostas dos clientes</Typography>
                <Typography component="li" variant="body2">Falhas no envio</Typography>
              </Box>
            </Alert>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<AttachMoney />}>
                Configurar Taxa de Juros
              </Button>
              <Button variant="outlined" startIcon={<Warning />}>
                Configurar Multas
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}