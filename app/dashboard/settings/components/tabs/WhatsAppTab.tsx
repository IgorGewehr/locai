'use client';

/**
 * WhatsApp Tab - Importa lógica existente da página Settings original
 * TODO: Refatorar posteriormente para componente standalone
 */

import { Box, Typography, Alert } from '@mui/material';

interface Props {
  setGlobalError: (error: string | null) => void;
  setGlobalSuccess: (success: string | null) => void;
}

export default function WhatsAppTab({ setGlobalError, setGlobalSuccess }: Props) {
  return (
    <Box>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Integração WhatsApp
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure a conexão do WhatsApp Web para automação de mensagens
      </Typography>

      <Alert severity="info">
        Esta funcionalidade está sendo refatorada. Use a página Settings original temporariamente.
      </Alert>
    </Box>
  );
}
