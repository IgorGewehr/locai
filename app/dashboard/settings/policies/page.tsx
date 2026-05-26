'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';

/**
 * Policies settings (cancellation/refund/terms) are obsolete. They belonged to
 * the old model where the AI closed deals and charged clients. The AI (Sofia)
 * now only answers, qualifies and schedules visits. This route redirects to the
 * settings landing so old links don't break. The API route is intentionally kept.
 */
export default function PoliciesRedirectPage() {
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
