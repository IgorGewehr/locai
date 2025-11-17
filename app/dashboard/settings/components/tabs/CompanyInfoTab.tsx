'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Avatar,
  IconButton,
  Card,
  CardContent,
  InputAdornment,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  Business,
  Phone,
  Email,
  Language,
  LocationOn,
  Edit,
  Save,
  Cancel,
  Upload,
  Delete,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';

interface CompanyInfo {
  name: string;
  phone: string;
  email: string;
  website: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  logo?: string;
  description?: string;
}

const defaultCompanyInfo: CompanyInfo = {
  name: '',
  phone: '',
  email: '',
  website: '',
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
  },
};

interface Props {
  setGlobalError: (error: string | null) => void;
  setGlobalSuccess: (success: string | null) => void;
}

export default function CompanyInfoTab({ setGlobalError, setGlobalSuccess }: Props) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(defaultCompanyInfo);
  const [originalInfo, setOriginalInfo] = useState<CompanyInfo>(defaultCompanyInfo);

  useEffect(() => {
    loadCompanyInfo();
  }, [tenantId]);

  const loadCompanyInfo = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const infoRef = doc(db, 'tenants', tenantId, 'settings', 'companyInfo');
      const infoSnap = await getDoc(infoRef);

      if (infoSnap.exists()) {
        const data = infoSnap.data() as CompanyInfo;
        setCompanyInfo(data);
        setOriginalInfo(data);
      } else {
        // Create default
        await setDoc(infoRef, defaultCompanyInfo);
      }
    } catch (error) {
      logger.error('Failed to load company info', { error });
      setGlobalError('Erro ao carregar informações da empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;

    setSaving(true);
    try {
      const infoRef = doc(db, 'tenants', tenantId, 'settings', 'companyInfo');
      await setDoc(infoRef, companyInfo);

      setOriginalInfo(companyInfo);
      setEditing(false);
      setGlobalSuccess('Informações da empresa atualizadas com sucesso!');
    } catch (error) {
      logger.error('Failed to save company info', { error });
      setGlobalError('Erro ao salvar informações da empresa');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setCompanyInfo(originalInfo);
    setEditing(false);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // TODO: Upload to Firebase Storage
    const reader = new FileReader();
    reader.onloadend = () => {
      setCompanyInfo({ ...companyInfo, logo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={80} sx={{ mb: 3, borderRadius: 2 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Informações da Empresa
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure as informações que serão usadas pelo agente Sofia e em comunicações oficiais
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {!editing ? (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setEditing(true)}
            >
              Editar
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={handleCancel}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Logo */}
        <Grid item xs={12}>
          <Card
            sx={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Avatar
                  src={companyInfo.logo}
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: 'primary.main',
                    fontSize: '2.5rem',
                  }}
                >
                  {companyInfo.name?.[0] || 'E'}
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Logo da Empresa
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Recomendado: 512x512px, formato PNG ou JPG, máximo 2MB
                  </Typography>

                  {editing && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<Upload />}
                        component="label"
                        size="small"
                      >
                        Upload
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                      </Button>
                      {companyInfo.logo && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setCompanyInfo({ ...companyInfo, logo: undefined })}
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Basic Info */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Nome da Empresa"
            value={companyInfo.name}
            onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
            disabled={!editing}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Business color={editing ? 'primary' : 'disabled'} />
                </InputAdornment>
              ),
            }}
            helperText="Nome oficial da empresa"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Telefone"
            value={companyInfo.phone}
            onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
            disabled={!editing}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone color={editing ? 'primary' : 'disabled'} />
                </InputAdornment>
              ),
            }}
            helperText="Telefone principal"
            placeholder="(11) 99999-9999"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={companyInfo.email}
            onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
            disabled={!editing}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color={editing ? 'primary' : 'disabled'} />
                </InputAdornment>
              ),
            }}
            helperText="Email de contato principal"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Website"
            value={companyInfo.website}
            onChange={(e) => setCompanyInfo({ ...companyInfo, website: e.target.value })}
            disabled={!editing}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Language color={editing ? 'primary' : 'disabled'} />
                </InputAdornment>
              ),
            }}
            helperText="Site da empresa (opcional)"
            placeholder="https://www.exemplo.com.br"
          />
        </Grid>

        {/* Address */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn />
            Endereço
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Rua e Número"
            value={companyInfo.address.street}
            onChange={(e) =>
              setCompanyInfo({
                ...companyInfo,
                address: { ...companyInfo.address, street: e.target.value },
              })
            }
            disabled={!editing}
            placeholder="Av. Paulista, 1000"
          />
        </Grid>

        <Grid item xs={12} md={5}>
          <TextField
            fullWidth
            label="Cidade"
            value={companyInfo.address.city}
            onChange={(e) =>
              setCompanyInfo({
                ...companyInfo,
                address: { ...companyInfo.address, city: e.target.value },
              })
            }
            disabled={!editing}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Estado"
            value={companyInfo.address.state}
            onChange={(e) =>
              setCompanyInfo({
                ...companyInfo,
                address: { ...companyInfo.address, state: e.target.value },
              })
            }
            disabled={!editing}
            placeholder="SP"
            inputProps={{ maxLength: 2, style: { textTransform: 'uppercase' } }}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="CEP"
            value={companyInfo.address.zipCode}
            onChange={(e) =>
              setCompanyInfo({
                ...companyInfo,
                address: { ...companyInfo.address, zipCode: e.target.value },
              })
            }
            disabled={!editing}
            placeholder="01310-100"
          />
        </Grid>

        {/* Description */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Descrição da Empresa"
            value={companyInfo.description || ''}
            onChange={(e) => setCompanyInfo({ ...companyInfo, description: e.target.value })}
            disabled={!editing}
            helperText="Descrição breve sobre sua empresa (usado pela Sofia em apresentações)"
            inputProps={{ maxLength: 500 }}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
