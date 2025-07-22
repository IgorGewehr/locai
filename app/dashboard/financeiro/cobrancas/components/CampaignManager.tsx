'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
  Tooltip,
  FormControlLabel,
  Switch,
  Checkbox,
  FormGroup,
  FormHelperText,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Campaign,
  Send,
  Pause,
  Stop,
  Edit,
  Delete,
  Visibility,
  Schedule,
  People,
  AttachMoney,
  TrendingUp,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  FilterList,
  Download,
} from '@mui/icons-material';
import { BillingCampaign } from '@/lib/types/billing';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface CampaignManagerProps {
  tenantId: string;
}

interface CreateCampaignData {
  name: string;
  description: string;
  type: 'one_time' | 'recurring';
  scheduledDate: Date;
  filters: {
    propertyIds?: string[];
    clientIds?: string[];
    amountMin?: number;
    amountMax?: number;
    daysOverdueMin?: number;
    daysOverdueMax?: number;
    categories?: string[];
  };
  templateId: string;
  testMode: boolean;
}

export default function CampaignManager({ tenantId }: CampaignManagerProps) {
  const [campaigns, setCampaigns] = useState<BillingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [newCampaign, setNewCampaign] = useState<CreateCampaignData>({
    name: '',
    description: '',
    type: 'one_time',
    scheduledDate: new Date(),
    filters: {},
    templateId: '',
    testMode: false,
  });

  useEffect(() => {
    loadCampaigns();
  }, [tenantId]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/billing/campaigns?tenantId=${tenantId}`);
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const response = await fetch('/api/billing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCampaign,
          tenantId,
        }),
      });

      if (response.ok) {
        setCreateDialogOpen(false);
        setActiveStep(0);
        setNewCampaign({
          name: '',
          description: '',
          type: 'one_time',
          scheduledDate: new Date(),
          filters: {},
          templateId: '',
          testMode: false,
        });
        await loadCampaigns();
      }
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'info';
      case 'running': return 'primary';
      case 'completed': return 'success';
      case 'paused': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Schedule />;
      case 'running': return <Send />;
      case 'completed': return <CheckCircle />;
      case 'paused': return <Pause />;
      case 'cancelled': return <Stop />;
      default: return null;
    }
  };

  const renderCampaignMetrics = (campaign: BillingCampaign) => {
    const total = campaign.stats.totalRecipients;
    if (total === 0) return null;

    const deliveryRate = (campaign.stats.delivered / total) * 100;
    const readRate = (campaign.stats.read / campaign.stats.delivered) * 100;
    const responseRate = (campaign.stats.responded / campaign.stats.delivered) * 100;
    const conversionRate = (campaign.stats.paid / campaign.stats.delivered) * 100;

    return (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Tooltip title={`${campaign.stats.delivered} de ${total} entregues`}>
          <Chip
            size="small"
            label={`Entrega: ${deliveryRate.toFixed(0)}%`}
            color={deliveryRate > 90 ? 'success' : 'warning'}
          />
        </Tooltip>
        <Tooltip title={`${campaign.stats.read} lidas`}>
          <Chip
            size="small"
            label={`Leitura: ${readRate.toFixed(0)}%`}
            color={readRate > 70 ? 'success' : 'default'}
          />
        </Tooltip>
        <Tooltip title={`${campaign.stats.responded} respostas`}>
          <Chip
            size="small"
            label={`Resposta: ${responseRate.toFixed(0)}%`}
            color={responseRate > 30 ? 'success' : 'default'}
          />
        </Tooltip>
        <Tooltip title={`${campaign.stats.paid} pagamentos`}>
          <Chip
            size="small"
            label={`Conversão: ${conversionRate.toFixed(0)}%`}
            color={conversionRate > 20 ? 'success' : 'error'}
          />
        </Tooltip>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Grid container spacing={3}>
        {/* Header com Estatísticas */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Campanhas de Cobrança
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerencie campanhas em massa para grupos específicos de clientes
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Nova Campanha
            </Button>
          </Box>
        </Grid>

        {/* Cards de Métricas */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Campaign sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h4">
                  {campaigns.length}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total de Campanhas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <People sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h4">
                  {campaigns.reduce((sum, c) => sum + c.stats.totalRecipients, 0)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Clientes Alcançados
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AttachMoney sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h4">
                  {campaigns.reduce((sum, c) => sum + c.stats.paid, 0)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Pagamentos Recebidos
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h4">
                  {campaigns.length > 0 
                    ? Math.round(
                        campaigns.reduce((sum, c) => 
                          sum + (c.stats.paid / c.stats.totalRecipients || 0), 0
                        ) / campaigns.length * 100
                      )
                    : 0}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Taxa Média de Conversão
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Lista de Campanhas */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Campanhas Criadas</Typography>
                <Box>
                  <IconButton size="small">
                    <FilterList />
                  </IconButton>
                  <IconButton size="small">
                    <Download />
                  </IconButton>
                </Box>
              </Box>

              {campaigns.length === 0 ? (
                <Alert severity="info">
                  <Typography variant="body2">
                    Você ainda não criou nenhuma campanha. Clique em "Nova Campanha" para começar.
                  </Typography>
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Agendada para</TableCell>
                        <TableCell>Destinatários</TableCell>
                        <TableCell>Métricas</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <Typography variant="subtitle2">{campaign.name}</Typography>
                            {campaign.description && (
                              <Typography variant="body2" color="text.secondary">
                                {campaign.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={campaign.type === 'one_time' ? 'Única' : 'Recorrente'}
                              variant={campaign.type === 'recurring' ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              icon={getStatusIcon(campaign.status)}
                              label={campaign.status}
                              color={getStatusColor(campaign.status)}
                            />
                          </TableCell>
                          <TableCell>
                            {format(campaign.scheduledDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {campaign.stats.totalRecipients} clientes
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {renderCampaignMetrics(campaign)}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Visualizar">
                              <IconButton size="small">
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            {campaign.status === 'scheduled' && (
                              <>
                                <Tooltip title="Editar">
                                  <IconButton size="small">
                                    <Edit />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancelar">
                                  <IconButton size="small" color="error">
                                    <Delete />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {campaign.status === 'running' && (
                              <Tooltip title="Pausar">
                                <IconButton size="small" color="warning">
                                  <Pause />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Tips */}
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              Dicas para campanhas efetivas:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <Typography component="li" variant="body2">
                Segmente seus clientes por período de atraso para mensagens mais relevantes
              </Typography>
              <Typography component="li" variant="body2">
                Evite campanhas muito frequentes para não incomodar os clientes
              </Typography>
              <Typography component="li" variant="body2">
                Teste primeiro com um grupo pequeno antes de enviar para todos
              </Typography>
              <Typography component="li" variant="body2">
                Acompanhe as métricas para otimizar suas próximas campanhas
              </Typography>
            </Box>
          </Alert>
        </Grid>
      </Grid>

      {/* Dialog de Criação de Campanha */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Nova Campanha de Cobrança
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Stepper activeStep={activeStep} orientation="vertical">
              <Step>
                <StepLabel>Informações Básicas</StepLabel>
                <StepContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Nome da Campanha"
                        value={newCampaign.name}
                        onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                        helperText="Ex: Cobrança Dezembro 2024"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Descrição (opcional)"
                        value={newCampaign.description}
                        onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Tipo de Campanha</InputLabel>
                        <Select
                          value={newCampaign.type}
                          onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value as any })}
                          label="Tipo de Campanha"
                        >
                          <MenuItem value="one_time">Única</MenuItem>
                          <MenuItem value="recurring">Recorrente</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <DateTimePicker
                        label="Data e Hora de Envio"
                        value={newCampaign.scheduledDate}
                        onChange={(date) => date && setNewCampaign({ ...newCampaign, scheduledDate: date })}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        onClick={() => setActiveStep(1)}
                        disabled={!newCampaign.name}
                      >
                        Próximo
                      </Button>
                    </Grid>
                  </Grid>
                </StepContent>
              </Step>

              <Step>
                <StepLabel>Filtros de Destinatários</StepLabel>
                <StepContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          Defina os critérios para selecionar os destinatários desta campanha
                        </Typography>
                      </Alert>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Valor mínimo"
                        type="number"
                        InputProps={{
                          startAdornment: 'R$',
                        }}
                        helperText="Cobrar apenas faturas acima deste valor"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Valor máximo"
                        type="number"
                        InputProps={{
                          startAdornment: 'R$',
                        }}
                        helperText="Cobrar apenas faturas abaixo deste valor"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Dias de atraso mínimo"
                        type="number"
                        defaultValue={1}
                        helperText="Cobrar apenas faturas com X dias de atraso"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Dias de atraso máximo"
                        type="number"
                        helperText="Não cobrar faturas com mais de X dias"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        Categorias de transação
                      </Typography>
                      <FormGroup row>
                        <FormControlLabel control={<Checkbox defaultChecked />} label="Reservas" />
                        <FormControlLabel control={<Checkbox defaultChecked />} label="Manutenção" />
                        <FormControlLabel control={<Checkbox defaultChecked />} label="Limpeza" />
                        <FormControlLabel control={<Checkbox defaultChecked />} label="Outros" />
                      </FormGroup>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button onClick={() => setActiveStep(0)}>
                          Voltar
                        </Button>
                        <Button variant="contained" onClick={() => setActiveStep(2)}>
                          Próximo
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </StepContent>
              </Step>

              <Step>
                <StepLabel>Revisar e Enviar</StepLabel>
                <StepContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Resumo da Campanha
                        </Typography>
                        <Typography variant="body2">
                          Nome: <strong>{newCampaign.name}</strong>
                        </Typography>
                        <Typography variant="body2">
                          Tipo: <strong>{newCampaign.type === 'one_time' ? 'Única' : 'Recorrente'}</strong>
                        </Typography>
                        <Typography variant="body2">
                          Agendada para: <strong>{format(newCampaign.scheduledDate, 'dd/MM/yyyy HH:mm')}</strong>
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Destinatários estimados: <strong>42 clientes</strong>
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={newCampaign.testMode}
                            onChange={(e) => setNewCampaign({ ...newCampaign, testMode: e.target.checked })}
                          />
                        }
                        label="Modo de teste (simular envios sem enviar mensagens)"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Alert severity="warning">
                        <Typography variant="body2">
                          Ao criar esta campanha, os lembretes serão enviados automaticamente na data agendada.
                          Certifique-se de que todas as configurações estão corretas.
                        </Typography>
                      </Alert>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button onClick={() => setActiveStep(1)}>
                          Voltar
                        </Button>
                        <Button 
                          variant="contained" 
                          onClick={handleCreateCampaign}
                          startIcon={<Send />}
                        >
                          Criar Campanha
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </StepContent>
              </Step>
            </Stepper>
          </Box>
        </DialogContent>
      </Dialog>
    </LocalizationProvider>
  );
}