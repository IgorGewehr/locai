'use client';

import { useState } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  useTheme,
  alpha,
  Container,
} from '@mui/material';
import {
  Person,
  WhatsApp,
  SmartToy,
  Business,
  Policy,
  AccountBalance,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';

// Tab Components
import ProfileTab from './components/tabs/ProfileTab';
import WhatsAppTab from './components/tabs/WhatsAppTab';
import CompanyInfoTab from './components/tabs/CompanyInfoTab';
import AIConfigTab from './components/tabs/AIConfigTab';
import PoliciesTab from './components/tabs/PoliciesTab';
import FinancialInfoTab from './components/tabs/FinancialInfoTab';

interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ComponentType<any>;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: 'profile',
    label: 'Perfil',
    icon: <Person />,
    component: ProfileTab,
    description: 'Informações pessoais e senha',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: <WhatsApp />,
    component: WhatsAppTab,
    description: 'Conexão e integração do WhatsApp',
  },
  {
    id: 'company',
    label: 'Empresa',
    icon: <Business />,
    component: CompanyInfoTab,
    description: 'Dados da sua empresa',
  },
  {
    id: 'financial',
    label: 'Dados Financeiros',
    icon: <AccountBalance />,
    component: FinancialInfoTab,
    description: 'Informações bancárias para TED',
  },
  {
    id: 'ai',
    label: 'IA & Negociação',
    icon: <SmartToy />,
    component: AIConfigTab,
    description: 'Configurações do agente de IA',
  },
  {
    id: 'policies',
    label: 'Políticas',
    icon: <Policy />,
    component: PoliciesTab,
    description: 'Regras e políticas de atendimento',
  },
];

export default function SettingsPage() {
  const theme = useTheme();
  const { isReady } = useTenant();

  const [selectedTab, setSelectedTab] = useState<string>('whatsapp');

  const currentTabConfig = tabs.find((t) => t.id === selectedTab);
  const CurrentComponent = currentTabConfig?.component;

  if (!isReady) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Configurações
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gerencie suas preferências, integrações e configurações do sistema
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Settings Sidebar/Navigation */}
        <Paper
          elevation={0}
          sx={{
            width: 260,
            flexShrink: 0,
            p: 2,
            height: 'fit-content',
            position: 'sticky',
            top: 80,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <List sx={{ p: 0 }}>
            {tabs.map((tab) => (
              <ListItemButton
                key={tab.id}
                selected={selectedTab === tab.id}
                onClick={() => setSelectedTab(tab.id)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  transition: 'all 0.2s ease',
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: 'primary.main',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.18),
                    },
                  },
                  '&:hover': {
                    bgcolor: alpha(theme.palette.action.hover, 0.08),
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: selectedTab === tab.id ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {tab.icon}
                </ListItemIcon>
                <ListItemText
                  primary={tab.label}
                  primaryTypographyProps={{
                    fontSize: '0.95rem',
                    fontWeight: selectedTab === tab.id ? 600 : 500,
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        {/* Main Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Content Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              {currentTabConfig?.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentTabConfig?.description}
            </Typography>
          </Box>

          {/* Tab Content */}
          {CurrentComponent && <CurrentComponent />}
        </Box>
      </Box>
    </Container>
  );
}
