'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Avatar,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  CircularProgress,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Language,
  CheckCircle,
  Close,
  ContentCopy,
  Refresh,
  Add,
  Remove,
  Security,
  Speed,
  Warning,
  Error,
  Info,
  CloudDone,
  Dns,
  VpnKey,
  Public,
  ShoppingCart,
  Star,
} from '@mui/icons-material';
import Toast from '@/components/atoms/Toast';
import { useToast } from '@/lib/hooks/useToast';

interface CustomDomainConfigProps {
  tenantId: string;
  currentDomain?: string;
  onDomainChange: (domain: string) => void;
}

interface DomainStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

interface DomainSuggestion {
  domain: string;
  available: boolean;
  price?: number;
  registrar?: string;
}

export default function CustomDomainConfig({
  tenantId,
  currentDomain,
  onDomainChange,
}: CustomDomainConfigProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { toast, hideToast, showSuccess, showError } = useToast();
  
  const [domain, setDomain] = useState(currentDomain || '');
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [domainStatus, setDomainStatus] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<DomainSuggestion[]>([]);
  const [availableUrls, setAvailableUrls] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const steps: DomainStep[] = [
    {
      title: 'Configurar Domínio',
      description: 'Insira seu domínio personalizado',
      icon: <Language />,
      status: domain ? 'completed' : 'pending',
    },
    {
      title: 'Configurar DNS',
      description: 'Configure os registros DNS',
      icon: <Dns />,
      status: domainStatus?.dnsRecords?.[0]?.status === 'verified' ? 'completed' : 'pending',
    },
    {
      title: 'Verificar SSL',
      description: 'Aguarde a configuração do SSL',
      icon: <Security />,
      status: domainStatus?.sslStatus === 'active' ? 'completed' : 'pending',
    },
    {
      title: 'Ativação',
      description: 'Domínio pronto para uso',
      icon: <CloudDone />,
      status: domainStatus?.status === 'active' ? 'completed' : 'pending',
    },
  ];

  useEffect(() => {
    loadDomainStatus();
  }, [tenantId]);

  const loadDomainStatus = async () => {
    try {
      const response = await fetch('/api/mini-site/domain');
      const data = await response.json();
      
      if (data.hasCustomDomain) {
        setDomainStatus(data.domainStatus);
        setDomain(data.customDomain);
      } else {
        setAvailableUrls(data.availableUrls);
      }
    } catch (error) {
      console.error('Error loading domain status:', error);
    }
  };

  const handleDomainValidation = async () => {
    if (!domain) return;

    setLoading(true);
    try {
      const response = await fetch('/api/mini-site/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', domain }),
      });

      const data = await response.json();
      
      if (data.validation.isValid) {
        setActiveStep(1);
        setDomainStatus(data.validation);
      } else {
        showError('Domínio inválido. Verifique o formato e tente novamente.');
      }
    } catch (error) {
      console.error('Domain validation error:', error);
      showError('Erro ao validar domínio. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDomainConfiguration = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mini-site/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'configure', domain }),
      });

      const data = await response.json();
      setDomainStatus(data.configuration);
      setActiveStep(2);
      onDomainChange(domain);
    } catch (error) {
      console.error('Domain configuration error:', error);
      showError('Erro ao configurar domínio. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDomainVerification = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mini-site/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', domain }),
      });

      const data = await response.json();
      setDomainStatus(data.verification);
      
      if (data.verification.status === 'active') {
        setActiveStep(3);
      }
    } catch (error) {
      console.error('Domain verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!confirm('Tem certeza que deseja remover o domínio personalizado?')) {
      return;
    }

    setLoading(true);
    try {
      await fetch('/api/mini-site/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove' }),
      });

      setDomain('');
      setDomainStatus(null);
      setActiveStep(0);
      onDomainChange('');
      await loadDomainStatus();
    } catch (error) {
      console.error('Remove domain error:', error);
      showError('Erro ao remover domínio. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestDomains = async () => {
    if (!domain) return;

    setLoading(true);
    try {
      const response = await fetch('/api/mini-site/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest', domain }),
      });

      const data = await response.json();
      setSuggestions(data.suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Domain suggestion error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
      case 'verified':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
      case 'verified':
        return <CheckCircle />;
      case 'pending':
        return <CircularProgress size={20} />;
      case 'failed':
        return <Error />;
      default:
        return <Info />;
    }
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <Language />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Domínio Personalizado
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure seu próprio domínio para o mini-site
                </Typography>
              </Box>
            </Box>
            {currentDomain && (
              <Button
                variant="outlined"
                color="error"
                onClick={handleRemoveDomain}
                disabled={loading}
                size="small"
              >
                Remover
              </Button>
            )}
          </Box>

          {!currentDomain && (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Configure um domínio personalizado para seu mini-site. Exemplo: minhaempresa.com.br
                </Typography>
              </Alert>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  URLs Disponíveis
                </Typography>
                <List dense>
                  {availableUrls.map((url, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon>
                        <Public fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={url}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontFamily: 'monospace',
                        }}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          onClick={() => handleCopy(url)}
                          size="small"
                        >
                          {copied === url ? <CheckCircle color="success" /> : <ContentCopy />}
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Domínio Personalizado"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="exemplo.com.br"
                  disabled={loading}
                  helperText="Insira seu domínio sem www"
                />
              </Box>

              <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleDomainValidation}
                  disabled={!domain || loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                  sx={{ flex: 1 }}
                >
                  Validar
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleSuggestDomains}
                  disabled={!domain || loading}
                  startIcon={<Star />}
                >
                  Sugerir
                </Button>
              </Stack>

              {domainStatus && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Status do Domínio
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={domainStatus.status}
                        color={getStatusColor(domainStatus.status)}
                        size="small"
                        icon={getStatusIcon(domainStatus.status)}
                      />
                      <Typography variant="body2">
                        {domainStatus.domain}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Última verificação: {new Date(domainStatus.lastChecked).toLocaleString('pt-BR')}
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Configuração
              </Typography>
              
              <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((step, index) => (
                  <Step key={step.title}>
                    <StepLabel
                      StepIconComponent={({ completed, active }) => (
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: completed ? 'success.main' : active ? 'primary.main' : 'grey.300',
                          }}
                        >
                          {step.icon}
                        </Avatar>
                      )}
                    >
                      <Typography variant="body1" fontWeight={500}>
                        {step.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      {index === 1 && domainStatus?.dnsRecords && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            Configure os seguintes registros DNS:
                          </Typography>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Tipo</TableCell>
                                  <TableCell>Nome</TableCell>
                                  <TableCell>Valor</TableCell>
                                  <TableCell>Status</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {domainStatus.dnsRecords.map((record: any, i: number) => (
                                  <TableRow key={i}>
                                    <TableCell>{record.type}</TableCell>
                                    <TableCell>{record.name}</TableCell>
                                    <TableCell>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                          {record.value}
                                        </Typography>
                                        <IconButton
                                          onClick={() => handleCopy(record.value)}
                                          size="small"
                                        >
                                          {copied === record.value ? <CheckCircle color="success" /> : <ContentCopy />}
                                        </IconButton>
                                      </Box>
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        label={record.status}
                                        color={getStatusColor(record.status)}
                                        size="small"
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          <Box sx={{ mt: 2 }}>
                            <Button
                              variant="outlined"
                              onClick={handleDomainVerification}
                              disabled={loading}
                              startIcon={<Refresh />}
                            >
                              Verificar DNS
                            </Button>
                          </Box>
                        </Box>
                      )}
                      {index === 0 && (
                        <Button
                          variant="outlined"
                          onClick={handleDomainConfiguration}
                          disabled={!domainStatus || loading}
                          sx={{ mt: 2 }}
                        >
                          Configurar Domínio
                        </Button>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Domain Suggestions Dialog */}
      <Dialog
        open={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Sugestões de Domínio</Typography>
            <IconButton onClick={() => setShowSuggestions(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <List>
            {suggestions.map((suggestion, index) => (
              <ListItem key={index} divider>
                <ListItemIcon>
                  <Language color={suggestion.available ? 'success' : 'disabled'} />
                </ListItemIcon>
                <ListItemText
                  primary={suggestion.domain}
                  secondary={
                    suggestion.available 
                      ? `Disponível - R$ ${suggestion.price}/ano via ${suggestion.registrar}`
                      : 'Indisponível'
                  }
                />
                <ListItemSecondaryAction>
                  {suggestion.available && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ShoppingCart />}
                      onClick={() => {
                        window.open(`https://registro.br/dominio/consulta/?termo=${suggestion.domain}`, '_blank');
                      }}
                    >
                      Comprar
                    </Button>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Toast Notifications */}
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    </Box>
  );
}