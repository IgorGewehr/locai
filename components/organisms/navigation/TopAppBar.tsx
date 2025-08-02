'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
// import { SimpleThemeToggle } from '@/components/atoms/SimpleThemeToggle/SimpleThemeToggle';
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
  useMediaQuery,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Drawer,
  Paper,
  Badge,
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
  Menu as MenuIcon,
  Close,
  ChevronRight,
} from '@mui/icons-material';

// 🧪 DESENVOLVIMENTO: Item de teste restaurado

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
    text: 'Clientes',
    href: '/dashboard/clients',
    icon: <People sx={{ fontSize: 20 }} />,
  },
  {
    text: 'Teste IA',
    href: '/dashboard/ai-testing',
    icon: <Chat sx={{ fontSize: 20 }} />,
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
  {
    text: 'Métricas',
    href: '/dashboard/metrics',
    icon: <Assessment sx={{ fontSize: 20 }} />,
  },
];

interface TopAppBarProps {
  onLogout?: () => void;
}

export default function TopAppBar({ onLogout }: TopAppBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [submenuAnchorEl, setSubmenuAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});
  const [whatsappStatus, setWhatsappStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  
  // Mobile drawer states
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

  // Close dropdown when pathname changes
  useEffect(() => {
    setActiveSubmenu(null);
    setSubmenuAnchorEl({});
  }, [pathname]);

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

  const handleNavClick = (item: NavigationItem, event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (item.submenu) {
      const newSubmenu = activeSubmenu === item.text ? null : item.text;
      setActiveSubmenu(newSubmenu);
      setSubmenuAnchorEl({ ...submenuAnchorEl, [item.text]: newSubmenu ? event.currentTarget : null });
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

  // Mobile drawer functions
  const handleMobileDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleMobileNavClick = (item: NavigationItem) => {
    if (item.submenu) {
      setExpandedItems(prev => ({
        ...prev,
        [item.text]: !prev[item.text]
      }));
    } else {
      router.push(item.href);
      setMobileDrawerOpen(false);
      setExpandedItems({});
    }
  };

  const handleMobileSubNavClick = (item: NavigationItem) => {
    router.push(item.href);
    setMobileDrawerOpen(false);
    setExpandedItems({});
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
        zIndex: (theme) => theme.zIndex.appBar + 1,
      }}
    >
      <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 0.75, sm: 1 } }}>
        {/* Main Navigation Row */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, sm: 2, md: 3, lg: 4 },
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
          minHeight: { xs: 56, sm: 64 },
        }}>
          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              onClick={handleMobileDrawerToggle}
              sx={{
                color: 'white',
                mr: 1,
                p: 1,
              }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 1, sm: 1.5 },
            flexShrink: 0,
          }}>
            <Box
              sx={{
                width: { xs: 32, sm: 36 },
                height: { xs: 32, sm: 36 },
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(6, 182, 212, 0.3)',
                overflow: 'hidden',
              }}
            >
              <img 
                src="/logo.jpg" 
                alt="LocAI Logo" 
                width={32} 
                height={32}
                style={{ 
                  borderRadius: 8,
                  objectFit: 'cover',
                  width: '100%',
                  height: '100%'
                }}
              />
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: 'white',
                fontSize: { xs: '1rem', sm: '1.125rem' },
                display: { xs: 'none', sm: 'block' },
              }}
            >
              LocAI
            </Typography>
          </Box>

          {/* Navigation Items */}
          <Box sx={{ 
            display: { xs: 'none', lg: 'flex' }, 
            alignItems: 'center', 
            gap: 1, 
            flex: 1 
          }}>
            {navigationItems.map((item) => (
              <Box key={item.href} sx={{ position: 'relative' }}>
                <Button
                  onClick={(e) => handleNavClick(item, e)}
                  startIcon={item.icon}
                  endIcon={item.submenu ? <KeyboardArrowDown sx={{ fontSize: 16 }} /> : null}
                  sx={{
                    color: isParentActive(item) ? '#06b6d4' : 'rgba(255, 255, 255, 0.8)',
                    backgroundColor: isParentActive(item) 
                      ? 'rgba(6, 182, 212, 0.1)' 
                      : 'transparent',
                    borderRadius: 2,
                    px: { xs: 1.5, lg: 2 },
                    py: 1,
                    fontSize: { xs: '0.8rem', lg: '0.875rem' },
                    fontWeight: isParentActive(item) ? 600 : 500,
                    textTransform: 'none',
                    minWidth: 'unset',
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
                  <Box component="span" sx={{ display: { xs: 'none', xl: 'inline' } }}>
                    {item.text}
                  </Box>
                  {item.badge && (
                    <Chip
                      label={item.badge}
                      size="small"
                      sx={{
                        ml: { xs: 0, xl: 1 },
                        height: 20,
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        bgcolor: '#22c55e',
                        color: 'white',
                      }}
                    />
                  )}
                </Button>

                {/* Submenu usando Menu do MUI */}
                {item.submenu && (
                  <Menu
                    anchorEl={submenuAnchorEl[item.text]}
                    open={activeSubmenu === item.text}
                    onClose={() => {
                      setActiveSubmenu(null);
                      setSubmenuAnchorEl({ ...submenuAnchorEl, [item.text]: null });
                    }}
                    PaperProps={{
                      sx: {
                        mt: 0.5,
                        minWidth: 220,
                        background: 'rgba(30, 41, 59, 0.98)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                        overflow: 'hidden',
                      },
                    }}
                    transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                    sx={{
                      '& .MuiPaper-root': {
                        backgroundColor: 'transparent',
                      },
                    }}
                  >
                    {item.submenu.map((subItem) => (
                      <MenuItem
                        key={subItem.href}
                        onClick={() => {
                          router.push(subItem.href);
                          setActiveSubmenu(null);
                          setSubmenuAnchorEl({ ...submenuAnchorEl, [item.text]: null });
                        }}
                        selected={pathname === subItem.href}
                        sx={{
                          py: 1.5,
                          px: 2,
                          minHeight: 48,
                          color: pathname === subItem.href ? '#06b6d4' : 'rgba(255, 255, 255, 0.9)',
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
                            fontWeight: pathname === subItem.href ? 600 : 500,
                          }}
                        />
                      </MenuItem>
                    ))}
                  </Menu>
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
            flexShrink: 0,
          }}>
            {/* WhatsApp Status */}
            <Tooltip title={getWhatsAppStatusText()}>
              <Button
                onClick={() => router.push('/dashboard/settings')}
                startIcon={
                  <WhatsApp sx={{ 
                    fontSize: { xs: 18, sm: 20 },
                    display: { xs: 'block', sm: 'block' }
                  }} />
                }
                endIcon={
                  <Circle 
                    sx={{ 
                      fontSize: { xs: 6, sm: 8 }, 
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
                  px: { xs: 1, sm: 2 },
                  py: { xs: 0.75, sm: 1 },
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
                <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>WhatsApp</Box>
              </Button>
            </Tooltip>

            {/* Mini-Site */}
            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
              <Tooltip title="Mini-Site">
                <IconButton
                  onClick={() => router.push('/dashboard/mini-site')}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                    p: { xs: 1, sm: 1.25 },
                  }}
                >
                  <Language sx={{ fontSize: { xs: 18, sm: 20 } }} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Theme Toggle - Disabled due to hydration issues */}
            {/* <SimpleThemeToggle /> */}
            
            <Divider 
              orientation="vertical" 
              flexItem 
              sx={{ 
                borderColor: 'rgba(255, 255, 255, 0.2)', 
                display: { xs: 'none', lg: 'block' },
                height: { sm: 32, md: 40 },
                alignSelf: 'center',
              }} 
            />

            {/* Profile */}
            <Button
              onClick={handleProfileMenuOpen}
              startIcon={
                <Avatar
                  sx={{
                    width: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 },
                    bgcolor: 'rgba(6, 182, 212, 0.2)',
                    color: '#06b6d4',
                    border: '2px solid rgba(6, 182, 212, 0.3)',
                    fontSize: { xs: '0.75rem', sm: '1rem' },
                  }}
                >
                  {'U'}
                </Avatar>
              }
              endIcon={<ExpandMore sx={{ 
                display: { xs: 'none', md: 'block' },
                fontSize: { sm: 18, md: 20 },
              }} />}
              sx={{
                color: 'white',
                textTransform: 'none',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                minWidth: { xs: 'auto', sm: 'unset' },
                padding: { xs: 0.5, sm: 1 },
                borderRadius: 2,
              }}
            >
              <Box sx={{ 
                textAlign: 'left',
                display: { xs: 'none', md: 'block' },
                maxWidth: { md: 120, lg: 160, xl: 200 },
                overflow: 'hidden',
                ml: 1,
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    lineHeight: 1,
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    fontSize: { md: '0.8rem', lg: '0.875rem' },
                  }}
                >
                  {user?.displayName || user?.email || 'Usuário'}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.6)',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    fontSize: { md: '0.65rem', lg: '0.75rem' },
                  }}
                >
                  {user?.email || 'user@example.com'}
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
                  borderRadius: 2,
                  minWidth: { xs: 180, sm: 200 },
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => {
                router.push('/dashboard/settings');
                handleProfileMenuClose();
              }} sx={{ 
                py: { xs: 1.5, sm: 1 },
                px: { xs: 2, sm: 1.5 },
                minHeight: { xs: 48, sm: 44 },
                '&:hover': {
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                },
              }}>
                <ListItemIcon sx={{ minWidth: { xs: 36, sm: 32 } }}>
                  <Settings 
                    fontSize="small" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: { xs: 18, sm: 16 },
                    }} 
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Configurações"
                  primaryTypographyProps={{
                    fontSize: { xs: '0.875rem', sm: '0.8rem' },
                    fontWeight: 500,
                  }}
                />
              </MenuItem>
              <MenuItem onClick={() => {
                router.push('/dashboard/help');
                handleProfileMenuClose();
              }} sx={{ 
                py: { xs: 1.5, sm: 1 },
                px: { xs: 2, sm: 1.5 },
                minHeight: { xs: 48, sm: 44 },
                '&:hover': {
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                },
              }}>
                <ListItemIcon sx={{ minWidth: { xs: 36, sm: 32 } }}>
                  <HelpOutline 
                    fontSize="small" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: { xs: 18, sm: 16 },
                    }} 
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Ajuda"
                  primaryTypographyProps={{
                    fontSize: { xs: '0.875rem', sm: '0.8rem' },
                    fontWeight: 500,
                  }}
                />
              </MenuItem>
              <Divider sx={{ 
                borderColor: 'rgba(255, 255, 255, 0.1)',
                my: { xs: 0.5, sm: 0 },
              }} />
              <MenuItem onClick={() => {
                handleProfileMenuClose();
                onLogout?.();
              }} sx={{ 
                py: { xs: 1.5, sm: 1 },
                px: { xs: 2, sm: 1.5 },
                minHeight: { xs: 48, sm: 44 },
                '&:hover': {
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                },
              }}>
                <ListItemIcon sx={{ minWidth: { xs: 36, sm: 32 } }}>
                  <Logout 
                    fontSize="small" 
                    sx={{ 
                      color: 'rgba(239, 68, 68, 0.8)',
                      fontSize: { xs: 18, sm: 16 },
                    }} 
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Sair"
                  primaryTypographyProps={{
                    fontSize: { xs: '0.875rem', sm: '0.8rem' },
                    fontWeight: 500,
                    color: 'rgba(239, 68, 68, 0.9)',
                  }}
                />
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Box>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={handleMobileDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        PaperProps={{
          sx: {
            width: 280,
            background: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(20px)',
            border: 'none',
          }
        }}
      >
        {/* Drawer Header */}
        <Box sx={{ 
          p: 3, 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(6, 182, 212, 0.3)',
                overflow: 'hidden',
              }}
            >
              <img 
                src="/logo.jpg" 
                alt="LocAI Logo" 
                width={28} 
                height={28}
                style={{ 
                  borderRadius: 6,
                  objectFit: 'cover',
                  width: '100%',
                  height: '100%'
                }}
              />
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
          <IconButton 
            onClick={handleMobileDrawerToggle}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            <Close />
          </IconButton>
        </Box>

        {/* User Profile Section */}
        <Box sx={{ 
          p: 3, 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'rgba(6, 182, 212, 0.2)',
              color: '#06b6d4',
              border: '2px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            {'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 600, 
                color: 'white',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {user?.displayName || user?.email || 'Usuário'}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.6)',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {user?.email || 'user@example.com'}
            </Typography>
          </Box>
        </Box>

        {/* WhatsApp Status */}
        <Box sx={{ 
          p: 2, 
          mx: 2,
          mt: 2,
          borderRadius: 2,
          background: whatsappStatus === 'connected' 
            ? 'rgba(34, 197, 94, 0.1)' 
            : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${whatsappStatus === 'connected' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}>
          <WhatsApp sx={{ 
            color: whatsappStatus === 'connected' ? '#22c55e' : '#ef4444',
            fontSize: 20,
          }} />
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 600, 
                color: whatsappStatus === 'connected' ? '#22c55e' : '#ef4444',
                fontSize: '0.875rem',
              }}
            >
              {getWhatsAppStatusText()}
            </Typography>
          </Box>
          <Circle 
            sx={{ 
              fontSize: 8, 
              color: getWhatsAppStatusColor(),
              filter: 'drop-shadow(0 0 4px currentColor)',
            }} 
          />
        </Box>

        {/* Navigation Items */}
        <List sx={{ flex: 1, p: 2 }}>
          {navigationItems.map((item) => (
            <Box key={item.href}>
              <ListItemButton
                onClick={() => handleMobileNavClick(item)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  py: 1.5,
                  px: 2,
                  background: isParentActive(item) ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                  '&:hover': {
                    background: 'rgba(6, 182, 212, 0.05)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isParentActive(item) ? '#06b6d4' : 'rgba(255, 255, 255, 0.7)' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isParentActive(item) ? 600 : 500,
                    color: isParentActive(item) ? '#06b6d4' : 'white',
                    fontSize: '0.9rem',
                  }}
                />
                {item.badge && (
                  <Chip
                    label={item.badge}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      bgcolor: '#22c55e',
                      color: 'white',
                      ml: 1,
                    }}
                  />
                )}
                {item.submenu && (
                  <ChevronRight 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.5)',
                      transform: expandedItems[item.text] ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }} 
                  />
                )}
              </ListItemButton>
              
              {/* Submenu */}
              {item.submenu && (
                <Collapse in={expandedItems[item.text]} timeout="auto" unmountOnExit>
                  <List sx={{ pl: 2 }}>
                    {item.submenu.map((subItem) => (
                      <ListItemButton
                        key={subItem.href}
                        onClick={() => handleMobileSubNavClick(subItem)}
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          py: 1,
                          px: 2,
                          ml: 2,
                          background: isActive(subItem.href) ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                          '&:hover': {
                            background: 'rgba(6, 182, 212, 0.08)',
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36, color: isActive(subItem.href) ? '#06b6d4' : 'rgba(255, 255, 255, 0.6)' }}>
                          {subItem.icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={subItem.text}
                          primaryTypographyProps={{
                            fontWeight: isActive(subItem.href) ? 600 : 500,
                            color: isActive(subItem.href) ? '#06b6d4' : 'rgba(255, 255, 255, 0.8)',
                            fontSize: '0.85rem',
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              )}
            </Box>
          ))}
        </List>

        {/* Bottom Actions */}
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <ListItemButton
            onClick={() => {
              router.push('/dashboard/settings');
              setMobileDrawerOpen(false);
            }}
            sx={{
              borderRadius: 2,
              mb: 1,
              py: 1.5,
              px: 2,
              '&:hover': {
                background: 'rgba(6, 182, 212, 0.05)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'rgba(255, 255, 255, 0.7)' }}>
              <Settings />
            </ListItemIcon>
            <ListItemText 
              primary="Configurações"
              primaryTypographyProps={{
                fontWeight: 500,
                color: 'white',
                fontSize: '0.9rem',
              }}
            />
          </ListItemButton>
          
          <ListItemButton
            onClick={() => {
              setMobileDrawerOpen(false);
              onLogout?.();
            }}
            sx={{
              borderRadius: 2,
              py: 1.5,
              px: 2,
              '&:hover': {
                background: 'rgba(239, 68, 68, 0.1)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'rgba(239, 68, 68, 0.8)' }}>
              <Logout />
            </ListItemIcon>
            <ListItemText 
              primary="Sair"
              primaryTypographyProps={{
                fontWeight: 500,
                color: 'rgba(239, 68, 68, 0.9)',
                fontSize: '0.9rem',
              }}
            />
          </ListItemButton>
        </Box>
      </Drawer>
    </AppBar>
  );
}