'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, Toolbar, useTheme, useMediaQuery } from '@mui/material';
import Header from '@/components/organisms/navigation/Header';
import Sidebar from '@/components/organisms/navigation/Sidebar';
import ProtectedRoute from '@/components/utilities/ProtectedRoute';

const drawerWidth = 260;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize sidebar state based on screen size
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Optimized main content styles
  const mainContentStyles = useMemo(() => ({
    flexGrow: 1,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    transition: theme.transitions.create(['margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    ...(sidebarOpen && !isMobile && {
      marginLeft: `${drawerWidth}px`,
      transition: theme.transitions.create(['margin'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  }), [sidebarOpen, isMobile, theme.transitions]);

  return (
    <ProtectedRoute>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Header 
          onMenuClick={handleSidebarToggle} 
        />
        
        <Sidebar 
          open={sidebarOpen} 
          onClose={handleSidebarClose} 
        />
        
        <Box
          component="main"
          sx={mainContentStyles}
        >
          <Toolbar sx={{ minHeight: 64 }} />
          <Box sx={{ 
            flex: 1,
            p: { xs: 2, sm: 2.5, md: 3 },
            maxWidth: '100%',
            overflow: 'hidden',
          }}>
            {children}
          </Box>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}