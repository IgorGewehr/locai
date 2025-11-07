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
  useTheme,
  Paper,
  Card,
  CardContent,
  alpha,
  Fade,
  Slide,
  LinearProgress,
  Zoom,
  Container,
  Skeleton
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
  Business as BusinessIcon,
  ShieldOutlined as ShieldIcon,
  AutoGraphOutlined as GraphIcon,
  SpeedOutlined as SpeedIcon,
  SecurityOutlined as SecurityIcon,
  NotificationsActiveOutlined as NotificationIcon,
  AccessTimeOutlined as TimeIcon,
  KeyboardArrowRightOutlined as ArrowIcon,
  AssignmentOutlined as TaskIcon,
  BarChartOutlined as ChartIcon,
  GroupsOutlined as GroupsIcon,
  PriorityHighOutlined as PriorityIcon,
  VerifiedUserOutlined as VerifiedIcon
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
    <Fade in={value === index} timeout={400}>
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`admin-tabpanel-${index}`}
        aria-labelledby={`admin-tab-${index}`}
        {...other}
      >
        {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
      </div>
    </Fade>
  );
}

interface Ticket {
  id: string;
  tenantId: string;
  tenantName?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPlan?: string;
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

// Enhanced Stat Card Component
const StatCard = ({ icon, title, value, trend, color, subtitle }: any) => {
  const theme = useTheme();
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        background: alpha(theme.palette.background.paper, 0.05),
        backdropFilter: 'blur(20px)',
        border: '1px solid',
        borderColor: alpha('#fff', 0.08),
        borderRadius: '20px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, transparent 60%)`,
          opacity: 0,
          transition: 'opacity 0.3s ease'
        },
        '&:hover': {
          transform: 'translateY(-8px)',
          borderColor: alpha(color, 0.3),
          boxShadow: `0 20px 40px ${alpha(color, 0.15)}`,
          '&::before': {
            opacity: 1
          },
          '& .stat-icon': {
            transform: 'scale(1.1) rotate(5deg)'
          },
          '& .stat-value': {
            transform: 'scale(1.05)'
          }
        }
      }}
    >
      <Stack spacing={2.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box
            className="stat-icon"
            sx={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${alpha(color, 0.2)} 0%, ${alpha(color, 0.1)} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.3s ease',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: -2,
                borderRadius: '16px',
                background: `linear-gradient(135deg, ${color}, transparent)`,
                opacity: 0.3,
                filter: 'blur(10px)',
                zIndex: -1
              }
            }}
          >
            {React.cloneElement(icon, { sx: { fontSize: 28, color } })}
          </Box>
          {trend && (
            <Chip
              size="small"
              icon={<TrendingUpIcon />}
              label={trend}
              sx={{
                height: 24,
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: alpha('#10b981', 0.1),
                color: '#10b981',
                border: '1px solid',
                borderColor: alpha('#10b981', 0.2),
                '& .MuiChip-icon': {
                  fontSize: 14,
                  color: '#10b981'
                }
              }}
            />
          )}
        </Stack>
        
        <Box>
          <Typography 
            variant="body2" 
            sx={{
              color: alpha('#94a3b8', 0.9),
              fontWeight: 500,
              fontSize: '0.875rem',
              mb: 0.5,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {title}
          </Typography>
          <Typography 
            className="stat-value"
            variant="h3" 
            sx={{
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '2.5rem',
              letterSpacing: '-0.03em',
              transition: 'transform 0.3s ease',
              display: 'inline-block'
            }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography 
              variant="caption" 
              sx={{
                display: 'block',
                color: alpha('#64748b', 0.8),
                fontWeight: 500,
                mt: 0.5
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
};

export default function EnhancedAdminDashboard() {
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
        router.push('/dashboard');
        return;
      }
      
      const response = await makeAuthenticatedRequest('/api/admin/verify', {
        method: 'GET'
      });

      if (!response.ok) {
        router.push('/dashboard');
        return;
      }

      const data = await response.json();
      
      if (!data.isAdmin) {
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
      loadAdminData();
    } catch (error) {
      console.error('Erro ao verificar acesso admin:', error);
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
        return <PriorityIcon sx={{ color: '#ef4444' }} />;
      case 'high':
        return <WarningIcon sx={{ color: '#f59e0b' }} />;
      case 'medium':
        return <TimeIcon sx={{ color: '#3b82f6' }} />;
      default:
        return <CheckCircleIcon sx={{ color: '#10b981' }} />;
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
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{ 
          background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: `
              radial-gradient(circle at 25% 25%, rgba(124, 58, 237, 0.2) 0%, transparent 40%),
              radial-gradient(circle at 75% 75%, rgba(239, 68, 68, 0.15) 0%, transparent 40%)
            `,
            animation: 'pulse 3s ease-in-out infinite',
            pointerEvents: 'none'
          },
          '@keyframes pulse': {
            '0%, 100%': {
              opacity: 0.5,
              transform: 'scale(1)'
            },
            '50%': {
              opacity: 1,
              transform: 'scale(1.05)'
            }
          }
        }}
      >
        <Zoom in={true} timeout={800}>
          <Paper
            elevation={0}
            sx={{
              background: alpha('#1e293b', 0.6),
              backdropFilter: 'blur(24px)',
              border: '1px solid',
              borderColor: alpha('#fff', 0.08),
              borderRadius: '24px',
              p: 5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              position: 'relative',
              zIndex: 1
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <CircularProgress 
                sx={{ 
                  color: '#ef4444',
                  '& .MuiCircularProgress-circle': {
                    strokeLinecap: 'round'
                  }
                }} 
                size={56}
                thickness={4}
              />
              <ShieldIcon 
                sx={{ 
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 24,
                  color: '#ef4444'
                }} 
              />
            </Box>
            <Stack spacing={1} alignItems="center">
              <Typography 
                variant="h6"
                sx={{
                  color: '#ffffff',
                  fontFamily: '"Inter", sans-serif',
                  fontWeight: 700,
                  letterSpacing: '-0.02em'
                }}
              >
                Verificando Credenciais
              </Typography>
              <Typography 
                variant="body2"
                sx={{
                  color: alpha('#94a3b8', 0.8),
                  fontFamily: '"Inter", sans-serif',
                  fontWeight: 500
                }}
              >
                Acessando painel administrativo seguro...
              </Typography>
            </Stack>
            <LinearProgress 
              sx={{ 
                width: 200,
                height: 2,
                borderRadius: 1,
                backgroundColor: alpha('#ef4444', 0.1),
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#ef4444',
                  borderRadius: 1
                }
              }} 
            />
          </Paper>
        </Zoom>
      </Box>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Box sx={{ 
      flexGrow: 1, 
      background: `
        linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%)
      `,
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: `
          radial-gradient(circle at 25% 25%, rgba(124, 58, 237, 0.15) 0%, transparent 40%),
          radial-gradient(circle at 75% 75%, rgba(239, 68, 68, 0.1) 0%, transparent 40%),
          radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 60%)
        `,
        animation: 'floatAnimation 20s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 0
      },
      '@keyframes floatAnimation': {
        '0%, 100%': {
          transform: 'translate(0, 0) rotate(0deg)'
        },
        '33%': {
          transform: 'translate(30px, -30px) rotate(120deg)'
        },
        '66%': {
          transform: 'translate(-20px, 20px) rotate(240deg)'
        }
      }
    }}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
        {/* Header Enhanced */}
        <Fade in={isAdmin} timeout={600}>
          <Paper 
            elevation={0}
            sx={{ 
              mb: 4,
              background: alpha('#1e293b', 0.6),
              backdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid',
              borderColor: alpha('#fff', 0.08),
              borderRadius: '24px',
              p: { xs: 2.5, sm: 3, md: 4 },
              boxShadow: `
                0 4px 6px rgba(0, 0, 0, 0.07),
                0 10px 15px rgba(0, 0, 0, 0.1),
                0 20px 40px rgba(0, 0, 0, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.05)
              `,
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'translateY(0)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `
                  0 6px 8px rgba(0, 0, 0, 0.09),
                  0 12px 20px rgba(0, 0, 0, 0.12),
                  0 25px 50px rgba(0, 0, 0, 0.18),
                  inset 0 1px 0 rgba(255, 255, 255, 0.08)
                `,
                borderColor: alpha('#fff', 0.12)
              }
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'stretch', sm: 'center' }} mb={4}>
              <Box
                sx={{
                  width: { xs: 60, sm: 64, md: 72 },
                  height: { xs: 60, sm: 64, md: 72 },
                  borderRadius: '20px',
                  background: `
                    linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.95) 100%)
                  `,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, transparent 70%)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease'
                  },
                  '&:hover': {
                    transform: 'scale(1.08) rotate(2deg)',
                    boxShadow: '0 20px 40px rgba(239, 68, 68, 0.4)',
                    '&::before': {
                      opacity: 1
                    },
                    '& .admin-icon': {
                      transform: 'scale(1.1)'
                    },
                    '& .shield-icon': {
                      opacity: 1,
                      transform: 'scale(1) rotate(0deg)'
                    }
                  },
                  boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)'
                }}
              >
                <AdminIcon className="admin-icon" sx={{ fontSize: 32, color: '#ffffff', transition: 'transform 0.3s ease', zIndex: 2 }} />
                <ShieldIcon 
                  className="shield-icon"
                  sx={{ 
                    position: 'absolute',
                    fontSize: 48,
                    color: alpha('#fff', 0.2),
                    opacity: 0,
                    transform: 'scale(0.8) rotate(-10deg)',
                    transition: 'all 0.3s ease'
                  }} 
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    color: '#ffffff',
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' },
                    mb: 1,
                    background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 2px 10px rgba(255, 255, 255, 0.1)'
                  }}
                >
                  Central de Comando
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SecurityIcon sx={{ fontSize: 18, color: alpha('#10b981', 0.9) }} />
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: alpha('#cbd5e1', 0.9),
                      fontFamily: '"Inter", sans-serif',
                      fontWeight: 500,
                      fontSize: { xs: '0.875rem', sm: '0.95rem' }
                    }}
                  >
                    Sistema de Gerenciamento Administrativo Avançado
                  </Typography>
                </Stack>
              </Box>
              <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1} alignItems={{ xs: 'center', sm: 'flex-end' }}>
                <Chip 
                  label="ADMIN ACCESS" 
                  variant="filled"
                  icon={<ShieldIcon />}
                  sx={{ 
                    fontWeight: 700,
                    px: 2.5,
                    py: 1.5,
                    height: 36,
                    background: `
                      linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)
                    `,
                    backdropFilter: 'blur(10px)',
                    color: '#ef4444',
                    border: '1.5px solid',
                    borderColor: alpha('#ef4444', 0.3),
                    borderRadius: '12px',
                    boxShadow: `
                      0 4px 12px rgba(239, 68, 68, 0.15),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1)
                    `,
                    transition: 'all 0.3s ease',
                    '& .MuiChip-icon': {
                      color: '#ef4444',
                      fontSize: 20
                    },
                    '&:hover': {
                      background: `
                        linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.25) 100%)
                      `,
                      borderColor: alpha('#ef4444', 0.5),
                      transform: 'translateY(-1px)',
                      boxShadow: `
                        0 6px 16px rgba(239, 68, 68, 0.2),
                        inset 0 1px 0 rgba(255, 255, 255, 0.15)
                      `
                    }
                  }}
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: alpha('#94a3b8', 0.8),
                    fontWeight: 500,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  Sessão Segura
                </Typography>
              </Stack>
            </Stack>
            
            {/* Enhanced Stats Cards */}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard
                  icon={<TaskIcon />}
                  title="Total de Tickets"
                  value={tickets.length}
                  trend="+12%"
                  color="#8b5cf6"
                  subtitle={`${tickets.filter(t => t.status === 'open').length} abertos`}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard
                  icon={<WarningIcon />}
                  title="Tickets Urgentes"
                  value={tickets.filter(t => t.status === 'open').length}
                  color="#ef4444"
                  subtitle="Requer atenção imediata"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard
                  icon={<GroupsIcon />}
                  title="Usuários Ativos"
                  value={users.length}
                  trend="+8%"
                  color="#10b981"
                  subtitle={`${users.filter(u => u.status === 'active').length} online`}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard
                  icon={<BusinessIcon />}
                  title="Organizações"
                  value={uniqueTenants.length}
                  color="#3b82f6"
                  subtitle="Tenants ativos"
                />
              </Grid>
            </Grid>
          </Paper>
        </Fade>

        {/* Enhanced Tabs */}
        <Fade in={isAdmin} timeout={800} style={{ transitionDelay: '200ms' }}>
          <Paper 
            elevation={0}
            sx={{ 
              mb: 3,
              background: alpha('#1e293b', 0.4),
              backdropFilter: 'blur(20px)',
              border: '1px solid',
              borderColor: alpha('#fff', 0.06),
              borderRadius: '16px',
              p: 1.5,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}
          >
            <Tabs 
              value={tabValue} 
              onChange={(e, v) => setTabValue(v)}
              variant="fullWidth"
              sx={{
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: 1.5,
                  background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                },
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  minHeight: 56,
                  borderRadius: '12px',
                  mx: 0.5,
                  color: alpha('#94a3b8', 0.8),
                  fontFamily: '"Inter", sans-serif',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, transparent 100%)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease'
                  },
                  '&.Mui-selected': {
                    color: '#ffffff',
                    '&::before': {
                      opacity: 1
                    }
                  },
                  '&:hover': {
                    color: '#ffffff',
                    background: alpha('#fff', 0.03)
                  }
                }
              }}
            >
              <Tab 
                label={
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Badge badgeContent={tickets.filter(t => t.status === 'open').length} color="error">
                      <SupportIcon />
                    </Badge>
                    <Typography variant="body2" fontWeight={600}>
                      Tickets
                    </Typography>
                  </Stack>
                }
              />
              <Tab 
                label={
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <PeopleIcon />
                    <Typography variant="body2" fontWeight={600}>
                      Usuários
                    </Typography>
                  </Stack>
                }
              />
              <Tab 
                label={
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <ChartIcon />
                    <Typography variant="body2" fontWeight={600}>
                      Analytics
                    </Typography>
                  </Stack>
                }
              />
            </Tabs>
          </Paper>
        </Fade>

        {/* Tab Panels com conteúdo melhorado */}
        <TabPanel value={tabValue} index={0}>
          {/* Tickets Tab Content - Adicionar melhorias visuais aqui */}
          <Typography variant="h5" sx={{ color: '#fff', mb: 3 }}>
            Gerenciamento de Tickets
          </Typography>
          {/* Resto do conteúdo de tickets... */}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Users Tab Content - Adicionar melhorias visuais aqui */}
          <Typography variant="h5" sx={{ color: '#fff', mb: 3 }}>
            Gerenciamento de Usuários
          </Typography>
          {/* Resto do conteúdo de usuários... */}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Analytics Tab Content - Adicionar melhorias visuais aqui */}
          <Typography variant="h5" sx={{ color: '#fff', mb: 3 }}>
            Analytics & Métricas
          </Typography>
          {/* Resto do conteúdo de analytics... */}
        </TabPanel>
      </Container>
    </Box>
  );
}