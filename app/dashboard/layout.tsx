'use client';

import { useState } from 'react';
import { Box, Drawer, useMediaQuery, useTheme, IconButton, Toolbar, Avatar, Typography, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Tooltip, Button, Chip, Badge } from '@mui/material';
import { Menu as MenuIcon, Settings, HelpOutline, Logout, ExpandMore, WhatsApp, Language, Circle, AdminPanelSettings } from '@mui/icons-material';
import ProtectedRoute from '@/components/utilities/ProtectedRoute';
import { useAuth } from '@/contexts/AuthProvider';
import { WhatsAppStatusProvider } from '@/contexts/WhatsAppStatusContext';
import { useWhatsAppStatus } from '@/contexts/WhatsAppStatusContext';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/organisms/navigation/Sidebar';
import FirstAccessDialog from '@/components/organisms/FirstAccessDialog';
import { useFirstAccess } from '@/lib/hooks/useFirstAccess';
import SubscriptionGuard from '@/components/organisms/SubscriptionGuard';

// Disable static generation for dashboard pages
export const dynamic = 'force-dynamic';

function DashboardHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const { status: whatsappStatus } = useWhatsAppStatus();
  const router = useRouter();
  const theme = useTheme();
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Error handling without console.log for production
    }
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

  const handleAdmin = () => {
    router.push('/dashboard/lkjhg');
  };

  const getWhatsAppStatusColor = () => {
    switch (whatsappStatus.status) {
      case 'connected':
        return '#22c55e';
      case 'connecting':
      case 'qr':
        return '#f59e0b';
      default:
        return '#ef4444';
    }
  };

  const getWhatsAppStatusText = () => {
    switch (whatsappStatus.status) {
      case 'connected':
        return 'WhatsApp Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'qr':
        return 'Aguardando QR Code';
      default:
        return 'WhatsApp Desconectado';
    }
  };

  return (
    <Box 
      sx={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        px: 3,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        position: 'sticky',
        top: 0,
        zIndex: theme.zIndex.appBar,
      }}
    >
      {/* Menu Button */}
      <IconButton
        onClick={onMenuClick}
        sx={{
          color: 'rgba(255, 255, 255, 0.8)',
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
        }}
      >
        <MenuIcon />
      </IconButton>

      {/* Right Side Actions */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
      }}>
        {/* WhatsApp Status */}
      <Tooltip title={getWhatsAppStatusText()}>
        <Button
          onClick={() => router.push('/dashboard/settings')}
          startIcon={<WhatsApp sx={{ fontSize: 18 }} />}
          endIcon={
            <Circle 
              sx={{ 
                fontSize: 6, 
                color: getWhatsAppStatusColor(),
                filter: 'drop-shadow(0 0 4px currentColor)',
              }} 
            />
          }
          sx={{
            color: whatsappStatus.status === 'connected' ? '#22c55e' : 'rgba(255, 255, 255, 0.8)',
            backgroundColor: whatsappStatus.status === 'connected' 
              ? 'rgba(34, 197, 94, 0.1)' 
              : 'rgba(255, 255, 255, 0.05)',
            borderRadius: 2,
            px: 2,
            py: 1,
            fontSize: '0.875rem',
            fontWeight: 500,
            textTransform: 'none',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: whatsappStatus.status === 'connected'
                ? 'rgba(34, 197, 94, 0.15)'
                : 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          WhatsApp
        </Button>
      </Tooltip>

      {/* Mini-Site */}
      <Tooltip title="Mini-Site">
        <IconButton
          onClick={() => router.push('/dashboard/mini-site')}
          sx={{
            color: 'rgba(255, 255, 255, 0.8)',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
        >
          <Language />
        </IconButton>
      </Tooltip>

      {/* Admin Panel - Only for users with idog == true */}
      {user?.idog === true && (
        <Tooltip title="Painel Administrativo">
          <IconButton 
            onClick={handleAdmin} 
            sx={{ 
              color: '#ef4444',
              '&:hover': { 
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171'
              }
            }}
          >
            <AdminPanelSettings />
          </IconButton>
        </Tooltip>
      )}

      <Divider 
        orientation="vertical" 
        flexItem 
        sx={{ 
          borderColor: 'rgba(255, 255, 255, 0.2)', 
          height: 32,
        }} 
      />

      {/* Profile */}
      <Button
        onClick={handleProfileMenuOpen}
        startIcon={
          <Avatar
            sx={{
              width: 28,
              height: 28,
              bgcolor: 'rgba(6, 182, 212, 0.2)',
              color: '#06b6d4',
              border: '2px solid rgba(6, 182, 212, 0.3)',
              fontSize: '0.75rem',
            }}
          >
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </Avatar>
        }
        endIcon={<ExpandMore sx={{ fontSize: 18 }} />}
        sx={{
          color: 'white',
          textTransform: 'none',
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
          borderRadius: 2,
        }}
      >
        <Box sx={{ textAlign: 'left', ml: 1, maxWidth: 160, overflow: 'hidden' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 600, 
              lineHeight: 1,
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              fontSize: '0.8rem',
            }}
          >
            {user?.displayName || user?.email || 'Usuário'}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.6)',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              fontSize: '0.65rem',
            }}
          >
            {user?.email || 'user@example.com'}
          </Typography>
        </Box>
      </Button>

      <Menu
        anchorEl={profileAnchorEl}
        open={Boolean(profileAnchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            background: 'rgba(30, 41, 59, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            minWidth: 200,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => {
          router.push('/dashboard/settings');
          handleProfileMenuClose();
        }} sx={{ 
          py: 1.5,
          px: 2,
          minHeight: 48,
          '&:hover': {
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
          },
        }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Settings fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Configurações"
            primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
          />
        </MenuItem>
        
        <MenuItem onClick={() => {
          router.push('/dashboard/help');
          handleProfileMenuClose();
        }} sx={{ 
          py: 1.5,
          px: 2,
          minHeight: 48,
          '&:hover': {
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
          },
        }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <HelpOutline fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Ajuda"
            primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
          />
        </MenuItem>
        
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 0.5 }} />
        
        <MenuItem onClick={() => {
          handleProfileMenuClose();
          handleLogout();
        }} sx={{ 
          py: 1.5,
          px: 2,
          minHeight: 48,
          '&:hover': {
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
          },
        }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Logout fontSize="small" sx={{ color: 'rgba(239, 68, 68, 0.8)' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Sair"
            primaryTypographyProps={{ 
              fontSize: '0.875rem', 
              fontWeight: 500,
              color: 'rgba(239, 68, 68, 0.9)' 
            }}
          />
        </MenuItem>
      </Menu>
      </Box>
    </Box>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { shouldShowDialog, markAsViewed } = useFirstAccess();

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const handleSidebarOpen = () => {
    setSidebarOpen(true);
  };

  const handleFirstAccessComplete = async () => {
    await markAsViewed();
  };

  return (
    <ProtectedRoute>
      <WhatsAppStatusProvider>
        <SubscriptionGuard>
          <Box sx={{ 
            minHeight: '100vh', 
            bgcolor: 'background.default',
            display: 'flex',
          }}>
            <Sidebar open={sidebarOpen} onClose={handleSidebarClose} />
            
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0, // Prevents flex overflow
                /* Modern invisible scrollbar */
                '&::-webkit-scrollbar': {
                  width: '8px',
                  height: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                  },
                },
                /* Firefox */
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
              }}
            >
              <DashboardHeader onMenuClick={handleSidebarOpen} />
              
              <Box sx={{ 
                flex: 1,
                p: { xs: 2, sm: 3 },
                overflowY: 'auto',
                overflowX: 'hidden',
              }}>
                {children}
              </Box>
            </Box>
          </Box>

          {/* First Access Tutorial Dialog */}
          <FirstAccessDialog
            open={shouldShowDialog}
            onClose={handleFirstAccessComplete}
            onComplete={handleFirstAccessComplete}
          />
        </SubscriptionGuard>
      </WhatsAppStatusProvider>
    </ProtectedRoute>
  );
}