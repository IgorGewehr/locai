'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Avatar,
  Divider,
  Chip,
  Tooltip,
  useTheme,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Dashboard,
  Home,
  CalendarMonth,
  People,
  Chat,
  AccountBalance,
  Settings,
  HelpOutline,
  Receipt,
  NotificationsActive,
  Assessment,
  Language,
  GroupWork,
  Event,
  Schedule,
  ExpandMore,
  Logout,
  KeyboardArrowDown,
  WhatsApp,
  Circle,
} from '@mui/icons-material';

interface NavigationItem {
  text: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  submenu?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    text: 'Dashboard',
    href: '/dashboard',
    icon: <Dashboard sx={{ fontSize: 20 }} />,
  },
  {
    text: 'Propriedades',
    href: '/dashboard/properties',
    icon: <Home sx={{ fontSize: 20 }} />,
  },
  {
    text: 'Reservas',
    href: '/dashboard/reservations',
    icon: <CalendarMonth sx={{ fontSize: 20 }} />,
  },
  {
    text: 'Agenda',
    href: '/dashboard/agenda',
    icon: <Event sx={{ fontSize: 20 }} />,
    submenu: [
      {
        text: 'Visão Geral',
        href: '/dashboard/agenda/visao-geral',
        icon: <Event sx={{ fontSize: 18 }} />,
      },
      {
        text: 'Visitas',
        href: '/dashboard/agenda/visitas',
        icon: <Schedule sx={{ fontSize: 18 }} />,
      },
    ],
  },
  {
    text: 'CRM',
    href: '/dashboard/crm',
    icon: <GroupWork sx={{ fontSize: 20 }} />,
  },
  {
    text: 'Financeiro',
    href: '/dashboard/financeiro',
    icon: <AccountBalance sx={{ fontSize: 20 }} />,
    submenu: [
      {
        text: 'Visão Geral',
        href: '/dashboard/financeiro',
        icon: <Assessment sx={{ fontSize: 18 }} />,
      },
      {
        text: 'Transações',
        href: '/dashboard/financeiro/transacoes',
        icon: <Receipt sx={{ fontSize: 18 }} />,
      },
      {
        text: 'Cobranças',
        href: '/dashboard/financeiro/cobrancas',
        icon: <NotificationsActive sx={{ fontSize: 18 }} />,
      },
    ],
  },
];

interface TopAppBarProps {
  onLogout?: () => void;
}

