'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  TableChart,
  ShowChart,
  BarChart,
  Assessment,
  FilterList,
  Download,
  Refresh,
} from '@mui/icons-material';
import EnhancedFinancialDashboard from '@/components/templates/dashboards/EnhancedFinancialDashboard';
import EnhancedTransactionTable from '@/components/organisms/financial/EnhancedTransactionTable';
import InteractiveCharts from '@/components/organisms/financial/InteractiveCharts';
import { Transaction, Client, Property, Reservation } from '@/lib/types';
import { transactionService } from '@/lib/services/transaction-service';
import { clientService } from '@/lib/services/client-service';
import { propertyService } from '@/lib/services/property-service';
import { reservationService } from '@/lib/services/reservation-service';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingIncome: number;
  pendingExpenses: number;
  transactionCount: {
    total: number;
    pending: number;
    completed: number;
  };
  growth: {
    income: number;
    expenses: number;
    balance: number;
  };
  byCategory: Record<string, number>;
}

interface ChartData {
  monthlyTrends: any[];
  categoryBreakdown: any[];
  cashFlow: any[];
  paymentMethods: any[];
  propertyPerformance: any[];
}

type ViewMode = 'dashboard' | 'transactions' | 'analytics';
type Period = '3m' | '6m' | '1y' | '2y';

