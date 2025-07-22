'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
} from '@mui/material';
import MiniSiteConfigPanel from '@/components/organisms/marketing/MiniSiteConfigPanel';

export default function MiniSitePage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
          Mini-Site
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Configure e gerencie seu mini-site para atrair mais clientes
        </Typography>
      </Box>

      <MiniSiteConfigPanel />
    </Container>
  );
}