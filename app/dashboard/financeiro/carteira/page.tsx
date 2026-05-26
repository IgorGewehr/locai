'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';

/**
 * The wallet/"carteira" (AI balance + saque/withdrawal via AbacatePay) feature is obsolete.
 * The AI no longer receives payments — leads pay the agency directly. The financeiro is now
 * the agency's own books (see /dashboard/financeiro). This route redirects to the overview.
 */
export default function CarteiraRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/financeiro');
  }, [router]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress size={28} sx={{ color: 'rgba(255,255,255,0.3)' }} />
    </Box>
  );
}
