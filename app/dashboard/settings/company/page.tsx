/**
 * COMPANY SETTINGS PAGE
 *
 * Manages company address, business information, and fiscal data
 * Consolidates settings previously scattered in properties dialogs
 *
 * @version 2.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Save as SaveIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthProvider';
import { logger } from '@/lib/utils/logger';

interface CompanyInfo {
  // Business Identity
  legalName: string;
  tradeName: string;
  cnpj: string;
  stateRegistration?: string;
  municipalRegistration?: string;

  // Contact
  email: string;
  phone: string;
  website?: string;

  // Address
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const DEFAULT_COMPANY_INFO: CompanyInfo = {
  legalName: '',
  tradeName: '',
  cnpj: '',
  stateRegistration: '',
  municipalRegistration: '',
  email: '',
  phone: '',
  website: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Brasil',
};

export default function CompanySettingsPage() {
  const { tenantId, isReady } = useTenant();
  const { getFirebaseToken } = useAuth();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(DEFAULT_COMPANY_INFO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load company info
  useEffect(() => {
    if (!isReady || !tenantId) return;

    const loadCompanyInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = await getFirebaseToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        const response = await fetch('/api/tenant/settings/company', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load company information');
        }

        const data = await response.json();

        if (data.success && data.data) {
          setCompanyInfo(data.data);
        }
      } catch (err) {
        logger.error('[COMPANY-SETTINGS] Failed to load', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        setError('Erro ao carregar informações da empresa');
      } finally {
        setLoading(false);
      }
    };

    loadCompanyInfo();
  }, [tenantId, isReady]);

  // Handle save
  const handleSave = async () => {
    if (!tenantId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Basic validation
      if (!companyInfo.tradeName) {
        setError('Nome fantasia é obrigatório');
        return;
      }

      if (!companyInfo.email) {
        setError('Email é obrigatório');
        return;
      }

      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch('/api/tenant/settings/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(companyInfo),
      });

      if (!response.ok) {
        throw new Error('Failed to save company information');
      }

      setSuccess(true);
      logger.info('[COMPANY-SETTINGS] Settings saved successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      logger.error('[COMPANY-SETTINGS] Failed to save', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Erro ao salvar informações da empresa');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo((prev) => ({ ...prev, [field]: value }));
  };

  if (!isReady || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <BusinessIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight={600}>
            Informações da Empresa
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Configure os dados da sua imobiliária para contratos, notas fiscais e comunicações
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          ✅ Informações da empresa salvas com sucesso!
        </Alert>
      )}

      {/* Business Identity */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BadgeIcon color="primary" />
            Identificação da Empresa
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Razão Social"
                value={companyInfo.legalName}
                onChange={(e) => handleChange('legalName', e.target.value)}
                placeholder="Ex: Imobiliária Exemplo Ltda"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Nome Fantasia"
                value={companyInfo.tradeName}
                onChange={(e) => handleChange('tradeName', e.target.value)}
                placeholder="Ex: Imobiliária Exemplo"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="CNPJ"
                value={companyInfo.cnpj}
                onChange={(e) => handleChange('cnpj', e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Inscrição Estadual"
                value={companyInfo.stateRegistration}
                onChange={(e) => handleChange('stateRegistration', e.target.value)}
                placeholder="Opcional"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Inscrição Municipal"
                value={companyInfo.municipalRegistration}
                onChange={(e) => handleChange('municipalRegistration', e.target.value)}
                placeholder="Opcional"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneIcon color="primary" />
            Informações de Contato
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="email"
                label="Email Comercial"
                value={companyInfo.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contato@imobiliaria.com"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefone Comercial"
                value={companyInfo.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(11) 99999-9999"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Website"
                value={companyInfo.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://www.imobiliaria.com"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Address */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon color="primary" />
            Endereço Comercial
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="CEP"
                value={companyInfo.zipCode}
                onChange={(e) => handleChange('zipCode', e.target.value)}
                placeholder="00000-000"
              />
            </Grid>

            <Grid item xs={12} md={7}>
              <TextField
                fullWidth
                label="Rua/Avenida"
                value={companyInfo.street}
                onChange={(e) => handleChange('street', e.target.value)}
                placeholder="Ex: Avenida Paulista"
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Número"
                value={companyInfo.number}
                onChange={(e) => handleChange('number', e.target.value)}
                placeholder="000"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Complemento"
                value={companyInfo.complement}
                onChange={(e) => handleChange('complement', e.target.value)}
                placeholder="Sala, andar, bloco..."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bairro"
                value={companyInfo.neighborhood}
                onChange={(e) => handleChange('neighborhood', e.target.value)}
                placeholder="Ex: Centro"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cidade"
                value={companyInfo.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Ex: São Paulo"
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Estado"
                value={companyInfo.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="SP"
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="País"
                value={companyInfo.country}
                onChange={(e) => handleChange('country', e.target.value)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          sx={{ minWidth: 200 }}
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </Box>
    </Box>
  );
}
