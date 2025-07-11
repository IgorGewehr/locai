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
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  AccountCircle,
  Settings,
  Logout,
  WhatsApp,
  CheckCircle,
} from '@mui/icons-material';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export default function Header({ onMenuClick }: HeaderProps) {
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
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ minHeight: 64, px: 3 }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ 
            mr: 2,
            color: 'text.primary',
            '&:hover': {
              backgroundColor: 'action.hover',
            }
          }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 600,
              color: 'text.primary',
              fontSize: '1.125rem',
            }}
          >
            Locai Pro
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* WhatsApp Status */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2,
              py: 0.75,
              borderRadius: 2,
              backgroundColor: 'success.main',
              color: 'white',
            }}
          >
            <CheckCircle sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="caption" fontWeight={500}>
              WhatsApp Conectado
            </Typography>
          </Box>

          {/* Notifications */}
          <IconButton 
            color="inherit" 
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
              }
            }}
          >
            <Badge 
              badgeContent={notificationsCount} 
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.7rem',
                  height: 18,
                  minWidth: 18,
                }
              }}
            >
              <Notifications fontSize="small" />
            </Badge>
          </IconButton>

          {/* User Menu */}
          <IconButton
            size="medium"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            sx={{ 
              ml: 1,
              p: 0.5,
            }}
          >
            <Avatar 
              sx={{ 
                width: 32, 
                height: 32,
                bgcolor: 'primary.main',
                fontSize: '0.875rem',
                fontWeight: 600,
              }} 
              src={user?.photoURL || undefined}
            >
              {user?.displayName ? user.displayName[0].toUpperCase() : user?.email?.[0].toUpperCase() || 'U'}
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
                minWidth: 200,
                mt: 1.5,
                borderRadius: 2,
                boxShadow: theme => theme.custom.elevation.medium,
              }
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="body2" fontWeight={600}>
                {user?.displayName || user?.email || 'Usuário'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
              <AccountCircle sx={{ mr: 2, fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="body2">Meu Perfil</Typography>
            </MenuItem>
            <MenuItem onClick={handleSettings} sx={{ py: 1.5 }}>
              <Settings sx={{ mr: 2, fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="body2">Configurações</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
              <Logout sx={{ mr: 2, fontSize: 20 }} />
              <Typography variant="body2">Sair</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}