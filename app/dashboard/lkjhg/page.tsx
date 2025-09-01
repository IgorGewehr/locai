'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  Button,
  Chip,
  Avatar,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Divider,
  Badge,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  useTheme
} from '@mui/material';
import {
  Support as SupportIcon,
  People as PeopleIcon,
  Dashboard as DashboardIcon,
  Reply as ReplyIcon,
  Visibility as VisibilityIcon,
  Home as HomeIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  AdminPanelSettings as AdminIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Função auxiliar para formatar datas de forma segura
const formatSafeDate = (dateValue: any, formatStr: string, options?: any) => {
  if (!dateValue) return '-';
  
  let date: Date;
  
  // Se é um Timestamp do Firebase
  if (dateValue.toDate && typeof dateValue.toDate === 'function') {
    try {
      date = dateValue.toDate();
    } catch (error) {
      return '-';
    }
  }
  // Se é uma string ou número
  else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    date = new Date(dateValue);
  }
  // Se já é uma Data
  else if (dateValue instanceof Date) {
    date = dateValue;
  }
  // Valor inválido
  else {
    return '-';
  }
  
  // Verificar se a data é válida
  if (!isValid(date)) {
    return '-';
  }
  
  try {
    return format(date, formatStr, options);
  } catch (error) {
    return '-';
  }
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface Ticket {
  id: string;
  tenantId: string;
  tenantName?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  createdAt: any;
  updatedAt: any;
  responses?: TicketResponse[];
  metadata?: any;
}

interface TicketResponse {
  id: string;
  message: string;
  authorId: string;
  authorName: string;
  authorRole: 'admin' | 'user';
  createdAt: any;
}

interface User {
  id: string;
  tenantId: string;
  tenantName?: string;
  email: string;
  name: string;
  plan?: string;
  createdAt: any;
  lastLogin?: any;
  propertyCount?: number;
  status: 'active' | 'inactive' | 'suspended';
  phoneNumber?: string;
}

interface TenantStats {
  tenantId: string;
  tenantName: string;
  userCount: number;
  propertyCount: number;
  ticketCount: number;
  activeTickets: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const theme = useTheme();
  const { getFirebaseToken, user, loading: authLoading } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Estados para tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketFilter, setTicketFilter] = useState('all');
  const [ticketSearch, setTicketSearch] = useState('');
  
  // Estados para usuários
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('all');
  
  // Estados para estatísticas
  const [stats, setStats] = useState<TenantStats[]>([]);
  
  // Estado para resposta de ticket
  const [replyDialog, setReplyDialog] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replying, setReplying] = useState(false);

  // Verificar autenticação admin
  useEffect(() => {
    if (!authLoading && user) {
      checkAdminAccess();
    } else if (!authLoading && !user) {
      // Se não está carregando e não tem usuário, redirecionar
      router.push('/dashboard');
    }
  }, [user, authLoading]);

  // Função para fazer requests autenticados
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
        console.log('❌ Usuário não encontrado, redirecionando...');
        router.push('/dashboard');
        return;
      }

      console.log('🔍 Verificando acesso admin para:', user.email);
      
      const response = await makeAuthenticatedRequest('/api/admin/verify', {
        method: 'GET'
      });

      console.log('📡 Resposta da API:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Resposta não OK:', response.status, response.statusText, errorText);
        router.push('/dashboard');
        return;
      }

      const data = await response.json();
      console.log('📊 Dados recebidos:', data);
      
      if (!data.isAdmin) {
        console.error('❌ Usuário não é admin:', data);
        router.push('/dashboard');
        return;
      }

      console.log('✅ Acesso admin confirmado!');
      setIsAdmin(true);
      loadAdminData();
    } catch (error) {
      console.error('💥 Erro ao verificar acesso admin:', error);
      router.push('/dashboard');
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTickets(),
        loadUsers(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/admin/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Erro ao carregar tickets:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || []);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleReplyTicket = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    setReplying(true);
    try {
      const response = await makeAuthenticatedRequest(`/api/admin/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({
          message: replyMessage,
          tenantId: selectedTicket.tenantId
        })
      });

      if (response.ok) {
        setReplyMessage('');
        setReplyDialog(false);
        await loadTickets();
        setSelectedTicket(null);
      }
    } catch (error) {
      console.error('Erro ao responder ticket:', error);
    } finally {
      setReplying(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/admin/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await loadTickets();
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      open: 'error',
      in_progress: 'warning',
      resolved: 'success',
      closed: 'default'
    };
    return colors[status] || 'default';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <ErrorIcon color="error" />;
      case 'high':
        return <WarningIcon color="warning" />;
      default:
        return <CheckCircleIcon color="success" />;
    }
  };

  // Filtrar tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = ticketFilter === 'all' || ticket.status === ticketFilter;
    const matchesSearch = ticketSearch === '' || 
      ticket.subject.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      ticket.userName?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      ticket.tenantName?.toLowerCase().includes(ticketSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Filtrar usuários
  const filteredUsers = users.filter(user => {
    const matchesTenant = selectedTenant === 'all' || user.tenantId === selectedTenant;
    const matchesSearch = userSearch === '' ||
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase());
    return matchesTenant && matchesSearch;
  });

  // Obter tenants únicos
  const uniqueTenants = Array.from(new Set(users.map(u => u.tenantId)))
    .map(id => ({
      id,
      name: users.find(u => u.tenantId === id)?.tenantName || id
    }));

  if (authLoading || loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{ backgroundColor: 'background.default' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Box sx={{ 
      flexGrow: 1, 
      bgcolor: 'background.default', 
      p: 3,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center" mb={3}>
          <AdminIcon sx={{ 
            fontSize: 32, 
            color: 'error.main',
            background: theme.palette.error.light + '20',
            borderRadius: 2,
            p: 1
          }} />
          <Box>
            <Typography 
              variant="h4" 
              fontWeight="600"
              sx={{ color: 'text.primary' }}
            >
              Painel Administrativo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gerencie tickets e monitore usuários do sistema
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Chip 
              label="ADMIN ACCESS" 
              color="error" 
              variant="filled"
              icon={<AdminIcon />}
              sx={{ 
                fontWeight: 600,
                px: 2,
                py: 1,
                height: 32
              }}
            />
          </Box>
        </Stack>
        
        {/* Enhanced Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'background.paper',
                boxShadow: theme.shadows[2],
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: theme.shadows[4],
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: theme.palette.primary.light + '20',
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <SupportIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    fontWeight={500}
                    gutterBottom
                  >
                    Total de Tickets
                  </Typography>
                  <Typography 
                    variant="h4" 
                    fontWeight="700"
                    sx={{ color: 'text.primary' }}
                  >
                    {tickets.length}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                    <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption" color="success.main" fontWeight={500}>
                      +12% este mês
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} lg={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'background.paper',
                boxShadow: theme.shadows[2],
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: theme.shadows[4],
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: theme.palette.error.light + '20',
                    color: 'error.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <WarningIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    fontWeight={500}
                    gutterBottom
                  >
                    Tickets Abertos
                  </Typography>
                  <Typography 
                    variant="h4" 
                    fontWeight="700"
                    sx={{ color: 'error.main' }}
                  >
                    {tickets.filter(t => t.status === 'open').length}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                    <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
                    <Typography variant="caption" color="error.main" fontWeight={500}>
                      Requer atenção
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} lg={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'background.paper',
                boxShadow: theme.shadows[2],
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: theme.shadows[4],
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: theme.palette.success.light + '20',
                    color: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PeopleIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    fontWeight={500}
                    gutterBottom
                  >
                    Total de Usuários
                  </Typography>
                  <Typography 
                    variant="h4" 
                    fontWeight="700"
                    sx={{ color: 'text.primary' }}
                  >
                    {users.length}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                    <PeopleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption" color="success.main" fontWeight={500}>
                      Usuários ativos
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} lg={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'background.paper',
                boxShadow: theme.shadows[2],
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: theme.shadows[4],
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: theme.palette.info.light + '20',
                    color: 'info.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <BusinessIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    fontWeight={500}
                    gutterBottom
                  >
                    Organizações
                  </Typography>
                  <Typography 
                    variant="h4" 
                    fontWeight="700"
                    sx={{ color: 'text.primary' }}
                  >
                    {uniqueTenants.length}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                    <BusinessIcon sx={{ fontSize: 16, color: 'info.main' }} />
                    <Typography variant="caption" color="info.main" fontWeight={500}>
                      Tenants ativos
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Modern Tabs */}
      <Box 
        sx={{ 
          mb: 3,
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 1,
          boxShadow: theme.shadows[1],
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Tabs 
          value={tabValue} 
          onChange={(e, v) => setTabValue(v)}
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: 'primary.main',
              height: 3,
              borderRadius: 1.5
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              minHeight: 48,
              borderRadius: 1,
              mx: 0.5,
              '&.Mui-selected': {
                color: 'primary.main',
                bgcolor: theme.palette.primary.light + '10'
              }
            }
          }}
        >
          <Tab 
            label={
              <Stack direction="row" spacing={2} alignItems="center">
                <Badge badgeContent={tickets.filter(t => t.status === 'open').length} color="error">
                  <SupportIcon />
                </Badge>
                <Typography variant="body2" fontWeight={600}>
                  Tickets de Suporte
                </Typography>
              </Stack>
            }
          />
          <Tab 
            label={
              <Stack direction="row" spacing={2} alignItems="center">
                <PeopleIcon />
                <Typography variant="body2" fontWeight={600}>
                  Usuários do Sistema
                </Typography>
              </Stack>
            }
          />
          <Tab 
            label={
              <Stack direction="row" spacing={2} alignItems="center">
                <DashboardIcon />
                <Typography variant="body2" fontWeight={600}>
                  Estatísticas e Métricas
                </Typography>
              </Stack>
            }
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {/* Enhanced Tickets Tab */}
        <Box>
          {/* Modern Filters */}
          <Box
            sx={{
              p: 3,
              mb: 3,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: theme.shadows[1],
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <Typography variant="h6" fontWeight={600} mb={2}>
              Filtros e Busca
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <TextField
                placeholder="Buscar por assunto, usuário ou tenant..."
                variant="outlined"
                size="small"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                sx={{ 
                  flexGrow: 1, 
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
              
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={ticketFilter}
                  onChange={(e) => setTicketFilter(e.target.value)}
                  label="Status"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">Todos os Status</MenuItem>
                  <MenuItem value="open">🔴 Abertos</MenuItem>
                  <MenuItem value="in_progress">🟡 Em Progresso</MenuItem>
                  <MenuItem value="resolved">🟢 Resolvidos</MenuItem>
                  <MenuItem value="closed">⚫ Fechados</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadTickets}
                sx={{ 
                  borderRadius: 2,
                  px: 3,
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: theme.palette.primary.light + '10'
                  }
                }}
              >
                Atualizar
              </Button>
            </Stack>
          </Box>

          {/* Enhanced Tickets Table */}
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: theme.shadows[2],
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={600}>
                  Tickets de Suporte ({filteredTickets.length})
                </Typography>
                <Chip 
                  label={`${tickets.filter(t => t.status === 'open').length} Abertos`}
                  color="error"
                  size="small"
                  variant="filled"
                />
              </Stack>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Prioridade
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Organização
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Usuário
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Ticket
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Data
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Ações
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Stack spacing={2} alignItems="center">
                          <SupportIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                          <Typography variant="h6" color="text.secondary">
                            Nenhum ticket encontrado
                          </Typography>
                          <Typography variant="body2" color="text.disabled">
                            {ticketSearch ? 'Tente ajustar os filtros de busca' : 'Não há tickets no sistema'}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <TableRow 
                        key={ticket.id} 
                        hover
                        sx={{
                          '&:hover': {
                            bgcolor: theme.palette.action.hover
                          },
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <TableCell>
                          <Tooltip title={`Prioridade: ${ticket.priority}`}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getPriorityIcon(ticket.priority)}
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ticket.tenantName || ticket.tenantId} 
                            size="small"
                            variant="outlined"
                            sx={{ 
                              borderRadius: 1,
                              fontWeight: 500
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                              {ticket.userName?.charAt(0)?.toUpperCase() || 'U'}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {ticket.userName || 'Usuário'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {ticket.userEmail}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 300 }}>
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {ticket.subject}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.4
                            }}
                          >
                            {ticket.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ticket.status.replace('_', ' ').toUpperCase()} 
                            color={getStatusColor(ticket.status) as any}
                            size="small"
                            variant="filled"
                            sx={{ 
                              borderRadius: 1,
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.primary">
                            {formatSafeDate(ticket.createdAt, 'dd/MM/yyyy', { locale: ptBR })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatSafeDate(ticket.createdAt, 'HH:mm', { locale: ptBR })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Ver detalhes completos">
                              <IconButton 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTicket(ticket);
                                }}
                                sx={{
                                  color: 'primary.main',
                                  '&:hover': {
                                    bgcolor: theme.palette.primary.light + '20'
                                  }
                                }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Responder ticket">
                              <IconButton 
                                size="small"
                                color="success"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTicket(ticket);
                                  setReplyDialog(true);
                                }}
                                sx={{
                                  '&:hover': {
                                    bgcolor: theme.palette.success.light + '20'
                                  }
                                }}
                              >
                                <ReplyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Enhanced Users Tab */}
        <Box>
          {/* Modern Filters */}
          <Box
            sx={{
              p: 3,
              mb: 3,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: theme.shadows[1],
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <Typography variant="h6" fontWeight={600} mb={2}>
              Filtros e Busca de Usuários
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <TextField
                placeholder="Buscar por nome ou email..."
                variant="outlined"
                size="small"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                sx={{ 
                  flexGrow: 1, 
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
              
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Organização</InputLabel>
                <Select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  label="Organização"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">Todas as Organizações</MenuItem>
                  {uniqueTenants.map(tenant => (
                    <MenuItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadUsers}
                sx={{ 
                  borderRadius: 2,
                  px: 3,
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: theme.palette.primary.light + '10'
                  }
                }}
              >
                Atualizar
              </Button>
            </Stack>
          </Box>

          {/* Enhanced Users Table */}
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: theme.shadows[2],
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={600}>
                  Usuários do Sistema ({filteredUsers.length})
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip 
                    label={`${users.filter(u => u.status === 'active').length} Ativos`}
                    color="success"
                    size="small"
                    variant="filled"
                  />
                  <Chip 
                    label={`${uniqueTenants.length} Organizações`}
                    color="info"
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </Stack>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Usuário
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Organização
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Plano
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Propriedades
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Cadastrado
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Último Acesso
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Stack spacing={2} alignItems="center">
                          <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                          <Typography variant="h6" color="text.secondary">
                            Nenhum usuário encontrado
                          </Typography>
                          <Typography variant="body2" color="text.disabled">
                            {userSearch ? 'Tente ajustar os filtros de busca' : 'Não há usuários no sistema'}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow 
                        key={user.id} 
                        hover
                        sx={{
                          '&:hover': {
                            bgcolor: theme.palette.action.hover
                          }
                        }}
                      >
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar 
                              sx={{ 
                                width: 40, 
                                height: 40,
                                bgcolor: 'primary.main',
                                fontWeight: 600
                              }}
                            >
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600} color="text.primary">
                                {user.name || 'Usuário Sem Nome'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {user.email}
                              </Typography>
                              {user.phoneNumber && (
                                <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5}>
                                  <PhoneIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                                  <Typography variant="caption" color="text.disabled">
                                    {user.phoneNumber}
                                  </Typography>
                                </Stack>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={user.tenantName || user.tenantId} 
                            size="small"
                            variant="outlined"
                            sx={{ 
                              borderRadius: 1,
                              fontWeight: 500,
                              bgcolor: theme.palette.info.light + '10',
                              borderColor: theme.palette.info.main
                            }}
                            icon={<BusinessIcon />}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={user.plan || 'Free'} 
                            size="small"
                            color={user.plan === 'Pro' ? 'primary' : 'default'}
                            variant="filled"
                            sx={{ 
                              borderRadius: 1,
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box
                              sx={{
                                p: 1,
                                borderRadius: 1,
                                bgcolor: theme.palette.success.light + '20',
                                color: 'success.main',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <HomeIcon fontSize="small" />
                            </Box>
                            <Typography variant="body2" fontWeight={600}>
                              {user.propertyCount || 0}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={user.status?.toUpperCase() || 'ATIVO'} 
                            size="small"
                            color={user.status === 'active' ? 'success' : user.status === 'suspended' ? 'error' : 'default'}
                            variant="filled"
                            sx={{ 
                              borderRadius: 1,
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.primary">
                            {formatSafeDate(user.createdAt, 'dd/MM/yyyy', { locale: ptBR })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatSafeDate(user.createdAt, 'HH:mm', { locale: ptBR })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {user.lastLogin ? (
                            <>
                              <Typography variant="body2" color="text.primary">
                                {formatSafeDate(user.lastLogin, 'dd/MM/yyyy', { locale: ptBR })}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatSafeDate(user.lastLogin, 'HH:mm', { locale: ptBR })}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.disabled">
                              Nunca acessou
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Enhanced Statistics Tab */}
        <Box>
          <Typography variant="h6" fontWeight={600} mb={3}>
            Estatísticas Detalhadas por Organização
          </Typography>
          
          <Grid container spacing={3}>
            {stats.length === 0 ? (
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 4,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    textAlign: 'center'
                  }}
                >
                  <DashboardIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Carregando Estatísticas
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    Aguarde enquanto coletamos os dados das organizações...
                  </Typography>
                </Box>
              </Grid>
            ) : (
              stats.map((stat) => (
                <Grid item xs={12} md={6} lg={4} key={stat.tenantId}>
                  <Box
                    sx={{
                      p: 3,
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      boxShadow: theme.shadows[2],
                      border: `1px solid ${theme.palette.divider}`,
                      height: '100%',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: theme.shadows[4],
                        transform: 'translateY(-4px)'
                      }
                    }}
                  >
                    {/* Header da Organização */}
                    <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                      <Avatar 
                        sx={{ 
                          bgcolor: 'primary.main',
                          width: 48,
                          height: 48,
                          fontSize: '1.2rem',
                          fontWeight: 600
                        }}
                      >
                        {stat.tenantName?.charAt(0)?.toUpperCase() || 'T'}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" fontWeight={600} color="text.primary">
                          {stat.tenantName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {stat.tenantId}
                        </Typography>
                      </Box>
                      <Chip 
                        label={stat.activeTickets > 0 ? "Atenção" : "OK"}
                        color={stat.activeTickets > 0 ? "warning" : "success"}
                        size="small"
                        variant="filled"
                      />
                    </Stack>
                    
                    <Divider sx={{ mb: 3 }} />
                    
                    {/* Métricas */}
                    <Stack spacing={2.5}>
                      {/* Usuários */}
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 1.5,
                          bgcolor: theme.palette.success.light + '10',
                          border: `1px solid ${theme.palette.success.light}30`
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <PeopleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                            <Typography color="text.secondary" variant="body2" fontWeight={500}>
                              Usuários
                            </Typography>
                          </Stack>
                          <Typography variant="h6" fontWeight="700" color="success.main">
                            {stat.userCount}
                          </Typography>
                        </Stack>
                      </Box>

                      {/* Propriedades */}
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 1.5,
                          bgcolor: theme.palette.info.light + '10',
                          border: `1px solid ${theme.palette.info.light}30`
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <HomeIcon sx={{ color: 'info.main', fontSize: 20 }} />
                            <Typography color="text.secondary" variant="body2" fontWeight={500}>
                              Propriedades
                            </Typography>
                          </Stack>
                          <Typography variant="h6" fontWeight="700" color="info.main">
                            {stat.propertyCount}
                          </Typography>
                        </Stack>
                      </Box>

                      {/* Total de Tickets */}
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 1.5,
                          bgcolor: theme.palette.primary.light + '10',
                          border: `1px solid ${theme.palette.primary.light}30`
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <SupportIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                            <Typography color="text.secondary" variant="body2" fontWeight={500}>
                              Total Tickets
                            </Typography>
                          </Stack>
                          <Typography variant="h6" fontWeight="700" color="primary.main">
                            {stat.ticketCount}
                          </Typography>
                        </Stack>
                      </Box>

                      {/* Tickets Ativos */}
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 1.5,
                          bgcolor: stat.activeTickets > 0 
                            ? theme.palette.error.light + '10' 
                            : theme.palette.grey[100],
                          border: stat.activeTickets > 0 
                            ? `1px solid ${theme.palette.error.light}30`
                            : `1px solid ${theme.palette.grey[300]}30`
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <WarningIcon 
                              sx={{ 
                                color: stat.activeTickets > 0 ? 'error.main' : 'text.disabled', 
                                fontSize: 20 
                              }} 
                            />
                            <Typography 
                              color={stat.activeTickets > 0 ? 'text.secondary' : 'text.disabled'} 
                              variant="body2" 
                              fontWeight={500}
                            >
                              Tickets Pendentes
                            </Typography>
                          </Stack>
                          <Typography 
                            variant="h6" 
                            fontWeight="700" 
                            color={stat.activeTickets > 0 ? 'error.main' : 'text.disabled'}
                          >
                            {stat.activeTickets}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>

                    {/* Footer com indicadores */}
                    <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                      <Stack direction="row" justifyContent="center">
                        {stat.activeTickets === 0 ? (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Sem pendências"
                            color="success"
                            variant="filled"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        ) : (
                          <Chip
                            icon={<WarningIcon />}
                            label={`${stat.activeTickets} ticket${stat.activeTickets > 1 ? 's' : ''} pendente${stat.activeTickets > 1 ? 's' : ''}`}
                            color="error"
                            variant="filled"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </Stack>
                    </Box>
                  </Box>
                </Grid>
              ))
            )}
          </Grid>
        </Box>
      </TabPanel>

      {/* Reply Dialog */}
      <Dialog 
        open={replyDialog} 
        onClose={() => setReplyDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Responder Ticket
        </DialogTitle>
        <DialogContent>
          {selectedTicket && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2">
                  Ticket: {selectedTicket.subject}
                </Typography>
                <Typography variant="caption">
                  Usuário: {selectedTicket.userName} ({selectedTicket.userEmail})
                </Typography>
              </Alert>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedTicket.description}
              </Typography>
              
              {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Histórico de Respostas:
                  </Typography>
                  {selectedTicket.responses.map((response) => (
                    <Card key={response.id} sx={{ mb: 1, bgcolor: response.authorRole === 'admin' ? 'action.hover' : 'background.paper' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="caption" fontWeight="bold">
                            {response.authorName} ({response.authorRole === 'admin' ? 'Admin' : 'Usuário'})
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatSafeDate(response.createdAt, 'dd/MM/yyyy HH:mm')}
                          </Typography>
                        </Stack>
                        <Typography variant="body2">
                          {response.message}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
              
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Sua resposta"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                variant="outlined"
                placeholder="Digite sua resposta ao ticket..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleReplyTicket}
            variant="contained"
            startIcon={<SendIcon />}
            disabled={replying || !replyMessage.trim()}
          >
            {replying ? 'Enviando...' : 'Enviar Resposta'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ticket Details Dialog */}
      {selectedTicket && !replyDialog && (
        <Dialog
          open={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                Detalhes do Ticket
              </Typography>
              <Chip 
                label={selectedTicket.status} 
                color={getStatusColor(selectedTicket.status) as any}
                size="small"
              />
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Assunto
                </Typography>
                <Typography variant="body1">
                  {selectedTicket.subject}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Descrição
                </Typography>
                <Typography variant="body1">
                  {selectedTicket.description}
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Usuário
                  </Typography>
                  <Typography variant="body2">
                    {selectedTicket.userName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedTicket.userEmail}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Tenant
                  </Typography>
                  <Typography variant="body2">
                    {selectedTicket.tenantName || selectedTicket.tenantId}
                  </Typography>
                </Grid>
              </Grid>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Alterar Status
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant={selectedTicket.status === 'open' ? 'contained' : 'outlined'}
                    onClick={() => updateTicketStatus(selectedTicket.id, 'open')}
                  >
                    Aberto
                  </Button>
                  <Button
                    size="small"
                    variant={selectedTicket.status === 'in_progress' ? 'contained' : 'outlined'}
                    onClick={() => updateTicketStatus(selectedTicket.id, 'in_progress')}
                    color="warning"
                  >
                    Em Progresso
                  </Button>
                  <Button
                    size="small"
                    variant={selectedTicket.status === 'resolved' ? 'contained' : 'outlined'}
                    onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                    color="success"
                  >
                    Resolvido
                  </Button>
                  <Button
                    size="small"
                    variant={selectedTicket.status === 'closed' ? 'contained' : 'outlined'}
                    onClick={() => updateTicketStatus(selectedTicket.id, 'closed')}
                  >
                    Fechado
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedTicket(null)}>
              Fechar
            </Button>
            <Button 
              variant="contained"
              startIcon={<ReplyIcon />}
              onClick={() => setReplyDialog(true)}
            >
              Responder
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}