'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { SubscriptionValidation } from '@/lib/types/subscription';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  Alert,
  Chip,
  LinearProgress,
  Stack
} from '@mui/material';
import { 
  Lock as LockIcon, 
  Timer as TimerIcon, 
  CreditCard as CreditCardIcon,
  CheckCircle as CheckCircleIcon 
} from '@mui/icons-material';
import { logger } from '@/lib/utils/logger';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  showTrialInfo?: boolean;
  customRedirectUrl?: string;
}

export default function SubscriptionGuard({ 
  children, 
  showTrialInfo = true,
  customRedirectUrl 
}: SubscriptionGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const [validation, setValidation] = useState<SubscriptionValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || authLoading) return;

    const validateAccess = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await SubscriptionService.validateUserAccess(user.uid);
        setValidation(result);

        // Se não tem acesso, redirecionar após um delay
        if (!result.hasAccess && result.redirectUrl) {
          const redirectUrl = customRedirectUrl || result.redirectUrl;
          
          logger.info('🔄 [SubscriptionGuard] Redirecionando para planos', {
            userId: user.uid,
            reason: result.reason,
            redirectUrl
          });

          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 3000); // 3 segundos para mostrar a mensagem
        }

      } catch (err) {
        const errorMessage = 'Erro ao verificar assinatura';
        setError(errorMessage);
        logger.error('❌ [SubscriptionGuard] Erro na validação', err as Error, {
          userId: user.uid
        });
      } finally {
        setLoading(false);
      }
    };

    validateAccess();
  }, [user, authLoading, customRedirectUrl]);

  // Loading state
  if (authLoading || loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="50vh"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Verificando assinatura...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            startIcon={<CheckCircleIcon />}
          >
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Sem validação ainda
  if (!validation) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="text.secondary">
          Validando acesso...
        </Typography>
      </Box>
    );
  }

  // Usuário tem acesso - mostrar conteúdo
  if (validation.hasAccess) {
    return (
      <Box>
        {/* Trial Info Banner */}
        {showTrialInfo && validation.trialStatus && !validation.trialStatus.hasTrialExpired && (
          <Alert 
            severity="info" 
            sx={{ mb: 2, borderRadius: 2 }}
            icon={<TimerIcon />}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2">
                <strong>Período de teste:</strong> {validation.trialStatus.daysRemaining} dias restantes
              </Typography>
              <Chip 
                label="Trial"
                color="info"
                size="small"
              />
            </Stack>
          </Alert>
        )}

        {/* Subscription Active Info */}
        {validation.subscription?.subscriptionActive && (
          <Alert 
            severity="success" 
            sx={{ mb: 2, borderRadius: 2 }}
            icon={<CheckCircleIcon />}
          >
            <Typography variant="body2">
              <strong>Assinatura ativa:</strong> {validation.subscription.subscriptionPlan}
            </Typography>
          </Alert>
        )}

        {children}
      </Box>
    );
  }

  // Usuário não tem acesso - mostrar tela de bloqueio
  const getBlockedContent = () => {
    if (validation.reason === 'trial_expired') {
      return {
        icon: <TimerIcon color="warning" sx={{ fontSize: 48 }} />,
        title: 'Período de teste expirado',
        message: 'Seu período de teste gratuito terminou. Assine um plano para continuar usando todas as funcionalidades.',
        buttonText: 'Ver Planos',
        severity: 'warning' as const
      };
    }

    return {
      icon: <LockIcon color="error" sx={{ fontSize: 48 }} />,
      title: 'Acesso restrito',
      message: 'Esta funcionalidade requer uma assinatura ativa. Escolha um plano que atenda às suas necessidades.',
      buttonText: 'Assinar Plano',
      severity: 'error' as const
    };
  };

  const blockedContent = getBlockedContent();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      textAlign="center"
      px={2}
    >
      <Card sx={{ maxWidth: 500, mx: 'auto' }}>
        <CardContent sx={{ p: 4 }}>
          <Box mb={3}>
            {blockedContent.icon}
          </Box>

          <Typography variant="h5" component="h1" gutterBottom fontWeight={600}>
            {blockedContent.title}
          </Typography>

          <Typography variant="body1" color="text.secondary" mb={3}>
            {blockedContent.message}
          </Typography>

          <Alert severity={blockedContent.severity} sx={{ mb: 3 }}>
            Você será redirecionado automaticamente em alguns segundos...
          </Alert>

          <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />

          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CreditCardIcon />}
              onClick={() => {
                const redirectUrl = customRedirectUrl || validation.redirectUrl || 'https://moneyin.agency/alugazapplanos/';
                window.location.href = redirectUrl;
              }}
              sx={{ borderRadius: 2 }}
            >
              {blockedContent.buttonText}
            </Button>

            <Button
              variant="text"
              onClick={() => window.history.back()}
            >
              Voltar
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}