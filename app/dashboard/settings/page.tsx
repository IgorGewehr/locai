'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';

/**
 * Settings main redirect
 * Redirects to the first settings section (WhatsApp)
 */
export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the first settings section (WhatsApp)
    router.replace('/dashboard/settings/whatsapp');
  }, [router]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <CircularProgress />
    </Box>
  );
}
