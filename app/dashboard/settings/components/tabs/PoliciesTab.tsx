'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useTenant } from '@/contexts/TenantContext';
import CancellationPolicyEditor, { CancellationPolicy } from '../CancellationPolicyEditor';
import { createSettingsService } from '@/lib/services/settings-service';

interface Props {
  setGlobalError: (error: string | null) => void;
  setGlobalSuccess: (success: string | null) => void;
}

export default function PoliciesTab({ setGlobalError, setGlobalSuccess }: Props) {
  const { tenantId } = useTenant();
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCancellationPolicy();
  }, [tenantId]);

  const loadCancellationPolicy = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const settingsService = createSettingsService(tenantId);
      const settings = await settingsService.getSettings(tenantId);

      if (settings?.cancellationPolicy) {
        setCancellationPolicy(settings.cancellationPolicy);
      }
    } catch (error) {
      console.error('Error loading cancellation policy:', error);
      setGlobalError('Erro ao carregar políticas de cancelamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (policy: CancellationPolicy) => {
    if (!tenantId) return;

    setSaving(true);
    setGlobalError(null);

    try {
      const settingsService = createSettingsService(tenantId);
      await settingsService.updateCancellationPolicy(tenantId, policy);

      setCancellationPolicy(policy);
      setGlobalSuccess('Políticas de cancelamento atualizadas com sucesso!');
    } catch (error: any) {
      setGlobalError('Erro ao atualizar políticas: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Políticas de Cancelamento
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Configure as regras de cancelamento e reembolso para reservas
      </Typography>

      {cancellationPolicy ? (
        <CancellationPolicyEditor
          initialPolicy={cancellationPolicy}
          onSave={handleSave}
          loading={saving}
        />
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}
