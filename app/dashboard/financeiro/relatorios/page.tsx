'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import AdvancedAnalytics from '@/components/templates/dashboards/AdvancedAnalytics';
import EnhancedFinancialDashboard from '@/components/templates/dashboards/EnhancedFinancialDashboard';

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
      id={`relatorios-tabpanel-${index}`}
      aria-labelledby={`relatorios-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `relatorios-tab-${index}`,
    'aria-controls': `relatorios-tabpanel-${index}`,
  };
}

export default function ReportsPage() {
  const [tabValue, setTabValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          Relatórios
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Análises detalhadas de desempenho e finanças
        </Typography>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleChange} 
            aria-label="relatórios tabs"
            sx={{ px: 2 }}
          >
            <Tab label="Dashboard Financeiro" {...a11yProps(0)} />
            <Tab label="Analytics Avançado" {...a11yProps(1)} />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <EnhancedFinancialDashboard />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <AdvancedAnalytics />
        </TabPanel>
      </Paper>
    </Box>
  );
}