'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';
import { getTenantId } from '@/lib/utils/tenant';
import WhatsAppStatusIndicator from '@/components/molecules/whatsapp/WhatsAppStatusIndicator';
import {
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Badge,
  Typography,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  AccountCircle,
  Settings,
  Logout,
  HelpOutline,
  AdminPanelSettings,
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
      console.error('Erro ao fazer logout:', error);
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

  const handleHelp = () => {
    router.push('/dashboard/help');
    handleClose();
  };

  const handleAdmin = () => {
    router.push('/dashboard/lkjhg');
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
          <Box
            component="img"
            src="/logo.jpg"
            alt="AlugaZap"
            sx={{
              height: { xs: 32, md: 40 },
              width: 'auto',
              maxWidth: { xs: 120, md: 160 },
              objectFit: 'contain',
              cursor: 'pointer',
            }}
            onClick={() => router.push('/dashboard')}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 1.5 } }}>
          {/* WhatsApp Status - Usando o novo componente */}
          <WhatsAppStatusIndicator 
            variant="compact"
            size="medium"
            clickable={true}
          />

          {/* Admin Panel Button - Only show for admin users */}
          {user?.idog === true && (
            <IconButton 
              color="inherit" 
              onClick={handleAdmin}
              sx={{
                color: 'error.main',
                p: { xs: 1, md: 1.5 },
                '&:hover': {
                  backgroundColor: 'error.light',
                  color: 'error.contrastText',
                }
              }}
              title="Painel Administrativo"
            >
              <AdminPanelSettings sx={{ fontSize: { xs: 20, md: 24 } }} />
            </IconButton>
          )}

          {/* Help Button */}
          <IconButton 
            color="inherit" 
            onClick={handleHelp}
            sx={{
              color: 'text.secondary',
              p: { xs: 1, md: 1.5 },
              '&:hover': {
                backgroundColor: 'action.hover',
              }
            }}
            title="Central de Ajuda"
          >
            <HelpOutline sx={{ fontSize: { xs: 20, md: 24 } }} />
          </IconButton>

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
            {user?.idog === true && (
              <MenuItem onClick={handleAdmin} sx={{ py: 1.5, color: 'error.main' }}>
                <AdminPanelSettings sx={{ mr: 2, fontSize: 20 }} />
                <Typography variant="body2">Painel Administrativo</Typography>
              </MenuItem>
            )}
            <MenuItem onClick={handleHelp} sx={{ py: 1.5 }}>
              <HelpOutline sx={{ mr: 2, fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="body2">Central de Ajuda</Typography>
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