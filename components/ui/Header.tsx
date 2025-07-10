'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  AccountCircle,
  Settings,
  Logout,
  WhatsApp,
} from '@mui/icons-material';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationsCount] = useState(0);
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleClose();
  };

  const handleSettings = () => {
    router.push('/dashboard/settings');
    handleClose();
  };

  const handleProfile = () => {
    router.push('/dashboard/profile');
    handleClose();
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={1}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1,
            fontSize: { xs: '1.1rem', sm: '1.25rem' },
            fontWeight: 600,
            display: { xs: 'none', sm: 'block' }
          }}
        >
          {title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
          {/* WhatsApp Status */}
          <Tooltip title="WhatsApp Conectado">
            <IconButton color="inherit" size="small">
              <Badge color="success" variant="dot">
                <WhatsApp />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="Notificações">
            <IconButton color="inherit" size="small">
              <Badge badgeContent={notificationsCount} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          <IconButton
            size="small"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
            sx={{ ml: 1 }}
          >
            <Avatar sx={{ width: 32, height: 32 }} src={user?.photoURL || undefined}>
              {user?.displayName ? user.displayName[0].toUpperCase() : <AccountCircle />}
            </Avatar>
          </IconButton>

          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{
              sx: {
                minWidth: 180,
                mt: 1,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              }
            }}
          >
            <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
              <AccountCircle sx={{ mr: 1.5 }} />
              Meu Perfil
            </MenuItem>
            <MenuItem onClick={handleSettings} sx={{ py: 1.5 }}>
              <Settings sx={{ mr: 1.5 }} />
              Configurações
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
              <Logout sx={{ mr: 1.5 }} />
              Sair
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}