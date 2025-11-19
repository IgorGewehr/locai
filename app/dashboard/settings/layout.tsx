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
  ArrowBack as ArrowBackIcon,
  Dashboard as DashboardIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { Breadcrumbs, Link } from '@mui/material';
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
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: <WhatsAppIcon />,
    path: '/dashboard/settings/whatsapp',
    description: 'Conexão e integração do WhatsApp',
  },
  {
    id: 'profile',
    label: 'Perfil',
    icon: <PersonIcon />,
    path: '/dashboard/settings/profile',
    description: 'Informações pessoais e senha',
  },
  {
    id: 'company',
    label: 'Empresa',
    icon: <BusinessIcon />,
    path: '/dashboard/settings/company',
    description: 'Dados da empresa',
  },
  {
    id: 'financial',
    label: 'Dados Financeiros',
    icon: <PaymentIcon />,
    path: '/dashboard/settings/financial',
    description: 'Informações bancárias para TED',
  },
  {
    id: 'ai-config',
    label: 'IA & Negociação',
    icon: <AIIcon />,
    path: '/dashboard/settings/ai-config',
    description: 'Configurações do agente de IA',
  },
  {
    id: 'policies',
    label: 'Políticas',
    icon: <PolicyIcon />,
    path: '/dashboard/settings/policies',
    description: 'Regras e políticas de atendimento',
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

      {/* Back to Dashboard Button */}
      <Box sx={{ p: 2, pt: 3 }}>
        <ListItemButton
          onClick={() => handleNavigate('/dashboard')}
          sx={{
            borderRadius: 2,
            border: '2px solid',
            borderColor: 'primary.main',
            bgcolor: 'primary.main',
            color: 'white',
            py: 1.5,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'primary.dark',
              borderColor: 'primary.dark',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
          }}
        >
          <ListItemIcon
            sx={{
              color: 'white',
              minWidth: 40,
            }}
          >
            <ArrowBackIcon />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body1" fontWeight={600}>
                Voltar ao Dashboard
              </Typography>
            }
          />
        </ListItemButton>
      </Box>

      <Divider sx={{ mx: 2 }} />

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
              {(section.id === 'profile' || section.id === 'financial') && (
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
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header with Breadcrumbs */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box>
            <Breadcrumbs separator="›" sx={{ mb: 0.5 }}>
              <Link
                href="/dashboard"
                underline="hover"
                color="text.secondary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/dashboard');
                }}
              >
                <DashboardIcon fontSize="small" />
                Dashboard
              </Link>
              <Typography color="primary" fontWeight={600}>
                Configurações
              </Typography>
            </Breadcrumbs>

            <Typography variant="body2" color="text.secondary">
              {SETTINGS_SECTIONS.find((s) => s.path === pathname)?.description ||
                'Gerencie as configurações do sistema'}
            </Typography>
          </Box>
        </Paper>

        {/* Content Area */}
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            maxWidth: '1400px',
            width: '100%',
            mx: 'auto',
            overflowY: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