export default function TopAppBar({ onLogout }: TopAppBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  // Check WhatsApp status
  useEffect(() => {
    const checkWhatsAppStatus = async () => {
      try {
        const response = await fetch('/api/whatsapp/session');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setWhatsappStatus(data.data.connected ? 'connected' : 'disconnected');
          }
        }
      } catch (error) {
        console.error('Error checking WhatsApp status:', error);
        setWhatsappStatus('disconnected');
      }
    };

    checkWhatsAppStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkWhatsAppStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getWhatsAppStatusColor = () => {
    switch (whatsappStatus) {
      case 'connected':
        return '#22c55e';
      case 'connecting':
        return '#f59e0b';
      default:
        return '#ef4444';
    }
  };

  const getWhatsAppStatusText = () => {
    switch (whatsappStatus) {
      case 'connected':
        return 'WhatsApp Conectado';
      case 'connecting':
        return 'Conectando...';
      default:
        return 'WhatsApp Desconectado';
    }
  };

  const handleNavClick = (item: NavigationItem) => {
    if (item.submenu) {
      setActiveSubmenu(activeSubmenu === item.text ? null : item.text);
    } else {
      router.push(item.href);
      setActiveSubmenu(null);
    }
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

  const isActive = (href: string) => pathname === href;
  const isParentActive = (item: NavigationItem) => {
    if (pathname === item.href) return true;
    if (item.submenu) {
      return item.submenu.some(sub => pathname === sub.href);
    }
    return false;
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Box sx={{ px: 3, py: 1 }}>
        {/* Main Navigation Row */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, sm: 2, md: 3, lg: 4 },
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                boxShadow: '0 4px 16px rgba(6, 182, 212, 0.3)',
              }}
            >
              🏠
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: 'white',
                fontSize: '1.125rem',
              }}
            >
              LocAI
            </Typography>
          </Box>

          {/* Navigation Items */}
          <Box sx={{ 
            display: { xs: 'none', md: 'flex' }, 
            alignItems: 'center', 
            gap: 1, 
            flex: 1 
          }}>
            {navigationItems.map((item) => (
              <Box key={item.href} sx={{ position: 'relative' }}>
                <Button
                  onClick={() => handleNavClick(item)}
                  startIcon={item.icon}
                  endIcon={item.submenu ? <KeyboardArrowDown sx={{ fontSize: 16 }} /> : null}
                  sx={{
                    color: isParentActive(item) ? '#06b6d4' : 'rgba(255, 255, 255, 0.8)',
                    backgroundColor: isParentActive(item) 
                      ? 'rgba(6, 182, 212, 0.1)' 
                      : 'transparent',
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    fontSize: '0.875rem',
                    fontWeight: isParentActive(item) ? 600 : 500,
                    textTransform: 'none',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: isParentActive(item)
                        ? 'rgba(6, 182, 212, 0.15)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: isParentActive(item) ? '#06b6d4' : 'white',
                    },
                    '& .MuiButton-startIcon': {
                      marginRight: 1,
                    },
                  }}
                >
                  {item.text}
                  {item.badge && (
                    <Chip
                      label={item.badge}
                      size="small"
                      sx={{
                        ml: 1,
                        height: 20,
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        bgcolor: '#22c55e',
                        color: 'white',
                      }}
                    />
                  )}
                </Button>

                {/* Submenu */}
                {item.submenu && (
                  <Collapse in={activeSubmenu === item.text}>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        mt: 0.5,
                        minWidth: 200,
                        background: 'rgba(30, 41, 59, 0.98)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 2,
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                        overflow: 'hidden',
                        zIndex: 1000,
                      }}
                    >
                      {item.submenu.map((subItem) => (
                        <ListItemButton
                          key={subItem.href}
                          onClick={() => {
                            router.push(subItem.href);
                            setActiveSubmenu(null);
                          }}
                          selected={pathname === subItem.href}
                          sx={{
                            py: 1.5,
                            px: 2,
                            '&:hover': {
                              backgroundColor: 'rgba(6, 182, 212, 0.1)',
                            },
                            '&.Mui-selected': {
                              backgroundColor: 'rgba(6, 182, 212, 0.15)',
                              '&:hover': {
                                backgroundColor: 'rgba(6, 182, 212, 0.2)',
                              },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36, color: 'rgba(255, 255, 255, 0.7)' }}>
                            {subItem.icon}
                          </ListItemIcon>
                          <ListItemText 
                            primary={subItem.text}
                            primaryTypographyProps={{
                              fontSize: '0.875rem',
                              color: pathname === subItem.href ? '#06b6d4' : 'rgba(255, 255, 255, 0.9)',
                            }}
                          />
                        </ListItemButton>
                      ))}
                    </Box>
                  </Collapse>
                )}
              </Box>
            ))}
          </Box>

          {/* Right Side Actions */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 0.5, sm: 1, md: 2 },
            marginLeft: 'auto',
          }}>
            {/* WhatsApp Status */}
            <Tooltip title={getWhatsAppStatusText()}>
              <Button
                onClick={() => router.push('/dashboard/settings')}
                startIcon={<WhatsApp sx={{ display: { xs: 'none', sm: 'block' } }} />}
                endIcon={
                  <Circle 
                    sx={{ 
                      fontSize: 8, 
                      color: getWhatsAppStatusColor(),
                      filter: 'drop-shadow(0 0 4px currentColor)',
                    }} 
                  />
                }
                sx={{
                  color: whatsappStatus === 'connected' ? '#22c55e' : 'rgba(255, 255, 255, 0.8)',
                  backgroundColor: whatsappStatus === 'connected' 
                    ? 'rgba(34, 197, 94, 0.1)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 500,
                  textTransform: 'none',
                  transition: 'all 0.2s',
                  minWidth: { xs: 'auto', sm: 'unset' },
                  '&:hover': {
                    backgroundColor: whatsappStatus === 'connected'
                      ? 'rgba(34, 197, 94, 0.15)'
                      : 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>WhatsApp</Box>
              </Button>
            </Tooltip>

            {/* Mini-Site */}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Tooltip title="Mini-Site">
                <IconButton
                  onClick={() => router.push('/dashboard/mini-site')}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                >
                  <Language />
                </IconButton>
              </Tooltip>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.2)', display: { xs: 'none', sm: 'block' } }} />

            {/* Profile */}
            <Button
              onClick={handleProfileMenuOpen}
              startIcon={
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'rgba(6, 182, 212, 0.2)',
                    color: '#06b6d4',
                    border: '2px solid rgba(6, 182, 212, 0.3)',
                  }}
                >
                  {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
              }
              endIcon={<ExpandMore sx={{ display: { xs: 'none', sm: 'block' } }} />}
              sx={{
                color: 'white',
                textTransform: 'none',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                minWidth: { xs: 'auto', sm: 'unset' },
                padding: { xs: 0.5, sm: 1 },
              }}
            >
              <Box sx={{ 
                textAlign: 'left',
                display: { xs: 'none', sm: 'block' },
                maxWidth: { sm: 150, md: 200 },
                overflow: 'hidden',
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    lineHeight: 1,
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                >
                  {user?.displayName || user?.email?.split('@')[0] || 'Usuário'}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.6)',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                >
                  {user?.email || 'Admin'}
                </Typography>
              </Box>
            </Button>

            <Menu
              anchorEl={profileAnchorEl}
              open={Boolean(profileAnchorEl)}
              onClose={handleProfileMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  background: 'rgba(30, 41, 59, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  minWidth: 200,
                },
              }}
            >
              <MenuItem onClick={() => {
                router.push('/dashboard/settings');
                handleProfileMenuClose();
              }}>
                <ListItemIcon>
                  <Settings fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                </ListItemIcon>
                <ListItemText primary="Configurações" />
              </MenuItem>
              <MenuItem onClick={() => {
                router.push('/dashboard/help');
                handleProfileMenuClose();
              }}>
                <ListItemIcon>
                  <HelpOutline fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                </ListItemIcon>
                <ListItemText primary="Ajuda" />
              </MenuItem>
              <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
              <MenuItem onClick={() => {
                handleProfileMenuClose();
                onLogout?.();
              }}>
                <ListItemIcon>
                  <Logout fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                </ListItemIcon>
                <ListItemText primary="Sair" />
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Box>
    </AppBar>
  );
}