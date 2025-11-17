'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  useTheme,
  useMediaQuery,
  Alert,
  CircularProgress,
  Fade,
} from '@mui/material';
import {
  Person,
  WhatsApp,
  SmartToy,
  Business,
  Policy,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import DashboardBreadcrumb from '@/components/atoms/DashboardBreadcrumb';

// Tab Panels
import ProfileTab from './components/tabs/ProfileTab';
import WhatsAppTab from './components/tabs/WhatsAppTab';
import CompanyInfoTab from './components/tabs/CompanyInfoTab';
import AIConfigTab from './components/tabs/AIConfigTab';
import PoliciesTab from './components/tabs/PoliciesTab';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Fade in={true} timeout={300}>
          <Box sx={{ py: 3 }}>{children}</Box>
        </Fade>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { tenantId, isReady } = useTenant();

  const [currentTab, setCurrentTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const tabs = [
    { label: 'Perfil', icon: <Person />, component: ProfileTab },
    { label: 'WhatsApp', icon: <WhatsApp />, component: WhatsAppTab },
    { label: 'Empresa', icon: <Business />, component: CompanyInfoTab },
    { label: 'IA & Negociação', icon: <SmartToy />, component: AIConfigTab },
    { label: 'Políticas', icon: <Policy />, component: PoliciesTab },
  ];

  if (!isReady) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <DashboardBreadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Configurações', href: '/dashboard/settings' },
        ]}
      />

      {/* Header */}
      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SettingsIcon sx={{ fontSize: 32, mr: 1.5, color: 'primary.main' }} />
          <Typography
            variant="h4"
            fontWeight={600}
            sx={{
              fontSize: { xs: '1.75rem', sm: '2.125rem' },
            }}
          >
            Configurações
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
        >
          Configure sua conta, empresa, integrações e preferências do sistema
        </Typography>
      </Box>

      {/* Global Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Main Settings Card */}
      <Card
        sx={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: { xs: 2, sm: 3 },
          overflow: 'hidden',
        }}
      >
        {/* Tabs Navigation */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'fullWidth'}
            scrollButtons={isMobile ? 'auto' : false}
            allowScrollButtonsMobile
            sx={{
              px: { xs: 0, sm: 2 },
              '& .MuiTab-root': {
                minHeight: { xs: 56, sm: 64 },
                textTransform: 'none',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontWeight: 500,
                gap: 1,
                '&.Mui-selected': {
                  fontWeight: 600,
                },
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                iconPosition="start"
                label={tab.label}
                id={`settings-tab-${index}`}
                aria-controls={`settings-tabpanel-${index}`}
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          {tabs.map((tab, index) => {
            const Component = tab.component;
            return (
              <TabPanel key={index} value={currentTab} index={index}>
                <Component setGlobalError={setError} setGlobalSuccess={setSuccess} />
              </TabPanel>
            );
          })}
        </Box>
      </Card>
    </Box>
  );
}
