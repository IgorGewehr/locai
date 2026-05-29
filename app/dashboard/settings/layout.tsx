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
  Button,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Dashboard as DashboardIcon,
  WhatsApp as WhatsAppIcon,
  SmartToy as SmartToyIcon,
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
    id: 'company',
    label: 'Empresa',
    icon: <BusinessIcon />,
    path: '/dashboard/settings/company',
    description: 'Dados da empresa',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: <WhatsAppIcon />,
    path: '/dashboard/settings/whatsapp',
    description: 'Conexão e integração do WhatsApp',
  },
  {
    id: 'ai-config',
    label: 'Inteligência Artificial',
    icon: <SmartToyIcon />,
    path: '/dashboard/settings/ai-config',
    description: 'Comportamento e personalidade da Sofia',
  },
  {
    id: 'profile',
    label: 'Perfil',
    icon: <PersonIcon />,
    path: '/dashboard/settings/profile',
    description: 'Informações pessoais e senha',
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
              {section.id === 'ai-config' && (
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
          <strong>Dica:</strong> Configure a Sofia e a conexão do WhatsApp
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Mobile Menu Button - Fixed at bottom for better thumb reach */}
      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.drawer + 2,
            display: { xs: 'flex', md: 'none' },
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            p: 2,
            gap: 1,
          }}
        >
          <Button
            fullWidth
            variant="contained"
            startIcon={<MenuIcon />}
            onClick={handleDrawerToggle}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              borderRadius: 2,
              py: 1.5,
              fontWeight: 600,
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            Menu de Configurações
          </Button>
        </Box>
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
            p: { xs: 1.5, md: 3 },
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box>
            <Breadcrumbs separator="›" sx={{ mb: 0.5, fontSize: { xs: '0.875rem', md: '1rem' } }}>
              <Link
                href="/dashboard"
                underline="hover"
                color="text.secondary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  cursor: 'pointer',
                  fontSize: { xs: '0.875rem', md: '1rem' },
                }}
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/dashboard');
                }}
              >
                <DashboardIcon fontSize="small" />
                <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Dashboard</Box>
              </Link>
              <Typography
                color="primary"
                fontWeight={600}
                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
              >
                Configurações
              </Typography>
            </Breadcrumbs>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: { xs: '0.75rem', md: '0.875rem' },
                display: { xs: 'none', sm: 'block' },
              }}
            >
              {SETTINGS_SECTIONS.find((s) => s.path === pathname)?.description ||
                'Gerencie as configurações do sistema'}
            </Typography>

            {/* Mobile: Show current section title */}
            <Typography
              variant="h6"
              fontWeight={600}
              sx={{
                display: { xs: 'block', sm: 'none' },
                mt: 1,
                fontSize: '1rem',
              }}
            >
              {SETTINGS_SECTIONS.find((s) => s.path === pathname)?.label || 'Configurações'}
            </Typography>
          </Box>
        </Paper>

        {/* Content Area */}
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            pb: { xs: 10, md: 4 }, // Extra padding at bottom for mobile menu button
            width: '100%',
            overflowY: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
