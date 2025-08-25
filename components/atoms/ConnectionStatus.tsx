/**
 * Connection Status Indicator Component
 * Shows the current Firebase/Network connection status
 */

import React from 'react';
import { Box, Chip, Fade, Tooltip } from '@mui/material';
import { 
  WifiOff, 
  Wifi, 
  CloudOff, 
  Cloud,
  Sync
} from '@mui/icons-material';
import { useFirebaseConnection } from '@/hooks/useFirebaseConnection';

export default function ConnectionStatus() {
  const { isOnline, isFirebaseConnected } = useFirebaseConnection();

  // Don't show anything if everything is connected
  if (isOnline && isFirebaseConnected) {
    return null;
  }

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff />,
        label: 'Sem conexão',
        color: 'error' as const,
        tooltip: 'Você está offline. As alterações serão salvas localmente.',
      };
    }
    
    if (!isFirebaseConnected) {
      return {
        icon: <CloudOff />,
        label: 'Conectando...',
        color: 'warning' as const,
        tooltip: 'Conectando ao servidor. Por favor, aguarde...',
      };
    }

    return {
      icon: <Sync />,
      label: 'Sincronizando',
      color: 'info' as const,
      tooltip: 'Sincronizando dados com o servidor...',
    };
  };

  const config = getStatusConfig();

  return (
    <Fade in={!isOnline || !isFirebaseConnected}>
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
        }}
      >
        <Tooltip title={config.tooltip} arrow>
          <Chip
            icon={config.icon}
            label={config.label}
            color={config.color}
            size="small"
            sx={{
              animation: !isFirebaseConnected ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.6 },
                '100%': { opacity: 1 },
              },
            }}
          />
        </Tooltip>
      </Box>
    </Fade>
  );
}