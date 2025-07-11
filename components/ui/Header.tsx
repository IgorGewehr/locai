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
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 64, sm: 72 }, px: { xs: 2, sm: 3 } }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ 
            mr: 3,
            p: 1.5,
            borderRadius: '12px',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.08)',
              transform: 'scale(1.05)',
            }
          }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1rem',
              mr: 2,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            AI
          </Box>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontSize: { xs: '1.1rem', sm: '1.3rem' },
              fontWeight: 700,
              background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: { xs: 'none', sm: 'block' }
            }}
          >
            {title}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* WhatsApp Status */}
          <Tooltip title="WhatsApp Conectado" arrow>
            <IconButton 
              color="inherit" 
              size="medium"
              sx={{
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'rgba(16, 185, 129, 0.1)',
                  transform: 'scale(1.05)',
                }
              }}
            >
              <Badge 
                color="success" 
                variant="dot"
                sx={{
                  '& .MuiBadge-dot': {
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                  }
                }}
              >
                <WhatsApp sx={{ color: '#10b981' }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="Notificações" arrow>
            <IconButton 
              color="inherit" 
              size="medium"
              sx={{
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'rgba(99, 102, 241, 0.1)',
                  transform: 'scale(1.05)',
                }
              }}
            >
              <Badge 
                badgeContent={notificationsCount} 
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    fontWeight: 600,
                  }
                }}
              >
                <Notifications sx={{ color: 'rgba(255, 255, 255, 0.95)' }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          <Tooltip title="Menu do usuário" arrow>
            <IconButton
              size="medium"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
              sx={{ 
                ml: 1,
                borderRadius: '12px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  border: '2px solid rgba(99, 102, 241, 0.3)',
                  transform: 'scale(1.05)',
                }
              }}
            >
              <Avatar 
                sx={{ 
                  width: 36, 
                  height: 36,
                  background: user?.photoURL ? 'none' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  fontSize: '1rem',
                  fontWeight: 600,
                }} 
                src={user?.photoURL || undefined}
              >
                {user?.displayName ? user.displayName[0].toUpperCase() : <AccountCircle />}
              </Avatar>
            </IconButton>
          </Tooltip>

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
                borderRadius: '16px',
                background: 'rgba(15, 15, 15, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                '& .MuiMenuItem-root': {
                  borderRadius: '8px',
                  margin: '4px 8px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: 'rgba(99, 102, 241, 0.1)',
                  }
                }
              }
            }}
          >
            <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
              <AccountCircle sx={{ mr: 2, color: '#6366f1' }} />
              Meu Perfil
            </MenuItem>
            <MenuItem onClick={handleSettings} sx={{ py: 1.5 }}>
              <Settings sx={{ mr: 2, color: '#8b5cf6' }} />
              Configurações
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
              <Logout sx={{ mr: 2, color: '#ef4444' }} />
              Sair
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}