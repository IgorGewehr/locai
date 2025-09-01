'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { scrollbarStyles } from '@/styles/scrollbarStyles';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Toolbar,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Chip,
  Collapse,
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
  TrendingUp,
  ExpandLess,
  ExpandMore,
  Receipt,
  AttachMoney,
  Campaign,
  NotificationsActive,
  Assessment,
  AccountBalanceWallet,
  Language,
  GroupWork,
  Analytics,
  AccountTree,
  Widgets,
  BugReport,
  Event,
  Schedule,
  AdminPanelSettings,
} from '@mui/icons-material';
import { useAuth } from '@/lib/hooks/useAuth';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    text: 'Dashboard',
    href: '/dashboard',
    icon: <Dashboard />,
    badge: null,
  },
  {
    text: 'Propriedades',
    href: '/dashboard/properties',
    icon: <Home />,
    badge: null,
  },
  {
    text: 'Reservas',
    href: '/dashboard/reservations',
    icon: <CalendarMonth />,
    badge: null,
  },
  {
    text: 'Agenda',
    href: '/dashboard/agenda',
    icon: <Event />,
    badge: null,
  },
  {
    text: 'Conversas',
    href: '/dashboard/conversations',
    icon: <Chat />,
    badge: null,
  },
  {
    text: 'CRM',
    href: '/dashboard/crm',
    icon: <GroupWork />,
    badge: null,
  },
  {
    text: 'Clientes',
    href: '/dashboard/clients',
    icon: <People />,
    badge: null,
  },
  {
    text: 'Teste IA',
    href: '/dashboard/ai-testing',
    icon: <Chat />,
    badge: null,
  },
  {
    text: 'Financeiro',
    href: '/dashboard/financeiro',
    icon: <AccountBalance />,
    badge: null,
    submenu: [
      {
        text: 'Visão Geral',
        href: '/dashboard/financeiro',
        icon: <Analytics />,
      },
      {
        text: 'Transações',
        href: '/dashboard/financeiro/transacoes',
        icon: <Receipt />,
      },
      {
        text: 'Cobranças',
        href: '/dashboard/financeiro/cobrancas',
        icon: <NotificationsActive />,
      },
    ],
  },
  {
    text: 'Mini-Site',
    href: '/dashboard/mini-site',
    icon: <Language />,
    badge: null,
  },
  {
    text: 'Ajuda',
    href: '/dashboard/help',
    icon: <HelpOutline />,
    badge: null,
  },
  // Teste restaurado para desenvolvimento
];

const secondaryItems = [
  {
    text: 'Configurações',
    href: '/dashboard/settings',
    icon: <Settings />,
    badge: null,
  },
];

