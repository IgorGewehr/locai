'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Stack,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Remove,
  Refresh,
  TrendingUp,
  PeopleAlt,
  TimerOutlined,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { OnboardingProgress } from '@/lib/types/onboarding';
import { logger } from '@/lib/utils/logger';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserOnboardingData {
  userId: string;
  userEmail?: string;
  userName?: string;
  progress: OnboardingProgress;
}

const STEP_LABELS: Record<string, string> = {
  'add_property': 'Adicionar Propriedade',
  'connect_whatsapp': 'Conectar WhatsApp',
  'test_demo': 'Testar Sofia IA',
  'share_minisite': 'Compartilhar Mini-Site',
};

export default function OnboardingAnalyticsPage() {
  const { tenantId, isReady } = useTenant();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usersData, setUsersData] = useState<UserOnboardingData[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    completedOnboarding: 0,
    inProgress: 0,
    notStarted: 0,
    averageCompletion: 0,
  });

  const loadOnboardingData = async () => {
    if (!isReady || !tenantId) return;

    try {
      setLoading(true);
      setError(null);

      // Buscar todos os usuários do tenant
      const usersRef = collection(db, 'tenants', tenantId, 'users');
      const usersSnapshot = await getDocs(usersRef);

      const allUsersData: UserOnboardingData[] = [];

      // Para cada usuário, buscar progresso de onboarding
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();

        try {
          // Buscar onboarding progress
          const onboardingRef = collection(db, 'users', userId, 'onboarding');
          const onboardingSnapshot = await getDocs(
            query(onboardingRef, orderBy('lastUpdatedAt', 'desc'))
          );

          // Pegar o primeiro (mais recente) ou null
          const progressDoc = onboardingSnapshot.docs.find(
            (doc) => doc.id === tenantId
          );

          if (progressDoc) {
            const progressData = progressDoc.data();
            const progress: OnboardingProgress = {
              userId: progressData.userId,
              tenantId: progressData.tenantId,
              steps: progressData.steps,
              currentStepId: progressData.currentStepId,
              startedAt: progressData.startedAt?.toDate() || new Date(),
              completedAt: progressData.completedAt?.toDate(),
              lastUpdatedAt: progressData.lastUpdatedAt?.toDate() || new Date(),
              isCompleted: progressData.isCompleted || false,
              completionPercentage: progressData.completionPercentage || 0,
              metadata: progressData.metadata,
            };

            allUsersData.push({
              userId,
              userEmail: userData.email,
              userName: userData.displayName || userData.name,
              progress,
            });
          }
        } catch (userError) {
          logger.warn('[OnboardingAnalytics] Erro ao buscar onboarding do usuário', {
            userId,
            error: userError instanceof Error ? userError.message : 'Unknown',
          });
        }
      }

      // Calcular estatísticas
      const totalUsers = allUsersData.length;
      const completedOnboarding = allUsersData.filter((u) => u.progress.isCompleted).length;
      const inProgress = allUsersData.filter(
        (u) => !u.progress.isCompleted && u.progress.completionPercentage > 0
      ).length;
      const notStarted = allUsersData.filter((u) => u.progress.completionPercentage === 0).length;
      const averageCompletion =
        totalUsers > 0
          ? allUsersData.reduce((sum, u) => sum + u.progress.completionPercentage, 0) / totalUsers
          : 0;

      setStats({
        totalUsers,
        completedOnboarding,
        inProgress,
        notStarted,
        averageCompletion,
      });

      // Ordenar por progresso (menos completo primeiro)
      allUsersData.sort((a, b) => a.progress.completionPercentage - b.progress.completionPercentage);

      setUsersData(allUsersData);

      logger.info('[OnboardingAnalytics] Dados carregados com sucesso', {
        totalUsers,
        completedOnboarding,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMessage);
      logger.error('[OnboardingAnalytics] Erro ao carregar dados', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOnboardingData();
  }, [isReady, tenantId]);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'skipped':
        return <Remove sx={{ color: 'text.disabled', fontSize: 20 }} />;
      default:
        return <RadioButtonUnchecked sx={{ color: 'text.disabled', fontSize: 20 }} />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'success';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Analytics de Onboarding
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Acompanhe o progresso dos usuários nos primeiros passos
          </Typography>
        </Box>
        <Tooltip title="Recarregar dados">
          <IconButton onClick={loadOnboardingData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <PeopleAlt />
                </Avatar>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total de Usuários
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.totalUsers}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Concluíram
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.completedOnboarding}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <TimerOutlined />
                </Avatar>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Em Andamento
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.inProgress}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Progresso Médio
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.averageCompletion.toFixed(0)}%
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Users Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
            Progresso Individual dos Usuários
          </Typography>

          {usersData.length === 0 ? (
            <Alert severity="info">Nenhum usuário com onboarding iniciado.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Usuário</TableCell>
                    <TableCell>Progresso</TableCell>
                    <TableCell>Step Atual</TableCell>
                    <TableCell>Steps</TableCell>
                    <TableCell>Última Atualização</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usersData.map((userData) => (
                    <TableRow key={userData.userId}>
                      {/* Usuário */}
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {(userData.userName || userData.userEmail || 'U').charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {userData.userName || 'Sem nome'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {userData.userEmail || 'Sem email'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* Progresso */}
                      <TableCell>
                        <Box sx={{ width: 120 }}>
                          <LinearProgress
                            variant="determinate"
                            value={userData.progress.completionPercentage}
                            color={getProgressColor(userData.progress.completionPercentage)}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                            {userData.progress.completionPercentage}%
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Step Atual */}
                      <TableCell>
                        {userData.progress.currentStepId ? (
                          <Chip
                            label={STEP_LABELS[userData.progress.currentStepId] || userData.progress.currentStepId}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            -
                          </Typography>
                        )}
                      </TableCell>

                      {/* Steps */}
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {Object.entries(userData.progress.steps).map(([stepId, status]) => (
                            <Tooltip key={stepId} title={`${STEP_LABELS[stepId]}: ${status}`} arrow>
                              {getStepIcon(status)}
                            </Tooltip>
                          ))}
                        </Stack>
                      </TableCell>

                      {/* Última Atualização */}
                      <TableCell>
                        <Typography variant="caption">
                          {formatDistanceToNow(userData.progress.lastUpdatedAt, {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {userData.progress.isCompleted ? (
                          <Chip label="Concluído" color="success" size="small" />
                        ) : userData.progress.completionPercentage > 0 ? (
                          <Chip label="Em Andamento" color="warning" size="small" />
                        ) : (
                          <Chip label="Não Iniciado" color="default" size="small" />
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
    </Box>
  );
}
