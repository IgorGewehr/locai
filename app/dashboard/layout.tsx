'use client';

import { Box, Toolbar } from '@mui/material';
import TopAppBar from '@/components/organisms/navigation/TopAppBar';
import ProtectedRoute from '@/components/utilities/ProtectedRoute';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const handleLogout = () => {
    // Implement logout logic here
    console.log('Logout clicked');
  };

  return (
    <ProtectedRoute>
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <TopAppBar onLogout={handleLogout} />
        <Toolbar /> {/* Spacer for fixed AppBar */}
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
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
          <Box sx={{ 
            p: { xs: 2, sm: 3 },
            width: '100%',
          }}>
            {children}
          </Box>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}