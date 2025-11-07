/**
 * Safe Revolutionary Onboarding Wrapper
 * Wraps the onboarding with error boundary and safety checks
 */

'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import { Box, CircularProgress, alpha } from '@mui/material';
import RevolutionaryOnboarding from './RevolutionaryOnboarding';
import OnboardingErrorBoundary from './OnboardingErrorBoundary';
import { useRevolutionaryOnboarding } from '@/lib/hooks/useRevolutionaryOnboarding';
import { logger } from '@/lib/utils/logger';

interface SafeRevolutionaryOnboardingProps {
  variant?: 'compact' | 'expanded' | 'fullscreen';
}

export default function SafeRevolutionaryOnboarding({
  variant = 'compact',
}: SafeRevolutionaryOnboardingProps) {
  const { user, loading: authLoading } = useAuth();
  const { tenantId, isReady } = useTenant();

  // Safety checks
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} sx={{ color: alpha('#6366f1', 0.6) }} />
      </Box>
    );
  }

  if (!user) {
    logger.debug('[SafeOnboarding] User not authenticated');
    return null;
  }

  if (!isReady || !tenantId) {
    logger.debug('[SafeOnboarding] Tenant not ready', { isReady, tenantId });
    return null;
  }

  return (
    <OnboardingErrorBoundary
      onReset={() => {
        logger.info('[SafeOnboarding] Error boundary reset');
        window.location.reload();
      }}
      onDismiss={() => {
        logger.info('[SafeOnboarding] Error dismissed');
      }}
    >
      <RevolutionaryOnboarding variant={variant} />
    </OnboardingErrorBoundary>
  );
}
