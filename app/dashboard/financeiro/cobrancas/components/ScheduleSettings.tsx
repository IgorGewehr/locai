'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Switch,
  FormControlLabel,
  Button,
  TextField,
} from '@mui/material';
import {
  AccessTime,
  CalendarMonth,
  Schedule,
  Weekend,
  EventBusy,
  CheckCircle,
  Warning,
  Info,
  Notifications,
  NotificationImportant,
} from '@mui/icons-material';
import { BillingSettings } from '@/lib/types/billing';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { parse, format } from 'date-fns';

interface ScheduleSettingsProps {
  settings: BillingSettings | null;
  onChange: (updates: Partial<BillingSettings>) => void;
}

const weekDays = [
  { value: 0, label: 'Dom', fullLabel: 'Domingo' },
  { value: 1, label: 'Seg', fullLabel: 'Segunda' },
  { value: 2, label: 'Ter', fullLabel: 'Terça' },
  { value: 3, label: 'Qua', fullLabel: 'Quarta' },
  { value: 4, label: 'Qui', fullLabel: 'Quinta' },
  { value: 5, label: 'Sex', fullLabel: 'Sexta' },
  { value: 6, label: 'Sáb', fullLabel: 'Sábado' },
];

export default function ScheduleSettings({ settings, onChange }: ScheduleSettingsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!settings) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Carregando configurações...
        </Typography>
      </Box>
    );
  }

  const handleWorkDaysChange = (event: React.MouseEvent<HTMLElement>, newDays: number[]) => {
    if (newDays.length > 0) {
      onChange({ workDays: newDays });
    }
  };

  const handleTimeChange = (field: 'sendTimeStart' | 'sendTimeEnd', time: Date | null) => {
    if (time) {
      onChange({ [field]: format(time, 'HH:mm') });
    }
  };

  const parseTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Grid container spacing={3}>
        {/* Horário de Funcionamento */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <AccessTime sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Horário de Envio</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TimePicker
                    label="Início"
                    value={parseTime(settings.sendTimeStart)}
                    onChange={(time) => handleTimeChange('sendTimeStart', time)}
                    ampm={false}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        helperText: 'Horário mínimo para envio',
                      },
                    }}
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <TimePicker
                    label="Fim"
                    value={parseTime(settings.sendTimeEnd)}
                    onChange={(time) => handleTimeChange('sendTimeEnd', time)}
                    ampm={false}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        helperText: 'Horário máximo para envio',
                      },
                    }}
                  />
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Mensagens serão enviadas apenas dentro deste horário para respeitar seus clientes.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Dias da Semana */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <CalendarMonth sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Dias de Envio</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Selecione os dias da semana em que os lembretes devem ser enviados
              </Typography>

              <ToggleButtonGroup
                value={settings.workDays}
                onChange={handleWorkDaysChange}
                aria-label="dias de trabalho"
                fullWidth
              >
                {weekDays.map((day) => (
                  <ToggleButton 
                    key={day.value} 
                    value={day.value}
                    title={day.fullLabel}
                  >
                    {day.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => onChange({ workDays: [1, 2, 3, 4, 5] })}
                >
                  Dias úteis
                </Button>
                <Button
                  size="small"
                  onClick={() => onChange({ workDays: [0, 1, 2, 3, 4, 5, 6] })}
                >
                  Todos os dias
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Frequência e Limites */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Schedule sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Frequência e Limites</Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <NotificationImportant sx={{ mr: 1, color: 'warning.main' }} />
                      <Typography variant="subtitle2">Limite Diário</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Máximo de lembretes por dia para cada cliente
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select value={1}>
                        <MenuItem value={1}>1 lembrete por dia</MenuItem>
                        <MenuItem value={2}>2 lembretes por dia</MenuItem>
                        <MenuItem value={3}>3 lembretes por dia</MenuItem>
                      </Select>
                    </FormControl>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Notifications sx={{ mr: 1, color: 'info.main' }} />
                      <Typography variant="subtitle2">Intervalo Mínimo</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Tempo mínimo entre lembretes consecutivos
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select value={24}>
                        <MenuItem value={12}>12 horas</MenuItem>
                        <MenuItem value={24}>24 horas</MenuItem>
                        <MenuItem value={48}>48 horas</MenuItem>
                        <MenuItem value={72}>72 horas</MenuItem>
                      </Select>
                    </FormControl>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <EventBusy sx={{ mr: 1, color: 'error.main' }} />
                      <Typography variant="subtitle2">Parar Após</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Parar de enviar após X dias de atraso
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select value={30}>
                        <MenuItem value={15}>15 dias</MenuItem>
                        <MenuItem value={30}>30 dias</MenuItem>
                        <MenuItem value={60}>60 dias</MenuItem>
                        <MenuItem value={90}>90 dias</MenuItem>
                        <MenuItem value={0}>Nunca parar</MenuItem>
                      </Select>
                    </FormControl>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Regras Especiais */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Weekend sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Regras Especiais</Typography>
                </Box>
                <Button
                  size="small"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Ocultar' : 'Mostrar'} configurações avançadas
                </Button>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Respeitar feriados nacionais"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 4.5 }}>
                    Não enviar lembretes em feriados
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Pausar em fins de semana prolongados"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 4.5 }}>
                    Evitar envios em vésperas de feriados
                  </Typography>
                </Grid>
              </Grid>

              {showAdvanced && (
                <>
                  <Divider sx={{ my: 3 }} />
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Configurações Avançadas
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Delay entre envios (segundos)"
                        type="number"
                        defaultValue="5"
                        helperText="Tempo de espera entre cada envio em lote"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Tamanho do lote"
                        type="number"
                        defaultValue="50"
                        helperText="Quantos lembretes processar por vez"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={<Switch />}
                        label="Modo de teste"
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 4.5 }}>
                        Simular envios sem realmente enviar mensagens (útil para testes)
                      </Typography>
                    </Grid>
                  </Grid>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Resumo */}
        <Grid item xs={12}>
          <Alert severity="success">
            <Typography variant="subtitle2" gutterBottom>
              Resumo das configurações:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary={`Lembretes serão enviados entre ${settings.sendTimeStart} e ${settings.sendTimeEnd}`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary={`Apenas nos dias: ${settings.workDays.map(d => weekDays.find(w => w.value === d)?.label).join(', ')}`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary={`Máximo de ${settings.maxReminders} lembretes por fatura`}
                />
              </ListItem>
            </List>
          </Alert>
        </Grid>
      </Grid>
    </LocalizationProvider>
  );
}