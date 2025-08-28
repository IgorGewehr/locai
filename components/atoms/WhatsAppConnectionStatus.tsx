'use client';

import React from 'react';
import {
  Box,
  Chip,
  Typography,
  LinearProgress,
  Tooltip,
  Badge,
  IconButton,
  Fade,
  Zoom,
} from '@mui/material';
import {
  WhatsApp,
  SignalWifi4Bar,
  SignalWifiOff,
  QrCode,
  CheckCircle,
  Error,
  Schedule,
  Refresh,
  ConnectedTv,
} from '@mui/icons-material';

interface WhatsAppConnectionStatusProps {
  // Estado da conexão
  connected: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'qr' | 'scanning';
  
  // Dados opcionais
  phoneNumber?: string;
  businessName?: string;
  lastUpdated?: Date;
  
  // Configurações visuais
  variant?: 'chip' | 'inline' | 'detailed' | 'compact';
  showProgress?: boolean;
  showLastUpdate?: boolean;
  animate?: boolean;
  
  // Ações
  onRefresh?: () => void;
  onClick?: () => void;
  
  // Estados de progresso (para QR scanning)
  connectionProgress?: number;
  timeElapsed?: number;
  estimatedTimeLeft?: number;
}

/**
 * 🔗 Componente de status de conexão WhatsApp
 * Feedback visual rico sem depender de recursos do microservice
 */
export function WhatsAppConnectionStatus({
  connected,
  status,
  phoneNumber,
  businessName,
  lastUpdated,
  variant = 'chip',
  showProgress = false,
  showLastUpdate = false,
  animate = true,
  onRefresh,
  onClick,
  connectionProgress = 0,
  timeElapsed = 0,
  estimatedTimeLeft = 0
}: WhatsAppConnectionStatusProps) {

  // 🎨 Configuração visual baseada no status
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          label: connected ? 'WhatsApp Conectado' : 'WhatsApp',
          color: 'success' as const,
          icon: <WhatsApp />,
          bgColor: '#25D366',
          textColor: 'white',
          description: phoneNumber ? `📱 ${phoneNumber}` : businessName || 'Conectado'
        };
      
      case 'connecting':
        return {
          label: 'Conectando...',
          color: 'warning' as const,
          icon: <ConnectedTv />,
          bgColor: '#ff9800',
          textColor: 'white',
          description: 'Estabelecendo conexão'
        };
      
      case 'qr':
        return {
          label: 'QR Code Disponível',
          color: 'info' as const,
          icon: <QrCode />,
          bgColor: '#2196f3',
          textColor: 'white',
          description: 'Escaneie para conectar'
        };
      
      case 'scanning':
        return {
          label: 'Escaneando QR...',
          color: 'warning' as const,
          icon: <SignalWifi4Bar />,
          bgColor: '#ff9800',
          textColor: 'white',
          description: `${Math.round(connectionProgress)}% concluído`
        };
      
      case 'error':
        return {
          label: 'Erro de Conexão',
          color: 'error' as const,
          icon: <Error />,
          bgColor: '#f44336',
          textColor: 'white',
          description: 'Toque para reconectar'
        };
      
      case 'disconnected':
      default:
        return {
          label: 'WhatsApp Desconectado',
          color: 'default' as const,
          icon: <SignalWifiOff />,
          bgColor: '#757575',
          textColor: 'white',
          description: 'Clique para conectar'
        };
    }
  };

  const config = getStatusConfig();

  // 📊 Formatação de tempo
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  // 🎯 Renderização baseada na variante
  const renderChipVariant = () => (
    <Tooltip 
      title={
        <Box>
          <Typography variant="body2">{config.description}</Typography>
          {showLastUpdate && lastUpdated && (
            <Typography variant="caption" display="block">
              Atualizado: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          {timeElapsed > 0 && (
            <Typography variant="caption" display="block">
              Tempo: {formatTime(timeElapsed)}
            </Typography>
          )}
        </Box>
      }
    >
      <Chip
        label={config.label}
        color={config.color}
        icon={config.icon}
        onClick={onClick}
        clickable={!!onClick}
        sx={{
          animation: animate && (status === 'connecting' || status === 'scanning') 
            ? 'pulse 2s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { opacity: 1, transform: 'scale(1)' },
            '50%': { opacity: 0.8, transform: 'scale(1.02)' },
            '100%': { opacity: 1, transform: 'scale(1)' }
          }
        }}
      />
    </Tooltip>
  );

  const renderInlineVariant = () => (
    <Box display="flex" alignItems="center" gap={1}>
      <Zoom in timeout={300}>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            bgcolor: config.bgColor,
            animation: animate && (status === 'connecting' || status === 'scanning')
              ? 'blink 1.5s infinite' : 'none',
            '@keyframes blink': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.3 }
            }
          }}
        />
      </Zoom>
      
      <Typography variant="body2" color="text.primary">
        {config.label}
      </Typography>
      
      {onRefresh && (
        <IconButton size="small" onClick={onRefresh}>
          <Refresh fontSize="small" />
        </IconButton>
      )}
    </Box>
  );

  const renderDetailedVariant = () => (
    <Box 
      onClick={onClick}
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { opacity: 0.9 } : {}
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <Badge 
            badgeContent={connected ? "●" : "○"} 
            color={connected ? "success" : "default"}
            sx={{ '& .MuiBadge-badge': { right: -2, top: 2 } }}
          >
            {config.icon}
          </Badge>
          <Typography variant="subtitle2">{config.label}</Typography>
        </Box>
        
        {onRefresh && (
          <IconButton size="small" onClick={onRefresh}>
            <Refresh fontSize="small" />
          </IconButton>
        )}
      </Box>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {config.description}
      </Typography>
      
      {/* Progress bar para scanning */}
      {showProgress && (status === 'scanning' || status === 'connecting') && (
        <Fade in timeout={500}>
          <Box>
            <LinearProgress 
              variant="determinate" 
              value={connectionProgress}
              sx={{ 
                height: 6,
                borderRadius: 3,
                bgcolor: 'rgba(0,0,0,0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: config.bgColor,
                  borderRadius: 3
                }
              }}
            />
            <Box display="flex" justifyContent="space-between" mt={0.5}>
              <Typography variant="caption">
                {Math.round(connectionProgress)}%
              </Typography>
              {estimatedTimeLeft > 0 && (
                <Typography variant="caption">
                  ~{formatTime(estimatedTimeLeft)}
                </Typography>
              )}
            </Box>
          </Box>
        </Fade>
      )}
      
      {/* Tempo decorrido */}
      {timeElapsed > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          <Schedule fontSize="inherit" />
          {formatTime(timeElapsed)}
        </Typography>
      )}
    </Box>
  );

  const renderCompactVariant = () => (
    <Box display="flex" alignItems="center" gap={1}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: config.bgColor,
          animation: animate && !connected ? 'pulse 2s infinite' : 'none'
        }}
      />
      <Typography variant="caption" noWrap>
        {config.label}
      </Typography>
    </Box>
  );

  // 🎯 Render baseado na variante
  switch (variant) {
    case 'inline':
      return renderInlineVariant();
    case 'detailed':
      return renderDetailedVariant();
    case 'compact':
      return renderCompactVariant();
    case 'chip':
    default:
      return renderChipVariant();
  }
}