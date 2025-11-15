'use client';

/**
 * ADVANCED SETTINGS - REMOVED
 *
 * This page has been discontinued. Redirecting to main settings.
 *
 * @version 2.0.0
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Card, CardContent, CircularProgress, Typography } from '@mui/material';

export default function AdvancedSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect after 3 seconds
    const timeout = setTimeout(() => {
      router.push('/dashboard/settings');
    }, 3000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress sx={{ mb: 3 }} />

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              ⚠️ Página Removida
            </Typography>
            <Typography variant="body2">
              A página de configurações avançadas foi descontinuada.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Redirecionando para configurações principais...
            </Typography>
          </Alert>

          <Typography variant="caption" color="text.secondary">
            Você será redirecionado automaticamente em 3 segundos
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
