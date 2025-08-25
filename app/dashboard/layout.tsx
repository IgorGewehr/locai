'use client';

import { Box, Toolbar } from '@mui/material';
import TopAppBar from '@/components/organisms/navigation/TopAppBar';
import ProtectedRoute from '@/components/utilities/ProtectedRoute';
import { useAuth } from '@/contexts/AuthProvider';
import { WhatsAppStatusProvider } from '@/contexts/WhatsAppStatusContext';

// Disable static generation for dashboard pages
export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Error handling without console.log for production
    }
  };

  return (
    <ProtectedRoute>
      <WhatsAppStatusProvider>
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
              position: 'relative',
              zIndex: 1,
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
              position: 'relative',
              zIndex: 1,
            }}>
              {children}
            </Box>
          </Box>
        </Box>
      </WhatsAppStatusProvider>
    </ProtectedRoute>
  );
}