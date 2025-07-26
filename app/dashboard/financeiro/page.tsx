'use client';

import { Box } from '@mui/material';
import EnhancedFinancialDashboard from '@/components/templates/dashboards/EnhancedFinancialDashboard';

export default function FinancialPage() {
  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        pt: 2,
      }}
    >
      <EnhancedFinancialDashboard />
    </Box>
  );
}