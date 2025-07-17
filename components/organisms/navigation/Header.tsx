'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getTenantId } from '@/lib/utils/tenant';
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
  Error as ErrorIcon,
  Sync as SyncIcon,
  QrCode2,
} from '@mui/icons-material';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationsCount] = useState(0);
  const [whatsappStatus, setWhatsappStatus] = useState<'disconnected' | 'connecting' | 'qr' | 'connected'>('disconnected');
  const [connectionType, setConnectionType] = useState<'web' | 'api'>('web');
  const router = useRouter();
  const { user, signOut } = useAuth();
  const tenantId = getTenantId();

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
  
  useEffect(() => {
    checkWhatsAppStatus();
    const interval = setInterval(checkWhatsAppStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
  const checkWhatsAppStatus = async () => {
    try {
      // First check Web session
      const sessionResponse = await fetch('/api/whatsapp/session');
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData.data) {
          setWhatsappStatus(sessionData.data.status);
          if (sessionData.data.connected) {
            setConnectionType('web');
            return;
          }
        }
      }
      
      // If Web is not connected, check API
      const apiResponse = await fetch('/api/config/whatsapp');
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        if (apiData.status === 'connected') {
          setWhatsappStatus('connected');
          setConnectionType('api');
        }
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
    }
  };
  
  const getStatusDisplay = () => {
    switch (whatsappStatus) {
      case 'connected':
        return {
          icon: <CheckCircle sx={{ fontSize: 16, mr: 1 }} />,
          text: 'WhatsApp Conectado',
          color: 'success.main',
          bgColor: 'success.main',
        };
      case 'qr':
        return {
          icon: <QrCode2 sx={{ fontSize: 16, mr: 1 }} />,
          text: 'Aguardando QR Code',
          color: 'warning.main',
          bgColor: 'warning.main',
        };
      case 'connecting':
        return {
          icon: <SyncIcon sx={{ fontSize: 16, mr: 1, animation: 'spin 1s linear infinite' }} />,
          text: 'Conectando...',
          color: 'info.main',
          bgColor: 'info.main',
        };
      default:
        return {
          icon: <ErrorIcon sx={{ fontSize: 16, mr: 1 }} />,
          text: 'WhatsApp Desconectado',
          color: 'error.main',
          bgColor: 'error.main',
        };
    }
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
      <Toolbar sx={{ minHeight: { xs: 56, md: 64 }, px: { xs: 2, md: 3 } }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ 
            mr: 2,
            color: 'text.primary',
            p: { xs: 1, md: 1.5 },
            '&:hover': {
              backgroundColor: 'action.hover',
            }
          }}
        >
          <MenuIcon sx={{ fontSize: { xs: 20, md: 24 } }} />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 600,
              color: 'text.primary',
              fontSize: { xs: '1rem', md: '1.125rem' },
            }}
          >
LocAI
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 1.5 } }}>
          {/* WhatsApp Status */}
          <Tooltip title={`Tipo de conexão: ${connectionType === 'web' ? 'WhatsApp Web' : 'WhatsApp Business API'}`}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: { xs: 1.5, md: 2 },
                py: { xs: 0.5, md: 0.75 },
                borderRadius: 2,
                backgroundColor: getStatusDisplay().bgColor,
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                minHeight: { xs: 36, md: 40 },
                '&:hover': {
                  opacity: 0.9,
                },
              }}
              onClick={() => router.push('/dashboard/settings')}
            >
              {getStatusDisplay().icon}
              <Typography 
                variant="caption" 
                fontWeight={500}
                sx={{ 
                  fontSize: { xs: '0.7rem', md: '0.75rem' },
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                {getStatusDisplay().text}
              </Typography>
            </Box>
          </Tooltip>

          {/* Notifications */}
          <IconButton 
            color="inherit" 
            sx={{
              color: 'text.secondary',
              p: { xs: 1, md: 1.5 },
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
              <Notifications sx={{ fontSize: { xs: 20, md: 24 } }} />
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
              p: { xs: 0.5, md: 1 },
            }}
          >
            <Avatar 
              sx={{ 
                width: { xs: 32, md: 36 }, 
                height: { xs: 32, md: 36 },
                bgcolor: 'primary.main',
                fontSize: { xs: '0.875rem', md: '1rem' },
                fontWeight: 600,
              }} 
              src={user?.photoURL}
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

// Add CSS animation for spinning icon
const globalStyles = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = globalStyles;
  document.head.appendChild(style);
}