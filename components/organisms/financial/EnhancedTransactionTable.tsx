'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  IconButton,
  Avatar,
  Stack,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Button,
  Checkbox,
  Tooltip,
  alpha,
  useTheme,
  Collapse,
  Paper,
  Fade,
  Zoom,
  Badge,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Search,
  FilterList,
  MoreVert,
  Edit,
  Delete,
  Check,
  Cancel,
  ArrowUpward,
  ArrowDownward,
  Schedule,
  CheckCircle,
  Warning,
  Download,
  Print,
  Share,
  Visibility,
  Receipt,
  AccountBalance,
  Person,
  Home,
  CalendarToday,
  AttachMoney,
  PaymentOutlined,
  LocalOffer,
  Repeat,
  KeyboardArrowDown,
  KeyboardArrowRight,
  Info,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  date: Date;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod: string;
  propertyId?: string;
  clientId?: string;
  reservationId?: string;
  tags?: string[];
  notes?: string;
  isRecurring?: boolean;
  recurringType?: string;
}

interface EnhancedTransactionTableProps {
  transactions: Transaction[];
  properties?: any[];
  clients?: any[];
  reservations?: any[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
  onBulkAction?: (action: string, ids: string[]) => void;
  isLoading?: boolean;
}

type Order = 'asc' | 'desc';
type OrderBy = keyof Transaction;

const paymentMethods: Record<string, string> = {
  'pix': 'PIX',
  'credit_card': 'Cartão de Crédito',
  'debit_card': 'Cartão de Débito',
  'bank_transfer': 'Transferência',
  'cash': 'Dinheiro',
  'stripe': 'Stripe',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function EnhancedTransactionTable({
  transactions,
  properties = [],
  clients = [],
  reservations = [],
  onEdit,
  onDelete,
  onConfirm,
  onCancel,
  onBulkAction,
  isLoading = false,
}: EnhancedTransactionTableProps) {
  const theme = useTheme();
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderBy>('date');
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    category: 'all',
  });

  // Filtrar e ordenar transações
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = filters.type === 'all' || transaction.type === filters.type;
      const matchesStatus = filters.status === 'all' || transaction.status === filters.status;
      const matchesCategory = filters.category === 'all' || transaction.category === filters.category;
      