export default function FinancialPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [period, setPeriod] = useState<Period>('6m');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  
  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Generate mock data for demonstration
      const mockTransactions: Transaction[] = Array.from({ length: 50 }, (_, i) => ({
        id: `trans_${i}`,
        type: Math.random() > 0.6 ? 'income' : 'expense',
        category: Math.random() > 0.5 ? 'Hospedagem' : 'Manutenção',
        description: `Transação ${i + 1}`,
        amount: Math.random() * 5000 + 500,
        date: subMonths(new Date(), Math.floor(Math.random() * 12)),
        status: Math.random() > 0.3 ? 'completed' : 'pending',
        paymentMethod: 'pix',
        propertyId: `prop_${Math.floor(Math.random() * 5)}`,
        clientId: `client_${Math.floor(Math.random() * 10)}`,
        tags: ['tag1', 'tag2'],
        notes: 'Observações da transação',
      }));

      const mockClients: Client[] = Array.from({ length: 10 }, (_, i) => ({
        id: `client_${i}`,
        name: `Cliente ${i + 1}`,
        email: `cliente${i}@email.com`,
        phone: `+5511999${String(i).padStart(6, '0')}`,
        preferences: {},
        reservations: [],
        totalSpent: Math.random() * 10000,
        rating: Math.random() * 5,
        notes: '',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const mockProperties: Property[] = Array.from({ length: 5 }, (_, i) => ({
        id: `prop_${i}`,
        title: `Propriedade ${i + 1}`,
        description: 'Descrição da propriedade',
        location: { address: `Endereço ${i + 1}`, city: 'Cidade', state: 'SP' },
        bedrooms: Math.floor(Math.random() * 4) + 1,
        bathrooms: Math.floor(Math.random() * 3) + 1,
        maxGuests: Math.floor(Math.random() * 8) + 2,
        basePrice: Math.random() * 500 + 200,
        cleaningFee: 100,
        amenities: [],
        photos: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const mockReservations: Reservation[] = Array.from({ length: 20 }, (_, i) => ({
        id: `reservation_${i}`,
        propertyId: `prop_${Math.floor(Math.random() * 5)}`,
        clientId: `client_${Math.floor(Math.random() * 10)}`,
        checkIn: new Date(),
        checkOut: new Date(),
        guests: Math.floor(Math.random() * 6) + 1,
        totalAmount: Math.random() * 3000 + 1000,
        status: 'confirmed',
        paymentStatus: 'paid',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      setTransactions(mockTransactions);
      setClients(mockClients);
      setProperties(mockProperties);
      setReservations(mockReservations);

      // Calculate stats
      const calculatedStats = calculateStats(mockTransactions);
      setStats(calculatedStats);

      // Prepare chart data
      const preparedChartData = prepareChartData(mockTransactions, period);
      setChartData(preparedChartData);

    } catch (err) {
      console.error('Error loading financial data:', err);
      setError('Erro ao carregar dados financeiros');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateStats = (transactions: Transaction[]): FinancialStats => {
    const currentMonth = new Date();
    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= firstDayOfMonth && transactionDate <= lastDayOfMonth;
    });

    const income = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingIncome = currentMonthTransactions
      .filter(t => t.type === 'income' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate growth (simplified - would need previous month data)
    const growth = {
      income: Math.random() * 20 - 10, // Mock data
      expenses: Math.random() * 20 - 10,
      balance: Math.random() * 20 - 10,
    };

    // Count transactions by status
    const transactionCount = {
      total: currentMonthTransactions.length,
      pending: currentMonthTransactions.filter(t => t.status === 'pending').length,
      completed: currentMonthTransactions.filter(t => t.status === 'completed').length,
    };

    // Group by category
    const byCategory: Record<string, number> = {};
    currentMonthTransactions.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
      pendingIncome,
      pendingExpenses,
      transactionCount,
      growth,
      byCategory,
    };
  };

  const prepareChartData = (transactions: Transaction[], period: Period): ChartData => {
    const months = period === '3m' ? 3 : period === '6m' ? 6 : period === '1y' ? 12 : 24;
    
    const monthlyTrends = Array.from({ length: months }, (_, i) => {
      const date = subMonths(new Date(), months - 1 - i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      });
      
      return {
        month: format(date, 'MMM/yy', { locale: ptBR }),
        receitas: monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        despesas: monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      };
    });

    // Other chart data would be calculated here
    return {
      monthlyTrends,
      categoryBreakdown: [],
      cashFlow: [],
      paymentMethods: [],
      propertyPerformance: [],
    };
  };

  const handleRefresh = () => {
    loadData();
    setSnackbarOpen(true);
  };

  const handleFilter = () => {
    // Implement filter functionality
  };

  const handleExport = () => {
    // Implement export functionality
  };

  const handleTransactionEdit = (transaction: Transaction) => {
    // Implement edit functionality
  };

  const handleTransactionDelete = (id: string) => {
    // Implement delete functionality
  };

  const handleTransactionConfirm = (id: string) => {
    // Implement confirm functionality
  };

  const handleTransactionCancel = (id: string) => {
    // Implement cancel functionality
  };

  const handleBulkAction = (action: string, ids: string[]) => {
    // Implement bulk actions
  };

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadData}>
          Tentar Novamente
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Navigation */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Módulo Financeiro
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={(_, value) => value && setPeriod(value)}
              size="small"
            >
              <ToggleButton value="3m">3M</ToggleButton>
              <ToggleButton value="6m">6M</ToggleButton>
              <ToggleButton value="1y">1A</ToggleButton>
              <ToggleButton value="2y">2A</ToggleButton>
            </ToggleButtonGroup>
            
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Atualizar
            </Button>
          </Box>
        </Box>
        
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          aria-label="view mode"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="dashboard" aria-label="dashboard">
            <Assessment sx={{ mr: 1 }} />
            Dashboard
          </ToggleButton>
          <ToggleButton value="transactions" aria-label="transactions">
            <TableChart sx={{ mr: 1 }} />
            Transações
          </ToggleButton>
          <ToggleButton value="analytics" aria-label="analytics">
            <BarChart sx={{ mr: 1 }} />
            Análises
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <>
          {viewMode === 'dashboard' && stats && (
            <EnhancedFinancialDashboard
              stats={stats}
              isLoading={false}
              onRefresh={handleRefresh}
              onFilter={handleFilter}
              onExport={handleExport}
            />
          )}
          
          {viewMode === 'transactions' && (
            <EnhancedTransactionTable
              transactions={transactions}
              properties={properties}
              clients={clients}
              reservations={reservations}
              onEdit={handleTransactionEdit}
              onDelete={handleTransactionDelete}
              onConfirm={handleTransactionConfirm}
              onCancel={handleTransactionCancel}
              onBulkAction={handleBulkAction}
              isLoading={false}
            />
          )}
          
          {viewMode === 'analytics' && chartData && (
            <InteractiveCharts
              data={chartData}
              period={period}
              onPeriodChange={setPeriod}
            />
          )}
        </>
      )}
      
      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message="Dados atualizados com sucesso!"
      />
    </Container>
  );
}