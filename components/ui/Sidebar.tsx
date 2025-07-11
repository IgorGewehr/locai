'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';
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
    text: 'Financeiro',
    href: '/dashboard/analytics',
    icon: <AccountBalance />,
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

  const drawerContent = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.paper',
    }}>
      <Toolbar sx={{ minHeight: 64, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.875rem',
            }}
          >
            LP
          </Box>
          <Box>
            <Typography 
              variant="subtitle1" 
              fontWeight={600} 
              sx={{ 
                lineHeight: 1,
                color: 'text.primary',
              }}
            >
              Locai Pro
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                fontSize: '0.75rem',
              }}
            >
              Gestão Imobiliária
            </Typography>
          </Box>
        </Box>
      </Toolbar>

      <Divider />

      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        <List sx={{ px: 2 }}>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={pathname === item.href}
              onClick={isMobile ? onClose : undefined}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                minHeight: 44,
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
                  minWidth: 40,
                  color: pathname === item.href ? 'inherit' : 'text.secondary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: pathname === item.href ? 600 : 400,
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
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
                minHeight: 44,
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
                  minWidth: 40,
                  color: 'text.secondary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: pathname === item.href ? 600 : 400,
                }}
              />
            </ListItemButton>
          ))}
        </List>

        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TrendingUp sx={{ fontSize: 20, color: 'success.main' }} />
            <Typography variant="body2" fontWeight={600}>
              Plano Pro
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Ilimitado até 31/12/2024
          </Typography>
        </Box>
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