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
  useMediaQuery,
  Drawer,
  IconButton,
  alpha,
} from '@mui/material';
import {
  Person,
  WhatsApp,
  SmartToy,
  Business,
  Policy,
  AccountBalance,
  Menu as MenuIcon,
  Close as CloseIcon,
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isReady } = useTenant();

  const [selectedTab, setSelectedTab] = useState<string>('profile');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const currentTabConfig = tabs.find((t) => t.id === selectedTab);
  const CurrentComponent = currentTabConfig?.component;

  const handleTabSelect = (tabId: string) => {
    setSelectedTab(tabId);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const SidebarContent = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sidebar Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Configurações
        </Typography>
        {isMobile && (
          <IconButton onClick={() => setMobileDrawerOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Sidebar Navigation */}
      <List sx={{ flex: 1, p: 2 }}>
        {tabs.map((tab) => (
          <ListItemButton
            key={tab.id}
            selected={selectedTab === tab.id}
            onClick={() => handleTabSelect(tab.id)}
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
    </Box>
  );

  if (!isReady) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
            },
          }}
        >
          <SidebarContent />
        </Drawer>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <Paper
          elevation={0}
          sx={{
            width: 280,
            flexShrink: 0,
            borderRight: `1px solid ${theme.palette.divider}`,
            borderRadius: 0,
            height: '100%',
            overflow: 'auto',
          }}
        >
          <SidebarContent />
        </Paper>
      )}

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          bgcolor: 'background.default',
        }}
      >
        {/* Mobile Menu Button */}
        {isMobile && (
          <Box
            sx={{
              p: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <IconButton onClick={() => setMobileDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          </Box>
        )}

        {/* Content Header */}
        <Box
          sx={{
            p: 3,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {currentTabConfig?.label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentTabConfig?.description}
          </Typography>
        </Box>

        {/* Tab Content */}
        <Box sx={{ p: 3 }}>
          {CurrentComponent && <CurrentComponent />}
        </Box>
      </Box>
    </Box>
  );
}
