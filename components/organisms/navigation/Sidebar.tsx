'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState } from 'react';
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
} from '@mui/icons-material';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    text: 'Dashboard',
    href: '/dashboard',
    icon: <Dashboard />,
  },
  {
    text: 'Propriedades',
    href: '/dashboard/properties',
    icon: <Home />,
  },
  {
    text: 'Reservas',
    href: '/dashboard/reservations',
    icon: <CalendarMonth />,
  },
  {
    text: 'Clientes',
    href: '/dashboard/clients',
    icon: <People />,
  },
  {
    text: 'Conversas',
    href: '/dashboard/conversations',
    icon: <Chat />,
  },
  {
    text: 'Mini-Site',
    href: '/dashboard/mini-site',
    icon: <Language />,
  },
  {
    text: 'Financeiro',
    href: '/dashboard/financeiro',
    icon: <AccountBalance />,
    submenu: [
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
      {
        text: 'Relatórios',
        href: '/dashboard/financeiro/relatorios',
        icon: <Assessment />,
      },
    ],
  },
];

const secondaryItems = [
  {
    text: 'Configurações',
    href: '/dashboard/settings',
    icon: <Settings />,
  },
  {
    text: 'Ajuda',
    href: '/dashboard/help',
    icon: <HelpOutline />,
  },
];

const drawerWidth = 260;

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

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
      bgcolor: 'background.paper',
    }}>
      <Toolbar sx={{ minHeight: { xs: 56, md: 64 }, px: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: { xs: 32, md: 36 },
              height: { xs: 32, md: 36 },
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: { xs: '0.75rem', md: '0.875rem' },
            }}
          >
🏠
          </Box>
          <Box>
            <Typography 
              variant="subtitle1" 
              fontWeight={600} 
              sx={{ 
                lineHeight: 1,
                color: 'text.primary',
                fontSize: { xs: '0.9rem', md: '1rem' },
              }}
            >
              LocAI
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                fontSize: { xs: '0.7rem', md: '0.75rem' },
              }}
            >
              Gestão Imobiliária
            </Typography>
          </Box>
        </Box>
      </Toolbar>

      <Divider />

      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        <List sx={{ px: { xs: 1.5, md: 2 } }}>
          {menuItems.map((item) => (
            <Box key={item.href}>
              <ListItemButton
                component={item.submenu ? 'div' : Link}
                href={!item.submenu ? item.href : undefined}
                selected={pathname === item.href || item.submenu?.some(sub => pathname === sub.href)}
                onClick={() => handleMenuClick(item.text, !!item.submenu)}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  minHeight: { xs: 48, md: 52 },
                  px: { xs: 1.5, md: 2 },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: { xs: 36, md: 40 },
                    color: (pathname === item.href || item.submenu?.some(sub => pathname === sub.href)) ? 'inherit' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: { xs: '0.813rem', md: '0.875rem' },
                    fontWeight: (pathname === item.href || item.submenu?.some(sub => pathname === sub.href)) ? 600 : 400,
                  }}
                />
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
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                          '&.Mui-selected': {
                            bgcolor: 'primary.light',
                            '&:hover': {
                              bgcolor: 'primary.main',
                            },
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: { xs: 32, md: 36 },
                            color: pathname === subItem.href ? 'primary.main' : 'text.secondary',
                          }}
                        >
                          {subItem.icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={subItem.text}
                          primaryTypographyProps={{
                            fontSize: { xs: '0.75rem', md: '0.813rem' },
                            fontWeight: pathname === subItem.href ? 600 : 400,
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

      <Divider />

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
                borderRadius: 1.5,
                mb: 0.5,
                minHeight: { xs: 48, md: 52 },
                px: { xs: 1.5, md: 2 },
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: { xs: 36, md: 40 },
                  color: 'text.secondary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: { xs: '0.813rem', md: '0.875rem' },
                  fontWeight: pathname === item.href ? 600 : 400,
                }}
              />
            </ListItemButton>
          ))}
        </List>

      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
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
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}