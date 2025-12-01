'use client';

import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Chip,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  SmartToy as AIIcon,
  Block as BlockIcon,
  PlayArrow as PlayIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { logger } from '@/lib/utils/logger';

interface AIControlButtonProps {
  phone: string;
  conversationName?: string;
}

export default function AIControlButton({ phone, conversationName }: AIControlButtonProps) {
  const { tenantId } = useTenant();
  const [blocked, setBlocked] = useState(false);
  const [blockExpiry, setBlockExpiry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<number>(1); // Default 1 hour
  const [submitting, setSubmitting] = useState(false);

  // Verificar status atual do bloqueio
  useEffect(() => {
    if (!tenantId || !phone) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/ai/block-conversation?phone=${encodeURIComponent(phone)}`);
        const result = await response.json();

        if (result.success) {
          setBlocked(result.data.blocked || false);
          setBlockExpiry(result.data.expiresAt || null);
        }
      } catch (error) {
        logger.error('Failed to check AI block status', { error });
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    // Poll every 60 seconds to update expiry (reduced for performance)
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [tenantId, phone]);

  // Alternar bloqueio
  const handleToggleBlock = async (block: boolean, blockReason?: string, blockDuration?: number) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/ai/block-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          blocked: block,
          reason: blockReason || reason,
          duration: blockDuration || duration,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setBlocked(block);
        setBlockExpiry(result.data?.expiresAt || null);
        setDialogOpen(false);
        setReason('');
        setDuration(1); // Reset to default
      } else {
        alert('Erro ao alterar status do agente de IA');
      }
    } catch (error) {
      logger.error('Failed to toggle AI block', { error });
      alert('Erro ao alterar status do agente de IA');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <CircularProgress size={24} />;
  }

  return (
    <>
      <Tooltip title={blocked ? 'Agente de IA bloqueado - Clique para reativar' : 'Bloquear agente de IA'}>
        <IconButton
          onClick={() => {
            if (blocked) {
              // Desbloquear diretamente
              handleToggleBlock(false);
            } else {
              // Abrir diálogo para bloquear
              setDialogOpen(true);
            }
          }}
          color={blocked ? 'error' : 'default'}
          size="small"
        >
          {blocked ? <BlockIcon /> : <AIIcon />}
        </IconButton>
      </Tooltip>

      {/* Indicador visual na conversa */}
      {blocked && (
        <Chip
          icon={<BlockIcon />}
          label={
            blockExpiry
              ? `IA Bloqueada (expira: ${new Date(blockExpiry).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`
              : 'IA Bloqueada'
          }
          color="error"
          size="small"
          sx={{ ml: 1 }}
        />
      )}

      {/* Diálogo de confirmação */}
      <Dialog open={dialogOpen} onClose={() => !submitting && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Bloquear Agente de IA
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Você está prestes a bloquear o agente Sofia para esta conversa:
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <strong>{conversationName || phone}</strong>
            </Typography>
            <Typography variant="body2" color="warning.main">
              ⚠️ Enquanto bloqueado, a Sofia não responderá automaticamente a esta conversa. Você precisará responder manualmente.
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon fontSize="small" />
              Duração do Bloqueio
            </Typography>
            <ToggleButtonGroup
              value={duration}
              exclusive
              onChange={(_, value) => value && setDuration(value)}
              fullWidth
              disabled={submitting}
            >
              <ToggleButton value={1}>1 hora</ToggleButton>
              <ToggleButton value={2}>2 horas</ToggleButton>
              <ToggleButton value={4}>4 horas</ToggleButton>
              <ToggleButton value={24}>24 horas</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              A IA será automaticamente reativada após o período selecionado
            </Typography>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motivo do Bloqueio (Opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Cliente preferiu atendimento humano, negociação complexa, etc."
            disabled={submitting}
            inputProps={{ maxLength: 200 }}
            helperText={`${reason.length}/200 caracteres`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleToggleBlock(true)}
            variant="contained"
            color="error"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <BlockIcon />}
          >
            {submitting ? 'Bloqueando...' : 'Confirmar Bloqueio'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
