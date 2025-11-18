'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { WithdrawalMethod, WALLET_CONSTANTS } from '@/lib/types/wallet';

interface WithdrawalDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clientId: string;
  clientName: string;
  clientPhone: string;
  currentBalance: number;
}

export default function WithdrawalDialog({
  open,
  onClose,
  onSuccess,
  clientId,
  clientName,
  clientPhone,
  currentBalance,
}: WithdrawalDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawalMethod>(WithdrawalMethod.PIX);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>('cpf');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    const amountValue = parseFloat(amount);

    if (!amountValue || amountValue <= 0) {
      setError('Valor inválido');
      return;
    }

    if (amountValue < WALLET_CONSTANTS.DEFAULT_MIN_WITHDRAWAL_AMOUNT) {
      setError(`Valor mínimo: R$ ${WALLET_CONSTANTS.DEFAULT_MIN_WITHDRAWAL_AMOUNT}`);
      return;
    }

    if (amountValue > currentBalance) {
      setError('Saldo insuficiente');
      return;
    }

    if (method === WithdrawalMethod.PIX && !pixKey) {
      setError('Informe a chave PIX');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientName,
          clientPhone,
          amount: amountValue,
          method,
          pixKey: method === WithdrawalMethod.PIX ? pixKey : undefined,
          pixKeyType: method === WithdrawalMethod.PIX ? pixKeyType : undefined,
          notes: notes || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 2000);
      } else {
        setError(result.error || 'Erro ao solicitar saque');
      }
    } catch (err) {
      console.error('Error requesting withdrawal:', err);
      setError('Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAmount('');
      setPixKey('');
      setNotes('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Solicitar Saque</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {success && (
            <Alert severity="success">
              Solicitação de saque enviada com sucesso! Aguarde aprovação.
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          <Alert severity="info" sx={{ mb: 1 }}>
            Saldo disponível: <strong>{formatCurrency(currentBalance)}</strong>
            <br />
            Valor mínimo: <strong>{formatCurrency(WALLET_CONSTANTS.DEFAULT_MIN_WITHDRAWAL_AMOUNT)}</strong>
          </Alert>

          <TextField
            label="Valor do Saque"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            disabled={loading || success}
            InputProps={{
              startAdornment: <InputAdornment position="start">R$</InputAdornment>,
            }}
            inputProps={{
              min: WALLET_CONSTANTS.DEFAULT_MIN_WITHDRAWAL_AMOUNT,
              max: currentBalance,
              step: 0.01,
            }}
          />

          <FormControl fullWidth disabled={loading || success}>
            <InputLabel>Método de Saque</InputLabel>
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value as WithdrawalMethod)}
              label="Método de Saque"
            >
              <MenuItem value={WithdrawalMethod.PIX}>PIX</MenuItem>
              <MenuItem value={WithdrawalMethod.BANK_TRANSFER}>Transferência Bancária</MenuItem>
              <MenuItem value={WithdrawalMethod.STRIPE}>Stripe</MenuItem>
            </Select>
          </FormControl>

          {method === WithdrawalMethod.PIX && (
            <>
              <FormControl fullWidth disabled={loading || success}>
                <InputLabel>Tipo de Chave</InputLabel>
                <Select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value as any)}
                  label="Tipo de Chave"
                >
                  <MenuItem value="cpf">CPF</MenuItem>
                  <MenuItem value="cnpj">CNPJ</MenuItem>
                  <MenuItem value="email">E-mail</MenuItem>
                  <MenuItem value="phone">Telefone</MenuItem>
                  <MenuItem value="random">Aleatória</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Chave PIX"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                fullWidth
                disabled={loading || success}
                placeholder={
                  pixKeyType === 'cpf' ? '000.000.000-00' :
                  pixKeyType === 'cnpj' ? '00.000.000/0000-00' :
                  pixKeyType === 'email' ? 'email@exemplo.com' :
                  pixKeyType === 'phone' ? '(00) 00000-0000' :
                  'Chave aleatória'
                }
              />
            </>
          )}

          {method === WithdrawalMethod.BANK_TRANSFER && (
            <Alert severity="warning">
              Para transferência bancária, entre em contato com o suporte para cadastrar seus dados bancários.
            </Alert>
          )}

          <TextField
            label="Observações (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={2}
            disabled={loading || success}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || success}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Processando...' : 'Solicitar Saque'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
