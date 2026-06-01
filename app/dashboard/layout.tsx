'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  useMediaQuery,
  useTheme,
  IconButton,
  Avatar,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Button,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Settings,
  HelpOutline,
  Logout,
  ExpandMore,
  WhatsApp,
  Circle,
  AdminPanelSettings,
} from '@mui/icons-material';
import ProtectedRoute from '@/components/utilities/ProtectedRoute';
import LoadingScreen from '@/components/atoms/LoadingScreen/LoadingScreen';
import { useAuth } from '@/contexts/AuthProvider';
import { WhatsAppStatusProvider, useWhatsAppStatus } from '@/contexts/WhatsAppStatusContext';
import { useRouter } from 'next/navigation';
import Sidebar, { SIDEBAR_EXPANDED, SIDEBAR_COLLAPSED } from '@/components/organisms/navigation/Sidebar';
import NotificationBell from '@/components/molecules/notifications/NotificationBell';

export const dynamic = 'force-dynamic';

const COLLAPSE_KEY = 'sidebar-collapsed';

function DashboardHeader({
  onMobileMenuClick,
}: {
  onMobileMenuClick: () => void;
}) {
  const { user, logout } = useAuth();
  const { status: whatsappStatus } = useWhatsAppStatus();
  const router = useRouter();
  const theme = useTheme();
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logout(); } catch { setLoggingOut(false); }
  };

  const waConnected = (whatsappStatus as any).connected === true || whatsappStatus.status === 'connected';
  const waColor = waConnected ? '#22c55e' : whatsappStatus.status === 'connecting' || whatsappStatus.status === 'qr' ? '#f59e0b' : '#ef4444';
  const waLabel = waConnected ? 'WhatsApp Conectado' : whatsappStatus.status === 'connecting' ? 'Conectando...' : whatsappStatus.status === 'qr' ? 'Aguardando QR Code' : 'Desconectado';

  return (
    <>
    {loggingOut && <LoadingScreen />}
    <Box
      sx={{
        background: 'rgba(10,14,23,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        px: { xs: 1.5, sm: 2, md: 3 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: { xs: 1, sm: 2 },
        position: 'sticky',
        top: 0,
        zIndex: theme.zIndex.appBar,
        minHeight: { xs: 56, md: 60 },
        maxWidth: '100vw',
        overflow: 'hidden',
      }}
    >
      {/* Mobile hamburger only */}
      <IconButton
        onClick={onMobileMenuClick}
        sx={{
          display: { xs: 'flex', lg: 'none' },
          color: 'rgba(255,255,255,0.6)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.9)' },
        }}
      >
        <MenuIcon sx={{ fontSize: 20 }} />
      </IconButton>

      {/* Right side */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.5, sm: 1, md: 1.5 },
          flex: 1,
          justifyContent: 'flex-end',
          minWidth: 0,
        }}
      >
        {/* WhatsApp status */}
        <Tooltip title={waLabel}>
          <span>
            <Button
              onClick={() => router.push('/dashboard/settings')}
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 0.75,
                color: waConnected ? '#22c55e' : 'rgba(255,255,255,0.55)',
                bgcolor: waConnected ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
                borderRadius: '8px',
                px: 1.5,
                py: 0.75,
                fontSize: '0.8125rem',
                fontWeight: 500,
                textTransform: 'none',
                minWidth: 0,
                transition: 'all 0.18s ease',
                '&:hover': {
                  bgcolor: waConnected ? 'rgba(34,197,94,0.13)' : 'rgba(255,255,255,0.07)',
                  color: waConnected ? '#22c55e' : 'rgba(255,255,255,0.8)',
                },
              }}
            >
              <WhatsApp sx={{ fontSize: 16 }} />
              WhatsApp
              <Circle sx={{ fontSize: 6, color: waColor }} />
            </Button>
            <IconButton
              onClick={() => router.push('/dashboard/settings')}
              sx={{
                display: { xs: 'flex', md: 'none' },
                color: waConnected ? '#22c55e' : 'rgba(255,255,255,0.55)',
                bgcolor: waConnected ? 'rgba(34,197,94,0.08)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.07)' },
                p: 0.75,
              }}
            >
              <WhatsApp sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>

        <NotificationBell size="medium" maxNotifications={20} showCount />

        {user?.idog === true && (
          <Tooltip title="Painel Admin">
            <IconButton
              onClick={() => router.push('/dashboard/lkjhg')}
              sx={{
                display: { xs: 'none', sm: 'flex' },
                color: 'rgba(239,68,68,0.7)',
                '&:hover': { bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444' },
                p: 0.75,
              }}
            >
              <AdminPanelSettings sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        )}

        <Divider
          orientation="vertical"
          flexItem
          sx={{ display: { xs: 'none', sm: 'block' }, borderColor: 'rgba(255,255,255,0.1)', height: 28, alignSelf: 'center' }}
        />

        {/* Profile */}
        <IconButton
          onClick={(e) => setProfileAnchorEl(e.currentTarget)}
          sx={{ p: 0.25, display: { xs: 'flex', md: 'none' } }}
        >
          <Avatar sx={{ width: 30, height: 30, bgcolor: 'rgba(220,38,38,0.2)', color: '#f87171', border: '1px solid rgba(220,38,38,0.25)', fontSize: '0.8125rem', fontWeight: 600 }}>
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </Avatar>
        </IconButton>

        <Button
          onClick={(e) => setProfileAnchorEl(e.currentTarget)}
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1,
            color: 'rgba(255,255,255,0.8)',
            textTransform: 'none',
            borderRadius: '8px',
            px: 1,
            py: 0.5,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: 'white' },
          }}
        >
          <Avatar sx={{ width: 26, height: 26, bgcolor: 'rgba(220,38,38,0.2)', color: '#f87171', border: '1px solid rgba(220,38,38,0.25)', fontSize: '0.75rem', fontWeight: 600 }}>
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </Avatar>
          <Box sx={{ textAlign: 'left', maxWidth: 140, overflow: 'hidden' }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'rgba(255,255,255,0.9)' }}>
              {user?.displayName || user?.email || 'Usuário'}
            </Typography>
          </Box>
          <ExpandMore sx={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', ml: -0.5 }} />
        </Button>

        <Menu
          anchorEl={profileAnchorEl}
          open={Boolean(profileAnchorEl)}
          onClose={() => setProfileAnchorEl(null)}
          PaperProps={{
            sx: {
              mt: 1,
              bgcolor: '#111827',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '10px',
              minWidth: 200,
              boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={() => { router.push('/dashboard/settings'); setProfileAnchorEl(null); }}
            sx={{ py: 1.25, px: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
            <ListItemIcon sx={{ minWidth: 32 }}><Settings fontSize="small" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 17 }} /></ListItemIcon>
            <ListItemText primary="Configurações" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }} />
          </MenuItem>
          <MenuItem onClick={() => { router.push('/dashboard/help'); setProfileAnchorEl(null); }}
            sx={{ py: 1.25, px: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
            <ListItemIcon sx={{ minWidth: 32 }}><HelpOutline fontSize="small" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 17 }} /></ListItemIcon>
            <ListItemText primary="Ajuda" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }} />
          </MenuItem>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 0.5 }} />
          <MenuItem onClick={() => { setProfileAnchorEl(null); handleLogout(); }}
            sx={{ py: 1.25, px: 2, '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' } }}>
            <ListItemIcon sx={{ minWidth: 32 }}><Logout fontSize="small" sx={{ color: 'rgba(239,68,68,0.7)', fontSize: 17 }} /></ListItemIcon>
            <ListItemText primary="Sair" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(239,68,68,0.8)' }} />
          </MenuItem>
        </Menu>
      </Box>
    </Box>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(COLLAPSE_KEY) === 'true';
  });

  const handleToggleCollapse = () => {
    setSidebarCollapsed((v) => {
      const next = !v;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  };

  const sidebarWidth = isMobile ? 0 : (sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED);

  return (
    <ProtectedRoute>
      <WhatsAppStatusProvider>
        <Box
          sx={{
            height: '100vh',
            bgcolor: '#0b0f1a',
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          <Sidebar
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />

          <Box
            component="main"
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              height: '100%',
              // Subtle scrollbar
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 3,
                '&:hover': { background: 'rgba(255,255,255,0.13)' },
              },
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.08) transparent',
            }}
          >
            <DashboardHeader onMobileMenuClick={() => setMobileOpen(true)} />

            <Box
              sx={{
                flex: 1,
                p: { xs: 1, sm: 1.5, md: 2 },
                overflowY: 'auto',
                overflowX: 'hidden',
                minHeight: 0,
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>
      </WhatsAppStatusProvider>
    </ProtectedRoute>
  );
}
