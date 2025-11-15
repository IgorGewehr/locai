/**
 * SETTINGS LAYOUT
 *
 * Unified settings interface with sidebar navigation
 * Professional UI/UX for all tenant configuration
 *
 * @version 2.0.0
 */

'use client';

import { useState, ReactNode } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
  IconButton,
  Paper,
  Chip,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  SmartToy as AIIcon,
  Gavel as PolicyIcon,
  LocalOffer as NegotiationIcon,
  Tune as TuneIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';

const DRAWER_WIDTH = 280;

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  badgeColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  description: string;
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'profile',
    label: 'Perfil & Conta',
    icon: <PersonIcon />,
    path: '/dashboard/settings',
    description: 'Informações pessoais, senha e preferências',
  },
  {
    id: 'company',
    label: 'Empresa',
    icon: <BusinessIcon />,
    path: '/dashboard/settings/company',
    description: 'Endereço, dados da imobiliária e informações fiscais',
  },
  {
    id: 'ai-config',
    label: 'Agentes de IA',
    icon: <AIIcon />,
    path: '/dashboard/settings/ai-config',
    badge: 'NOVO',
    badgeColor: 'success',
    description: 'Configure recursos de IA: pagamentos, contratos, analytics',
  },
  {
    id: 'negotiation',
    label: 'Negociação IA',
    icon: <NegotiationIcon />,
    path: '/dashboard/settings/negotiation',
    description: 'Regras de descontos, limites e estratégias de vendas',
  },
  {
    id: 'policies',
    label: 'Políticas',
    icon: <PolicyIcon />,
    path: '/dashboard/settings/policies',
    description: 'Políticas de cancelamento, termos e condições',
  },
  {
    id: 'payment-provider',
    label: 'Provedor de Pagamento',
    icon: <PaymentIcon />,
    path: '/dashboard/settings/payment-provider',
    badge: 'BETA',
    badgeColor: 'warning',
    description: 'Configure AbacatePay, Stripe ou Mercado Pago',
  },
  {
    id: 'advanced',
    label: 'Avançado',
    icon: <TuneIcon />,
    path: '/dashboard/settings/advanced',
    description: 'Configurações técnicas e experimentais',
  },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Typography variant="h6" fontWeight={600}>
            Configurações
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Navigation List */}
      <List sx={{ flex: 1, py: 2, overflowY: 'auto' }}>
        {SETTINGS_SECTIONS.map((section, index) => {
          const isActive = pathname === section.path;

          return (
            <Box key={section.id}>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavigate(section.path)}
                  selected={isActive}
                  sx={{
                    mx: 1.5,
                    borderRadius: 2,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'white',
                      },
                    },
                    '&:hover': {
                      bgcolor: isActive ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? 'white' : 'text.secondary',
                      minWidth: 40,
                    }}
                  >
                    {section.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={isActive ? 600 : 500}
                        >
                          {section.label}
                        </Typography>
                        {section.badge && (
                          <Chip
                            label={section.badge}
                            size="small"
                            color={section.badgeColor}
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        sx={{
                          color: isActive ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                          display: 'block',
                          mt: 0.5,
                        }}
                      >
                        {section.description}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>

              {/* Divider after certain sections */}
              {(section.id === 'company' || section.id === 'negotiation') && (
                <Divider sx={{ my: 1.5, mx: 2 }} />
              )}
            </Box>
          );
        })}
      </List>

      {/* Footer Help Text */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="caption" color="text.secondary" display="block">
          💡 <strong>Dica:</strong> Configure seus agentes de IA para automatizar
          cobranças e contratos
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: theme.zIndex.drawer + 2,
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': {
              bgcolor: 'background.paper',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{
          width: { md: DRAWER_WIDTH },
          flexShrink: { md: 0 },
        }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          maxWidth: '1400px',
          mx: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
