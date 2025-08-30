'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';

const TRIAL_CODES: Record<string, { days: number; description: string }> = {
  '7r3fr33': { days: 7, description: '7 dias de teste grátis' },
  '14daystrial': { days: 14, description: '14 dias de teste grátis' },
  '30daysfree': { days: 30, description: '30 dias de teste grátis' },
};

export default function TrialRegistrationPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  useEffect(() => {
    // Check if the code is valid
    const trialInfo = TRIAL_CODES[code];
    
    if (trialInfo) {
      // Redirect to signup with trial parameters
      const searchParams = new URLSearchParams({
        trial: 'true',
        days: trialInfo.days.toString(),
        code: code,
      });
      
      router.replace(`/signup?${searchParams.toString()}`);
    } else {
      // Invalid code, redirect to regular signup
      router.replace('/signup');
    }
  }, [code, router]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#ffffff',
      }}
    >
      <CircularProgress sx={{ color: '#3b82f6', mb: 2 }} />
      <Typography variant="h6" sx={{ color: '#a1a1a1' }}>
        Redirecionando para o registro...
      </Typography>
    </Box>
  );
}