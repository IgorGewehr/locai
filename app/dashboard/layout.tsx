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
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <TopAppBar onLogout={handleLogout} />
        
        <Box
          component="main"
          sx={{
            width: '100%',
            minHeight: '100vh',
            pt: 8, // Space for fixed TopAppBar
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