'use client';

import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { AccountBalanceWallet, MoneyOff } from '@mui/icons-material';
import WalletBalance from '@/components/wallet/WalletBalance';
import WithdrawalDialog from '@/components/wallet/WithdrawalDialog';
import WalletTransactionList from '@/components/wallet/WalletTransactionList';
import { useTenant } from '@/contexts/TenantContext';

export default function WalletPage() {
  const { tenantId } = useTenant();
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // For demo purposes - in production, get from user context
  const clientId = tenantId;
  const clientName = 'Cliente Exemplo';
  const clientPhone = '+5547999999999';

  const handleWithdrawalSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Minha Carteira Digital
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gerencie seu saldo, visualize transações e solicite saques
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Wallet Balance Card */}
        <Grid item xs={12} md={6}>
          <WalletBalance key={refreshKey} clientId={clientId} />
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Ações Rápidas
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<MoneyOff />}
                onClick={() => setWithdrawalDialogOpen(true)}
                sx={{
                  py: 1.5,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f91 100%)',
                  },
                }}
              >
                Solicitar Saque
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<AccountBalanceWallet />}
                onClick={() => setActiveTab(1)}
              >
                Ver Histórico Completo
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Tabs Section */}
        <Grid item xs={12}>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab label="Transações Recentes" />
              <Tab label="Histórico Completo" />
              <Tab label="Saques Pendentes" />
            </Tabs>

            <Box sx={{ p: 0 }}>
              {activeTab === 0 && (
                <WalletTransactionList key={refreshKey} clientId={clientId} limit={10} />
              )}
              {activeTab === 1 && (
                <WalletTransactionList key={refreshKey} clientId={clientId} limit={100} />
              )}
              {activeTab === 2 && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Funcionalidade de saques pendentes em desenvolvimento
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Withdrawal Dialog */}
      <WithdrawalDialog
        open={withdrawalDialogOpen}
        onClose={() => setWithdrawalDialogOpen(false)}
        onSuccess={handleWithdrawalSuccess}
        clientId={clientId}
        clientName={clientName}
        clientPhone={clientPhone}
        currentBalance={0} // This will be fetched from the dialog component
      />
    </Container>
  );
}
