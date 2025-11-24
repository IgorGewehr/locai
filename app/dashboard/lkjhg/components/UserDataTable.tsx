import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Typography,
  LinearProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  Home as HomeIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AdminUser } from '@/lib/types/admin';

interface UserDataTableProps {
  users: AdminUser[];
  onRefresh: () => void;
}

type SortField = 'name' | 'email' | 'createdAt' | 'propertyCount' | 'plan';
type SortOrder = 'asc' | 'desc';

export default function UserDataTable({ users, onRefresh }: UserDataTableProps) {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [onboardingFilter, setOnboardingFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        user =>
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.phoneNumber?.toLowerCase().includes(searchLower)
      );
    }

    // Plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter(user =>
        user.plan.toLowerCase().includes(planFilter.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    // Onboarding filter
    if (onboardingFilter !== 'all') {
      filtered = filtered.filter(user => {
        const isCompleted = user.onboardingProgress.isCompleted;
        const percentage = user.onboardingProgress.completionPercentage;

        if (onboardingFilter === 'completed') return isCompleted;
        if (onboardingFilter === 'in_progress') return !isCompleted && percentage > 0;
        if (onboardingFilter === 'not_started') return percentage === 0;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'createdAt':
          // Handle both Date objects and null/undefined
          aValue = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          bValue = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          break;
        case 'propertyCount':
          aValue = a.propertyCount;
          bValue = b.propertyCount;
          break;
        case 'plan':
          aValue = a.plan;
          bValue = b.plan;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, search, planFilter, statusFilter, onboardingFilter, sortField, sortOrder]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#28A745';
      case 'inactive':
        return '#FFC107';
      case 'suspended':
        return '#DC3545';
      default:
        return '#B0B0B0';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'suspended':
        return 'Suspenso';
      default:
        return status;
    }
  };

  const getOnboardingIcon = (progress: number, isCompleted: boolean) => {
    if (isCompleted) {
      return <CheckCircleIcon sx={{ fontSize: 16, color: '#28A745' }} />;
    }
    if (progress > 0) {
      return <HourglassEmptyIcon sx={{ fontSize: 16, color: '#FFC107' }} />;
    }
    return <CancelIcon sx={{ fontSize: 16, color: '#DC3545' }} />;
  };

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Buscar por nome, email ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#B0B0B0', fontSize: 20 }} />
              </InputAdornment>
            )
          }}
          sx={{
            flex: '1 1 300px',
            '& .MuiOutlinedInput-root': {
              bgcolor: '#1E1E1E',
              fontSize: '0.875rem',
              color: '#FFFFFF',
              '& fieldset': {
                borderColor: '#2C2C2C'
              },
              '&:hover fieldset': {
                borderColor: '#404040'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#0D6EFD'
              }
            },
            '& .MuiInputAdornment-root': {
              color: '#B0B0B0'
            }
          }}
        />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel sx={{ color: '#B0B0B0', '&.Mui-focused': { color: '#0D6EFD' } }}>Plano</InputLabel>
          <Select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            label="Plano"
            sx={{
              bgcolor: '#1E1E1E',
              fontSize: '0.875rem',
              color: '#FFFFFF',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2C2C2C' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#404040' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0D6EFD' },
              '& .MuiSvgIcon-root': { color: '#B0B0B0' }
            }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="free">Free</MenuItem>
            <MenuItem value="pro">Pro</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel sx={{ color: '#B0B0B0', '&.Mui-focused': { color: '#0D6EFD' } }}>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            label="Status"
            sx={{
              bgcolor: '#1E1E1E',
              fontSize: '0.875rem',
              color: '#FFFFFF',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2C2C2C' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#404040' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0D6EFD' },
              '& .MuiSvgIcon-root': { color: '#B0B0B0' }
            }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="active">Ativo</MenuItem>
            <MenuItem value="inactive">Inativo</MenuItem>
            <MenuItem value="suspended">Suspenso</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: '#B0B0B0', '&.Mui-focused': { color: '#0D6EFD' } }}>Onboarding</InputLabel>
          <Select
            value={onboardingFilter}
            onChange={e => setOnboardingFilter(e.target.value)}
            label="Onboarding"
            sx={{
              bgcolor: '#1E1E1E',
              fontSize: '0.875rem',
              color: '#FFFFFF',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2C2C2C' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#404040' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0D6EFD' },
              '& .MuiSvgIcon-root': { color: '#B0B0B0' }
            }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="completed">Completo</MenuItem>
            <MenuItem value="in_progress">Em Progresso</MenuItem>
            <MenuItem value="not_started">Não Iniciado</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="Atualizar">
          <IconButton onClick={onRefresh} size="small" sx={{ color: '#B0B0B0' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>

        <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
          {filteredAndSortedUsers.length} de {users.length} usuários
        </Typography>
      </Box>

      {/* Table */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#1A1A1A' }}>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#B0B0B0', borderBottom: '1px solid #2C2C2C' }}>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  Nome
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#B0B0B0', borderBottom: '1px solid #2C2C2C' }}>
                <TableSortLabel
                  active={sortField === 'createdAt'}
                  direction={sortField === 'createdAt' ? sortOrder : 'asc'}
                  onClick={() => handleSort('createdAt')}
                  sx={{
                    color: '#FFFFFF !important',
                    '&:hover': { color: '#FFFFFF' },
                    '&.Mui-active': { color: '#FFFFFF' },
                    '& .MuiTableSortLabel-icon': { color: '#FFFFFF !important' }
                  }}
                >
                  Data de Cadastro
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#B0B0B0' }}>
                <TableSortLabel
                  active={sortField === 'email'}
                  direction={sortField === 'email' ? sortOrder : 'asc'}
                  onClick={() => handleSort('email')}
                >
                  Email
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#B0B0B0' }}>
                <TableSortLabel
                  active={sortField === 'plan'}
                  direction={sortField === 'plan' ? sortOrder : 'asc'}
                  onClick={() => handleSort('plan')}
                >
                  Plano
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#B0B0B0' }}>
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#B0B0B0' }}>
                <TableSortLabel
                  active={sortField === 'propertyCount'}
                  direction={sortField === 'propertyCount' ? sortOrder : 'asc'}
                  onClick={() => handleSort('propertyCount')}
                >
                  Propriedades
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#B0B0B0' }}>
                Onboarding
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedUsers.map(user => (
              <TableRow
                key={user.id}
                sx={{
                  '&:hover': { bgcolor: '#1A1A1A' },
                  borderBottom: '1px solid #2C2C2C'
                }}
              >
                <TableCell sx={{ fontSize: '0.875rem', color: '#FFFFFF', fontWeight: 500 }}>
                  {user.name}
                </TableCell>
                <TableCell sx={{ fontSize: '0.875rem', color: '#FFFFFF' }}>
                  <Tooltip
                    title={(() => {
                      try {
                        if (!user.createdAt) return 'Data não disponível';
                        if (!(user.createdAt instanceof Date)) return 'Data inválida';
                        if (isNaN(user.createdAt.getTime())) return 'Data inválida';
                        return format(user.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                      } catch {
                        return 'Data não disponível';
                      }
                    })()}
                    arrow
                  >
                    <span>
                      {(() => {
                        try {
                          if (!user.createdAt) return '-';
                          if (!(user.createdAt instanceof Date)) return '-';
                          if (isNaN(user.createdAt.getTime())) return '-';
                          return format(user.createdAt, 'dd/MM/yyyy', { locale: ptBR });
                        } catch {
                          return '-';
                        }
                      })()}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontSize: '0.875rem', color: '#B0B0B0' }}>
                  {user.email}
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.plan}
                    size="small"
                    sx={{
                      fontSize: '0.75rem',
                      height: 24,
                      bgcolor: user.plan.includes('Pro') ? '#0D6EFD15' : '#B0B0B015',
                      color: user.plan.includes('Pro') ? '#0D6EFD' : '#B0B0B0',
                      fontWeight: 500
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(user.status)}
                    size="small"
                    sx={{
                      fontSize: '0.75rem',
                      height: 24,
                      bgcolor: getStatusColor(user.status) + '15',
                      color: getStatusColor(user.status),
                      fontWeight: 500
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HomeIcon sx={{ fontSize: 16, color: '#B0B0B0' }} />
                    <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
                      {user.propertyCount}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Tooltip
                    title={`${user.onboardingProgress.completedStepsCount} de ${user.onboardingProgress.totalSteps} passos completos`}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
                      {getOnboardingIcon(
                        user.onboardingProgress.completionPercentage,
                        user.onboardingProgress.isCompleted
                      )}
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={user.onboardingProgress.completionPercentage}
                          sx={{
                            height: 6,
                            borderRadius: 1,
                            bgcolor: '#2C2C2C',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: user.onboardingProgress.isCompleted
                                ? '#28A745'
                                : '#FFC107'
                            }
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#B0B0B0', fontSize: '0.7rem' }}>
                        {user.onboardingProgress.completionPercentage}%
                      </Typography>
                    </Box>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredAndSortedUsers.length === 0 && (
        <Box
          sx={{
            py: 8,
            textAlign: 'center',
            color: '#B0B0B0'
          }}
        >
          <Typography variant="body2">Nenhum usuário encontrado</Typography>
        </Box>
      )}
    </Box>
  );
}
