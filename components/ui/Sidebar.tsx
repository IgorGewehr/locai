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
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'rgba(15, 15, 15, 0.95)',
      backdropFilter: 'blur(20px)',
    }}>
      <Toolbar sx={{ minHeight: { xs: 64, sm: 72 }, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            AI
          </Box>
          <Box>
            <Typography 
              variant="h6" 
              fontWeight="bold" 
              sx={{ 
                fontSize: '1.2rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1.2,
              }}
            >
              Agente Imobiliária
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              Enterprise Platform
            </Typography>
          </Box>
        </Box>
      </Toolbar>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      <Box sx={{ flex: 1, overflowY: 'auto', py: 2, px: 2 }}>
        <Typography 
          variant="overline" 
          sx={{ 
            px: 2, 
            pb: 1,
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
          }}
        >
          MENU PRINCIPAL
        </Typography>
        <List dense sx={{ '& .MuiListItem-root': { mb: 0.5 } }}>
          {memoizedMenuItems.map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={pathname === item.href}
              onClick={isMobile ? onClose : undefined}
              sx={{
                borderRadius: '12px',
                mx: 1,
                minHeight: 48,
                py: 1.5,
                px: 2,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.08)',
                  transform: 'translateX(4px)',
                },
                '&.Mui-selected': {
                  background: 'rgba(99, 102, 241, 0.15)',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
                  '&:hover': {
                    background: 'rgba(99, 102, 241, 0.2)',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    background: 'linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)',
                    borderRadius: '0 2px 2px 0',
                  }
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: pathname === item.href ? '#6366f1' : 'rgba(255, 255, 255, 0.85)',
                  minWidth: 36,
                  transition: 'all 0.2s ease',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: pathname === item.href ? 600 : 500,
                  color: pathname === item.href ? '#ffffff' : 'rgba(255, 255, 255, 0.95)',
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      <Box sx={{ py: 2, px: 2 }}>
        <Typography 
          variant="overline" 
          sx={{ 
            px: 2, 
            pb: 1,
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
          }}
        >
          CONFIGURAÇÕES
        </Typography>
        <List dense sx={{ '& .MuiListItem-root': { mb: 0.5 } }}>
          {memoizedSecondaryItems.map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={pathname === item.href}
              onClick={isMobile ? onClose : undefined}
              sx={{
                borderRadius: '12px',
                mx: 1,
                minHeight: 48,
                py: 1.5,
                px: 2,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.08)',
                  transform: 'translateX(4px)',
                },
                '&.Mui-selected': {
                  background: 'rgba(99, 102, 241, 0.15)',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
                  '&:hover': {
                    background: 'rgba(99, 102, 241, 0.2)',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    background: 'linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)',
                    borderRadius: '0 2px 2px 0',
                  }
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: pathname === item.href ? '#6366f1' : 'rgba(255, 255, 255, 0.85)',
                  minWidth: 36,
                  transition: 'all 0.2s ease',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: pathname === item.href ? 600 : 500,
                  color: pathname === item.href ? '#ffffff' : 'rgba(255, 255, 255, 0.95)',
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Box sx={{ p: 3, mt: 'auto' }}>
        <Box
          sx={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '12px',
            p: 2,
            textAlign: 'center',
          }}
        >
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.75rem',
              fontWeight: 500,
              display: 'block',
              mb: 0.5,
            }}
          >
            v1.0.0 Enterprise
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: '#6366f1',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            Powered by OpenAI GPT-4
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