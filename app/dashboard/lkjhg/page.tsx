'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';
import { logger } from '@/lib/utils/logger';
import type { AdminUser } from '@/lib/types/admin';
import type { Ticket } from '@/lib/types/ticket';

// Components
import AdminStats from './components/AdminStats';
import UserDataTable from './components/UserDataTable';
import TicketInbox from './components/TicketInbox';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export default function AdminPanel() {
  const router = useRouter();
  const { getFirebaseToken, user, loading: authLoading } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTickets: 0,
    openTickets: 0,
    totalProperties: 0,
    totalReservations: 0
  });

  // Auth check
  useEffect(() => {
    if (!authLoading && user) {
      if (user.idog === true) {
        checkAdminAccess();
      } else {
        router.replace('/dashboard');
      }
    } else if (!authLoading && !user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading]);

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const token = await getFirebaseToken();
    if (!token) {
      throw new Error('Token não disponível');
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  };

  const checkAdminAccess = async () => {
    try {
      if (!user) {
        router.push('/dashboard');
        return;
      }

      const response = await makeAuthenticatedRequest('/api/admin/verify', {
        method: 'GET'
      });

      if (!response.ok) {
        logger.error('[Admin Auth] Acesso negado', {
          status: response.status,
          component: 'AdminPanel'
        });
        router.push('/dashboard');
        return;
      }

      const data = await response.json();

      if (!data.isAdmin) {
        logger.error('[Admin Auth] Usuário não é admin', {
          userId: user.uid,
          component: 'AdminPanel'
        });
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
      loadAdminData();
    } catch (error) {
      logger.error('[Admin Auth] Erro na verificação', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'AdminPanel'
      });
      router.push('/dashboard');
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load users and tickets in parallel
      const [usersResponse, ticketsResponse] = await Promise.all([
        makeAuthenticatedRequest('/api/admin/users-enhanced'),
        makeAuthenticatedRequest('/api/admin/all-tickets')
      ]);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();

        // Converter strings ISO de volta para Date objects
        const usersWithDates = (usersData.users || []).map((user: any) => ({
          ...user,
          createdAt: user.createdAt ? new Date(user.createdAt) : null,
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : null
        }));

        setUsers(usersWithDates);

        if (usersData.stats) {
          setStats(prev => ({
            ...prev,
            totalUsers: usersData.stats.totalUsers,
            activeUsers: usersData.stats.activeUsers,
            totalProperties: usersData.stats.totalProperties,
            totalReservations: usersData.stats.totalReservations
          }));
        }
      }

      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        setTickets(ticketsData.tickets || []);

        if (ticketsData.stats) {
          setStats(prev => ({
            ...prev,
            totalTickets: ticketsData.stats.totalTickets,
            openTickets: ticketsData.stats.openTickets
          }));
        }
      }

      logger.info('[Admin] Dados carregados com sucesso', {
        component: 'AdminPanel',
        usersCount: users.length,
        ticketsCount: tickets.length
      });
    } catch (error) {
      logger.error('[Admin] Erro ao carregar dados', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'AdminPanel'
      });
      setError('Erro ao carregar dados do painel');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Show loading while checking auth
  if (authLoading || !isAdmin) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#121212'
        }}
      >
        <CircularProgress sx={{ color: '#0D6EFD' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#121212', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              color: '#FFFFFF',
              mb: 1
            }}
          >
            Painel Administrativo
          </Typography>
          <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
            Gestão completa de usuários e tickets de suporte
          </Typography>
        </Box>

        {/* Stats */}
        {!loading && <AdminStats stats={stats} />}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid #2C2C2C',
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: '#1E1E1E'
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              borderBottom: '1px solid #2C2C2C',
              bgcolor: '#1E1E1E',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                color: '#B0B0B0',
                minHeight: 48
              },
              '& .Mui-selected': {
                color: '#FFFFFF'
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#0D6EFD'
              }
            }}
          >
            <Tab label="Usuários" />
            <Tab label="Tickets de Suporte" />
          </Tabs>

          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 400,
                bgcolor: '#1E1E1E'
              }}
            >
              <CircularProgress sx={{ color: '#0D6EFD' }} />
            </Box>
          ) : (
            <>
              <TabPanel value={tabValue} index={0}>
                <UserDataTable users={users} onRefresh={loadAdminData} />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <TicketInbox tickets={tickets} onRefresh={loadAdminData} />
              </TabPanel>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
