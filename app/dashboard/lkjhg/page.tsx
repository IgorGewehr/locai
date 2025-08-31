'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
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
  Paper,
  Alert,
  CircularProgress,
  Divider,
  Badge,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack
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
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <AdminIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">
            Painel Administrativo
          </Typography>
          <Chip 
            label="ADMIN" 
            color="error" 
            size="small"
            icon={<AdminIcon />}
          />
        </Stack>
        
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Tickets
                    </Typography>
                    <Typography variant="h4">
                      {tickets.length}
                    </Typography>
                  </Box>
                  <SupportIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Tickets Abertos
                    </Typography>
                    <Typography variant="h4" color="error">
                      {tickets.filter(t => t.status === 'open').length}
                    </Typography>
                  </Box>
                  <WarningIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.3 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Usuários
                    </Typography>
                    <Typography variant="h4">
                      {users.length}
                    </Typography>
                  </Box>
                  <PeopleIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Tenants Ativos
                    </Typography>
                    <Typography variant="h4">
                      {uniqueTenants.length}
                    </Typography>
                  </Box>
                  <DashboardIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.3 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab 
            label="Tickets" 
            icon={<Badge badgeContent={tickets.filter(t => t.status === 'open').length} color="error">
              <SupportIcon />
            </Badge>}
            iconPosition="start"
          />
          <Tab label="Usuários" icon={<PeopleIcon />} iconPosition="start" />
          <Tab label="Estatísticas" icon={<DashboardIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {/* Tickets Tab */}
        <Box>
          {/* Filters */}
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <TextField
              placeholder="Buscar tickets..."
              variant="outlined"
              size="small"
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ flexGrow: 1, maxWidth: 400 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={ticketFilter}
                onChange={(e) => setTicketFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="open">Abertos</MenuItem>
                <MenuItem value="in_progress">Em Progresso</MenuItem>
                <MenuItem value="resolved">Resolvidos</MenuItem>
                <MenuItem value="closed">Fechados</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadTickets}
            >
              Atualizar
            </Button>
          </Stack>

          {/* Tickets Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Prioridade</TableCell>
                  <TableCell>Tenant</TableCell>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Assunto</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Criado em</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} hover>
                    <TableCell>
                      <Tooltip title={ticket.priority}>
                        {getPriorityIcon(ticket.priority)}
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={ticket.tenantName || ticket.tenantId} 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack>
                        <Typography variant="body2">{ticket.userName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ticket.userEmail}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {ticket.subject}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                        {ticket.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={ticket.status} 
                        color={getStatusColor(ticket.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {ticket.createdAt && format(ticket.createdAt.toDate?.() || new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Ver detalhes">
                          <IconButton 
                            size="small"
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Responder">
                          <IconButton 
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setReplyDialog(true);
                            }}
                          >
                            <ReplyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Users Tab */}
        <Box>
          {/* Filters */}
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <TextField
              placeholder="Buscar usuários..."
              variant="outlined"
              size="small"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ flexGrow: 1, maxWidth: 400 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Tenant</InputLabel>
              <Select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                label="Tenant"
              >
                <MenuItem value="all">Todos</MenuItem>
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
            >
              Atualizar
            </Button>
          </Stack>

          {/* Users Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Tenant</TableCell>
                  <TableCell>Plano</TableCell>
                  <TableCell>Propriedades</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Criado em</TableCell>
                  <TableCell>Último Login</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {user.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {user.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.tenantName || user.tenantId} 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.plan || 'Free'} 
                        size="small"
                        color={user.plan === 'Pro' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <HomeIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {user.propertyCount || 0}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.status} 
                        size="small"
                        color={user.status === 'active' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {user.createdAt && format(
                        user.createdAt.toDate?.() || new Date(user.createdAt), 
                        'dd/MM/yyyy',
                        { locale: ptBR }
                      )}
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? format(
                        user.lastLogin.toDate?.() || new Date(user.lastLogin),
                        'dd/MM/yyyy HH:mm',
                        { locale: ptBR }
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Statistics Tab */}
        <Grid container spacing={3}>
          {stats.map((stat) => (
            <Grid item xs={12} md={6} lg={4} key={stat.tenantId}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {stat.tenantName}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography color="text.secondary">Usuários:</Typography>
                      <Typography fontWeight="bold">{stat.userCount}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography color="text.secondary">Propriedades:</Typography>
                      <Typography fontWeight="bold">{stat.propertyCount}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography color="text.secondary">Total Tickets:</Typography>
                      <Typography fontWeight="bold">{stat.ticketCount}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography color="text.secondary">Tickets Ativos:</Typography>
                      <Typography fontWeight="bold" color="error">
                        {stat.activeTickets}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
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
                            {response.createdAt && format(response.createdAt.toDate?.() || new Date(response.createdAt), 'dd/MM/yyyy HH:mm')}
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
    </Container>
  );
}