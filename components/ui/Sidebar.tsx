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
} from '@mui/material';
import {
  Dashboard,
  Home,
  CalendarMonth,
  People,
  Chat,
  Analytics,
  Settings,
  HelpOutline,
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
    text: 'Analytics',
    href: '/dashboard/analytics',
    icon: <Analytics />,
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

  // Memoize styles to prevent unnecessary recalculations
  const selectedStyles = useMemo(() => ({
    mx: 1,
    borderRadius: 1,
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.main + '20',
      color: theme.palette.primary.main,
      '&:hover': {
        backgroundColor: theme.palette.primary.main + '30',
      },
    },
  }), [theme.palette.primary.main]);

  // Memoize menu items to prevent recreation
  const memoizedMenuItems = useMemo(() => menuItems, []);
  const memoizedSecondaryItems = useMemo(() => secondaryItems, []);

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.875rem',
            }}
          >
            AI
          </Box>
          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
            Agente Imobiliária
          </Typography>
        </Box>
      </Toolbar>

      <Divider />

      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        <List dense>
          {memoizedMenuItems.map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={pathname === item.href}
              onClick={isMobile ? onClose : undefined}
              sx={{
                ...selectedStyles,
                minHeight: 48,
                py: 1.5,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: pathname === item.href ? theme.palette.primary.main : 'text.secondary',
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.9rem',
                  fontWeight: pathname === item.href ? 600 : 400,
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Divider />

      <List dense>
        {memoizedSecondaryItems.map((item) => (
          <ListItemButton
            key={item.href}
            component={Link}
            href={item.href}
            selected={pathname === item.href}
            onClick={isMobile ? onClose : undefined}
            sx={{
              ...selectedStyles,
              minHeight: 48,
              py: 1.5,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: pathname === item.href ? theme.palette.primary.main : 'text.secondary',
                minWidth: 40,
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text}
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: pathname === item.href ? 600 : 400,
              }}
            />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ p: 2, mt: 'auto' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
          v1.0.0 - Powered by OpenAI
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better performance on mobile
      }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          ...(isMobile && {
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}