'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';

/**
 * Financial/banking settings are obsolete. The AI (Sofia) no longer receives
 * payments or charges clients, so the agency's bank/PIX data is no longer
 * configured here. This route redirects to the settings landing so old links
 * don't break. The API route is intentionally kept.
 */
export default function FinancialRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/settings');
  }, [router]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress size={28} sx={{ color: 'rgba(255,255,255,0.3)' }} />
    </Box>
  );
}