      return matchesSearch && matchesType && matchesStatus && matchesCategory;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];
      
      if (orderBy === 'date') {
        aValue = new Date(aValue as Date).getTime();
        bValue = new Date(bValue as Date).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }
      
      if (order === 'desc') {
        return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [transactions, searchTerm, filters, order, orderBy]);

  const handleSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(filteredTransactions.map(t => t.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelected(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleExpandRow = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const getStatusChip = (status: string) => {
    const configs = {
      completed: { 
        label: 'Confirmado', 
        color: 'success' as const, 
        icon: <CheckCircle sx={{ fontSize: 16 }} /> 
      },
      pending: { 
        label: 'Pendente', 
        color: 'warning' as const, 
        icon: <Schedule sx={{ fontSize: 16 }} /> 
      },
      cancelled: { 
        label: 'Cancelado', 
        color: 'error' as const, 
        icon: <Cancel sx={{ fontSize: 16 }} /> 
      },
    };

    const config = configs[status as keyof typeof configs];
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        icon={config.icon}
        sx={{ fontWeight: 500 }}
      />
    );
  };

  const getTypeChip = (type: 'income' | 'expense', amount: number) => (
    <Chip
      label={type === 'income' ? 'Receita' : 'Despesa'}
      size="small"
      color={type === 'income' ? 'success' : 'error'}
      icon={type === 'income' ? <ArrowUpward /> : <ArrowDownward />}
      sx={{ 
        fontWeight: 500,
        '& .MuiChip-icon': {
          fontSize: 16
        }
      }}
    />
  );

  const TransactionRow = ({ transaction, index }: { transaction: Transaction; index: number }) => {
    const isSelected = selected.includes(transaction.id);
    const isExpanded = expandedRows.includes(transaction.id);
    
    const property = properties.find(p => p.id === transaction.propertyId);
    const client = clients.find(c => c.id === transaction.clientId);
    const reservation = reservations.find(r => r.id === transaction.reservationId);

    return (
      <>
        <TableRow 
          hover
          selected={isSelected}
          sx={{
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.04),
            }
          }}
        >
          <TableCell padding="checkbox">
            <Checkbox
              checked={isSelected}
              onChange={() => handleSelect(transaction.id)}
              color="primary"
            />
          </TableCell>
          
          <TableCell>
            <IconButton
              size="small"
              onClick={() => handleExpandRow(transaction.id)}
            >
              {isExpanded ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
            </IconButton>
          </TableCell>

          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: transaction.type === 'income' ? 'success.light' : 'error.light',
                  color: transaction.type === 'income' ? 'success.main' : 'error.main',
                }}
              >
                {transaction.type === 'income' ? <ArrowUpward /> : <ArrowDownward />}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {format(transaction.date, 'dd/MM/yyyy')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {format(transaction.date, 'HH:mm')}
                </Typography>
              </Box>
            </Box>
          </TableCell>

          <TableCell>
            <Box>
              <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                {transaction.description}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {getTypeChip(transaction.type, transaction.amount)}
                {transaction.isRecurring && (
                  <Chip 
                    size="small" 
                    label={transaction.recurringType} 
                    icon={<Repeat />}
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          </TableCell>

          <TableCell>
            <Box>
              <Typography variant="body2" fontWeight={500}>
                {transaction.category}
              </Typography>
              {transaction.subcategory && (
                <Typography variant="caption" color="text.secondary">
                  {transaction.subcategory}
                </Typography>
              )}
            </Box>
          </TableCell>

          <TableCell align="right">
            <Typography
              variant="h6"
              fontWeight={600}
              color={transaction.type === 'income' ? 'success.main' : 'error.main'}
            >
              {transaction.type === 'expense' && '-'}
              {formatCurrency(transaction.amount)}
            </Typography>
          </TableCell>

          <TableCell>
            {getStatusChip(transaction.status)}
          </TableCell>

          <TableCell>
            <Chip
              size="small"
              label={paymentMethods[transaction.paymentMethod] || transaction.paymentMethod}
              icon={<PaymentOutlined />}
              variant="outlined"
            />
          </TableCell>

          <TableCell align="center">
            <Stack direction="row" spacing={0.5}>
              {transaction.status === 'pending' && (
                <>
                  <Tooltip title="Confirmar">
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => onConfirm?.(transaction.id)}
                    >
                      <Check fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancelar">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onCancel?.(transaction.id)}
                    >
                      <Cancel fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              <Tooltip title="Editar">
                <IconButton
                  size="small"
                  onClick={() => onEdit?.(transaction)}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton
                size="small"
                onClick={(e) => {
                  setActionMenuAnchor(e.currentTarget);
                  setSelectedTransaction(transaction.id);
                }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Stack>
          </TableCell>
        </TableRow>

        {/* Linha expandida com detalhes */}
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <Box sx={{ py: 2, px: 3 }}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    bgcolor: alpha(theme.palette.background.default, 0.5),
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                    Detalhes da Transação
                  </Typography>
                  
                  <Stack spacing={2}>
                    {/* Relacionamentos */}
                    {(property || client || reservation) && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                          Relacionamentos
                        </Typography>
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                          {property && (
                            <Chip
                              icon={<Home />}
                              label={property.title}
                              size="small"
                              clickable
                              onClick={() => window.open(`/dashboard/properties/${property.id}`, '_blank')}
                            />
                          )}
                          {client && (
                            <Chip
                              icon={<Person />}
                              label={client.name}
                              size="small"
                              clickable
                              onClick={() => window.open(`/dashboard/clients/${client.id}`, '_blank')}
                            />
                          )}
                          {reservation && (
                            <Chip
                              icon={<CalendarToday />}
                              label={`Reserva #${reservation.id.slice(-6)}`}
                              size="small"
                              clickable
                              onClick={() => window.open(`/dashboard/reservations/${reservation.id}`, '_blank')}
                            />
                          )}
                        </Stack>
                      </Box>
                    )}

                    {/* Tags */}
                    {transaction.tags && transaction.tags.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                          Tags
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {transaction.tags.map(tag => (
                            <Chip
                              key={tag}
                              icon={<LocalOffer />}
                              label={tag}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* Notas */}
                    {transaction.notes && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                          Observações
                        </Typography>
                        <Typography variant="body2">
                          {transaction.notes}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </>
    );
  };

  return (
    <Card sx={{ overflow: 'hidden' }}>
      <CardContent sx={{ pb: 0 }}>
        {/* Header e Controles */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Transações ({filteredTransactions.length})
            </Typography>
            {selected.length > 0 && (
              <Typography variant="caption" color="primary.main">
                {selected.length} selecionada(s)
              </Typography>
            )}
          </Box>
          
          <Stack direction="row" spacing={1}>
            {selected.length > 0 && (
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<Check />}
                  onClick={() => onBulkAction?.('confirm', selected)}
                >
                  Confirmar ({selected.length})
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={() => onBulkAction?.('cancel', selected)}
                >
                  Cancelar ({selected.length})
                </Button>
              </Stack>
            )}
            
            <IconButton onClick={(e) => setFilterMenuAnchor(e.currentTarget)}>
              <Badge 
                color="primary" 
                variant="dot" 
                invisible={filters.type === 'all' && filters.status === 'all' && filters.category === 'all'}
              >
                <FilterList />
              </Badge>
            </IconButton>
            
            <IconButton>
              <Download />
            </IconButton>
          </Stack>
        </Box>

        {/* Busca */}
        <TextField
          fullWidth
          placeholder="Buscar transações..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
          size="small"
        />
      </CardContent>

      {/* Tabela */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < filteredTransactions.length}
                  checked={filteredTransactions.length > 0 && selected.length === filteredTransactions.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell />
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'date'}
                  direction={orderBy === 'date' ? order : 'asc'}
                  onClick={() => handleSort('date')}
                >
                  Data
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'description'}
                  direction={orderBy === 'description' ? order : 'asc'}
                  onClick={() => handleSort('description')}
                >
                  Descrição
                </TableSortLabel>
              </TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'amount'}
                  direction={orderBy === 'amount' ? order : 'asc'}
                  onClick={() => handleSort('amount')}
                >
                  Valor
                </TableSortLabel>
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Pagamento</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTransactions
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((transaction, index) => (
                <TransactionRow 
                  key={transaction.id} 
                  transaction={transaction} 
                  index={index}
                />
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginação */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredTransactions.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="Linhas por página:"
        labelDisplayedRows={({ from, to, count }) => 
          `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
        }
      />

      {/* Menu de Filtros */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
        PaperProps={{
          sx: { width: 200 }
        }}
      >
        <MenuItem dense>
          <Typography variant="subtitle2" fontWeight={600}>
            Filtros
          </Typography>
        </MenuItem>
        <Divider />
        
        <MenuItem dense>
          <ListItemText primary="Tipo" />
        </MenuItem>
        {['all', 'income', 'expense'].map(type => (
          <MenuItem 
            key={type}
            dense
            selected={filters.type === type}
            onClick={() => setFilters(prev => ({ ...prev, type }))}
            sx={{ pl: 4 }}
          >
            {type === 'all' ? 'Todos' : type === 'income' ? 'Receitas' : 'Despesas'}
          </MenuItem>
        ))}
        
        <Divider />
        
        <MenuItem dense>
          <ListItemText primary="Status" />
        </MenuItem>
        {['all', 'pending', 'completed', 'cancelled'].map(status => (
          <MenuItem 
            key={status}
            dense
            selected={filters.status === status}
            onClick={() => setFilters(prev => ({ ...prev, status }))}
            sx={{ pl: 4 }}
          >
            {status === 'all' ? 'Todos' : 
             status === 'pending' ? 'Pendente' :
             status === 'completed' ? 'Confirmado' : 'Cancelado'}
          </MenuItem>
        ))}
      </Menu>

      {/* Menu de Ações */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          setActionMenuAnchor(null);
          // Visualizar detalhes
        }}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ver Detalhes</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          setActionMenuAnchor(null);
          // Duplicar transação
        }}>
          <ListItemIcon>
            <Receipt fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicar</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          setActionMenuAnchor(null);
          // Imprimir comprovante
        }}>
          <ListItemIcon>
            <Print fontSize="small" />
          </ListItemIcon>
          <ListItemText>Imprimir</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem 
          onClick={() => {
            setActionMenuAnchor(null);
            if (selectedTransaction) {
              onDelete?.(selectedTransaction);
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
}