const drawerWidth = 260;

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const { user } = useAuth();

  // Memoize menu items with conditional admin item
  const allMenuItems = useMemo(() => {
    const items = [...menuItems];
    
    // Add admin panel if user has idog flag
    if (user?.idog === true) {
      items.push({
        text: 'Admin Panel',
        href: '/dashboard/lkjhg',
        icon: <AdminPanelSettings />,
        badge: 'ADMIN',
      });
    }
    
    return items;
  }, [user?.idog]);

  const handleMenuClick = (itemText: string, hasSubmenu: boolean) => {
    if (hasSubmenu) {
      setExpandedMenu(expandedMenu === itemText ? null : itemText);
    } else if (isMobile) {
      onClose();
    }
  };

  const drawerContent = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      borderRight: '1px solid',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      boxShadow: '0 0 32px rgba(0, 0, 0, 0.2)',
    }}>
      <Toolbar sx={{ 
        minHeight: { xs: 56, md: 64 }, 
        px: { xs: 2, md: 3 },
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
      }}>
        <Box 
          component={Link}
          href="/dashboard"
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5,
            textDecoration: 'none',
            cursor: 'pointer',
            borderRadius: 2,
            p: 1,
            mx: -1,
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'scale(1.02)',
              bgcolor: 'rgba(255, 255, 255, 0.05)',
            }
          }}
        >
          <Box
            component="img"
            src="/logo.jpg"
            alt="AlugaZap"
            sx={{
              width: { xs: 36, md: 40 },
              height: { xs: 36, md: 40 },
              borderRadius: 2,
              objectFit: 'contain',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)',
            }}
          />
          <Box>
            <Typography 
              variant="subtitle1" 
              fontWeight={700} 
              sx={{ 
                lineHeight: 1,
                color: 'white',
                fontSize: { xs: '1rem', md: '1.125rem' },
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
              }}
            >
              AlugaZap
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: { xs: '0.75rem', md: '0.813rem' },
                fontWeight: 500,
              }}
            >
              Gestão Imobiliária
            </Typography>
          </Box>
        </Box>
      </Toolbar>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        py: 2,
        // Scrollbar invisível mas funcional
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        '-ms-overflow-style': 'none',
        'scrollbar-width': 'none',
      }}>
        <List sx={{ px: { xs: 1.5, md: 2 } }}>
          {allMenuItems.map((item) => (
            <Box key={item.href}>
              <ListItemButton
                component={item.submenu ? 'div' : Link}
                href={!item.submenu ? item.href : undefined}
                selected={pathname === item.href || item.submenu?.some(sub => pathname === sub.href)}
                onClick={() => handleMenuClick(item.text, !!item.submenu)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  minHeight: { xs: 52, md: 56 },
                  px: { xs: 2, md: 2.5 },
                  mx: 0.5,
                  background: 'transparent',
                  border: '1px solid transparent',
                  color: 'rgba(255, 255, 255, 0.8)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(8, 145, 178, 0.12) 100%)',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    transform: 'translateX(2px)',
                    boxShadow: '0 4px 16px rgba(6, 182, 212, 0.15)',
                    color: 'rgba(255, 255, 255, 0.95)',
                  },
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
                      transform: 'translateX(4px)',
                      boxShadow: '0 6px 24px rgba(6, 182, 212, 0.4)',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: { xs: 40, md: 44 },
                    color: (pathname === item.href || item.submenu?.some(sub => pathname === sub.href)) ? 'inherit' : 'rgba(255, 255, 255, 0.6)',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: { xs: '0.875rem', md: '0.9rem' },
                    fontWeight: (pathname === item.href || item.submenu?.some(sub => pathname === sub.href)) ? 600 : 500,
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
                      bgcolor: item.badge === 'ADMIN' ? '#dc2626' : '#22c55e',
                      color: 'white',
                      boxShadow: item.badge === 'ADMIN' ? '0 2px 8px rgba(220, 38, 38, 0.3)' : '0 2px 8px rgba(34, 197, 94, 0.3)',
                      '& .MuiChip-label': {
                        px: 1,
                      },
                    }}
                  />
                )}
                {item.submenu && (
                  expandedMenu === item.text ? <ExpandLess sx={{ fontSize: { xs: 20, md: 24 } }} /> : <ExpandMore sx={{ fontSize: { xs: 20, md: 24 } }} />
                )}
              </ListItemButton>
              {item.submenu && (
                <Collapse in={expandedMenu === item.text} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl: 2 }}>
                    {item.submenu.map((subItem) => (
                      <ListItemButton
                        key={subItem.href}
                        component={Link}
                        href={subItem.href}
                        selected={pathname === subItem.href}
                        onClick={isMobile ? onClose : undefined}
                        sx={{
                          borderRadius: 1.5,
                          mb: 0.5,
                          minHeight: { xs: 44, md: 48 },
                          px: { xs: 1.5, md: 2 },
                          mx: 0.5,
                          color: 'rgba(255, 255, 255, 0.7)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(8, 145, 178, 0.08) 100%)',
                            transform: 'translateX(2px)',
                            boxShadow: '0 2px 8px rgba(6, 182, 212, 0.1)',
                            color: 'rgba(255, 255, 255, 0.9)',
                          },
                          '&.Mui-selected': {
                            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.15) 100%)',
                            color: '#67e8f9',
                            border: '1px solid rgba(6, 182, 212, 0.3)',
                            boxShadow: '0 3px 12px rgba(6, 182, 212, 0.2)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(8, 145, 178, 0.2) 100%)',
                              transform: 'translateX(4px)',
                              boxShadow: '0 4px 16px rgba(6, 182, 212, 0.25)',
                            },
                            '& .MuiListItemIcon-root': {
                              color: '#67e8f9',
                            },
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: { xs: 32, md: 36 },
                            color: pathname === subItem.href ? '#67e8f9' : 'rgba(255, 255, 255, 0.5)',
                          }}
                        >
                          {subItem.icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={subItem.text}
                          primaryTypographyProps={{
                            fontSize: { xs: '0.813rem', md: '0.875rem' },
                            fontWeight: pathname === subItem.href ? 600 : 500,
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
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      <Box sx={{ p: { xs: 1.5, md: 2 } }}>
        <List>
          {secondaryItems.map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={pathname === item.href}
              onClick={isMobile ? onClose : undefined}
              sx={{
                borderRadius: 2,
                mb: 1,
                minHeight: { xs: 48, md: 52 },
                px: { xs: 1.5, md: 2 },
                mx: 0.5,
                color: 'rgba(255, 255, 255, 0.7)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.08) 0%, rgba(203, 213, 225, 0.08) 100%)',
                  transform: 'translateX(2px)',
                  boxShadow: '0 2px 8px rgba(148, 163, 184, 0.1)',
                  color: 'rgba(255, 255, 255, 0.9)',
                },
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.15) 0%, rgba(203, 213, 225, 0.15) 100%)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  boxShadow: '0 2px 8px rgba(148, 163, 184, 0.15)',
                  '& .MuiListItemIcon-root': {
                    color: '#cbd5e1',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: { xs: 36, md: 40 },
                  color: pathname === item.href ? '#cbd5e1' : 'rgba(255, 255, 255, 0.5)',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: { xs: '0.813rem', md: '0.875rem' },
                  fontWeight: pathname === item.href ? 600 : 500,
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
                    bgcolor: '#f59e0b',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                    '& .MuiChip-label': {
                      px: 1,
                    },
                  }}
                />
              )}
            </ListItemButton>
          ))}
        </List>

      </Box>
    </Box>
  );

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: 1,
          borderColor: 'divider',
          position: 'fixed',
          top: 0,
          height: '100vh',
          zIndex: theme.zIndex.drawer + 1,
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}