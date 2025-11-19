'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Divider,
} from '@mui/material';
import { Save, AccountBalance } from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/lib/hooks/useAuth';

interface FinancialInfo {
  bankName: string;
  bankCode: string;
  agencyNumber: string;
  agencyDigit: string;
  accountNumber: string;
  accountDigit: string;
  accountType: 'corrente' | 'poupanca';
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  accountHolderName: string;
  accountHolderDocument: string;
}

export default function FinancialPage() {
  const { tenantId } = useTenant();
  const { getFirebaseToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [financialInfo, setFinancialInfo] = useState<FinancialInfo>({
    bankName: '',
    bankCode: '',
    agencyNumber: '',
    agencyDigit: '',
    accountNumber: '',
    accountDigit: '',
    accountType: 'corrente',
    pixKey: '',
    pixKeyType: 'cpf',
    accountHolderName: '',
    accountHolderDocument: '',
  });

  useEffect(() => {
    loadFinancialInfo();
  }, [tenantId]);

  const loadFinancialInfo = async () => {
    if (!tenantId) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getFirebaseToken();
      const response = await fetch(`/api/tenant/financial-info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setFinancialInfo(data.data);
        }
      }
    } catch (err) {
      console.error('Error loading financial info:', err);
      setError('Erro ao carregar informações financeiras');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getFirebaseToken();
      const response = await fetch(`/api/tenant/financial-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(financialInfo),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Informações financeiras salvas com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Erro ao salvar informações');
      }
    } catch (err) {
      console.error('Error saving financial info:', err);
      setError('Erro ao salvar informações financeiras');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Dados Financeiros
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Informações bancárias para TED
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <AccountBalance sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={600}>
            Dados Bancários
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Informações necessárias para receber transferências TED/DOC
        </Typography>

        <Grid container spacing={2.5}>
          {/* Banco */}
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Nome do Banco"
              value={financialInfo.bankName}
              onChange={(e) => setFinancialInfo({ ...financialInfo, bankName: e.target.value })}
              placeholder="Ex: Banco do Brasil"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Código do Banco"
              value={financialInfo.bankCode}
              onChange={(e) => setFinancialInfo({ ...financialInfo, bankCode: e.target.value })}
              placeholder="Ex: 001"
            />
          </Grid>

          {/* Agência */}
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Número da Agência"
              value={financialInfo.agencyNumber}
              onChange={(e) => setFinancialInfo({ ...financialInfo, agencyNumber: e.target.value })}
              placeholder="Ex: 1234"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Dígito"
              value={financialInfo.agencyDigit}
              onChange={(e) => setFinancialInfo({ ...financialInfo, agencyDigit: e.target.value })}
              placeholder="Ex: 5"
            />
          </Grid>

          {/* Conta */}
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Número da Conta"
              value={financialInfo.accountNumber}
              onChange={(e) => setFinancialInfo({ ...financialInfo, accountNumber: e.target.value })}
              placeholder="Ex: 12345678"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Dígito"
              value={financialInfo.accountDigit}
              onChange={(e) => setFinancialInfo({ ...financialInfo, accountDigit: e.target.value })}
              placeholder="Ex: 9"
            />
          </Grid>

          {/* Tipo de Conta */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Tipo de Conta"
              value={financialInfo.accountType}
              onChange={(e) => setFinancialInfo({ ...financialInfo, accountType: e.target.value as 'corrente' | 'poupanca' })}
              SelectProps={{
                native: true,
              }}
            >
              <option value="corrente">Conta Corrente</option>
              <option value="poupanca">Conta Poupança</option>
            </TextField>
          </Grid>

          <Divider sx={{ width: '100%', my: 2 }} />

          {/* Titular da Conta */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Titular da Conta
            </Typography>
          </Grid>

          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Nome Completo do Titular"
              value={financialInfo.accountHolderName}
              onChange={(e) => setFinancialInfo({ ...financialInfo, accountHolderName: e.target.value })}
              placeholder="Ex: João da Silva"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="CPF/CNPJ do Titular"
              value={financialInfo.accountHolderDocument}
              onChange={(e) => setFinancialInfo({ ...financialInfo, accountHolderDocument: e.target.value })}
              placeholder="Ex: 123.456.789-00"
            />
          </Grid>

          <Divider sx={{ width: '100%', my: 2 }} />

          {/* PIX */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Chave PIX (Opcional)
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label="Tipo de Chave"
              value={financialInfo.pixKeyType}
              onChange={(e) => setFinancialInfo({ ...financialInfo, pixKeyType: e.target.value as any })}
              SelectProps={{
                native: true,
              }}
            >
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="email">E-mail</option>
              <option value="phone">Telefone</option>
              <option value="random">Chave Aleatória</option>
            </TextField>
          </Grid>

          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Chave PIX"
              value={financialInfo.pixKey}
              onChange={(e) => setFinancialInfo({ ...financialInfo, pixKey: e.target.value })}
              placeholder="Ex: 123.456.789-00"
            />
          </Grid>
        </Grid>

        {/* Save Button */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
