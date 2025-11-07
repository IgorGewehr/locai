'use client';

import React from 'react';
import { Box, Typography, Tooltip, CircularProgress } from '@mui/material';
import {
  WhatsApp,
  CheckCircle,
  Error as ErrorIcon,
  Sync as SyncIcon,
  QrCode2,
} from '@mui/icons-material';
import { useWhatsAppStatus } from '@/lib/hooks/useWhatsAppStatus';
import { useRouter } from 'next/navigation';

interface WhatsAppStatusIndicatorProps {
  variant?: 'full' | 'compact' | 'icon-only' | 'mini';
  showText?: boolean;
  clickable?: boolean;
  size?: 'small' | 'medium' | 'large';
  onRefresh?: () => void;
  autoRefresh?: boolean;
}

export default function WhatsAppStatusIndicator({
  variant = 'full',
  showText = true,
  clickable = true,
  size = 'medium',
  onRefresh,
  autoRefresh = false
}: WhatsAppStatusIndicatorProps) {
  const router = useRouter();
  const { 
    status, 
    isLoading, 
    getIndicator, 
    refreshStatus,
    phoneNumber 
  } = useWhatsAppStatus(autoRefresh);

  const indicator = getIndicator();

  // Configurações de tamanho
  const sizeConfig = {
    small: {
      icon: 16,
      fontSize: '0.7rem',
      padding: { xs: 1, md: 1.5 },
      height: { xs: 32, md: 36 }
    },
    medium: {
      icon: 20,
      fontSize: '0.75rem',
      padding: { xs: 1.5, md: 2 },
      height: { xs: 36, md: 40 }
    },
    large: {
      icon: 24,
      fontSize: '0.875rem',
      padding: { xs: 2, md: 2.5 },
      height: { xs: 44, md: 48 }
    }
  };

  const config = sizeConfig[size];

  // Função de clique com melhor suporte mobile
  const handleClick = async (e?: React.MouseEvent | React.TouchEvent) => {
    // Prevenir comportamento padrão para garantir funcionamento no mobile
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (onRefresh) {
      onRefresh();
    } else if (clickable) {
      // Se não tiver onRefresh customizado, navegar para settings
      console.log('🔄 WhatsApp button clicked, navigating to settings');
      router.push('/dashboard/settings');
    }
  };

  // Renderizar ícone baseado no status
  const renderIcon = () => {
    if (isLoading) {
      return (
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <CircularProgress 
            size={config.icon - 4} 
            thickness={2}
            sx={{ 
              color: 'primary.main',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
          <WhatsApp 
            sx={{ 
              position: 'absolute',
              fontSize: config.icon * 0.6,
              color: 'primary.main',
              opacity: 0.3,
              left: '50%',
              transform: 'translateX(-50%)'
            }} 
          />
        </Box>
      );
    }

    switch (status) {
      case 'connected':
        return (
          <CheckCircle 
            sx={{ 
              fontSize: config.icon, 
              color: 'success.main',
              animation: 'fadeIn 0.3s ease-in'
            }} 
          />
        );
      case 'qr':
        return (
          <QrCode2 
            sx={{ 
              fontSize: config.icon, 
              color: 'warning.main',
              animation: 'pulse 2s ease-in-out infinite'
            }} 
          />
        );
      case 'connecting':
        return (
          <SyncIcon 
            sx={{ 
              fontSize: config.icon, 
              color: 'info.main',
              animation: 'spin 1s linear infinite' 
            }} 
          />
        );
      case 'error':
        return (
          <ErrorIcon 
            sx={{ 
              fontSize: config.icon, 
              color: 'error.main',
              animation: 'shake 0.5s ease-in-out'
            }} 
          />
        );
      default:
        return (
          <WhatsApp 
            sx={{ 
              fontSize: config.icon, 
              color: 'text.secondary',
              opacity: 0.7
            }} 
          />
        );
    }
  };

  // Texto do tooltip
  const getTooltipText = () => {
    if (isLoading) return 'Verificando status...';
    if (phoneNumber) return `${indicator.text} - ${phoneNumber}`;
    return clickable ? `${indicator.text} - Clique para configurar` : indicator.text;
  };

  // Renderização baseada na variante
  if (variant === 'icon-only') {
    return (
      <Tooltip title={getTooltipText()}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: config.height,
            height: config.height,
            borderRadius: '50%',
            backgroundColor: status === 'connected' 
              ? 'rgba(16, 185, 129, 0.1)' 
              : 'rgba(255, 255, 255, 0.08)',
            cursor: clickable ? 'pointer' : 'default',
            transition: 'all 0.3s ease',
            '&:hover': clickable ? {
              backgroundColor: status === 'connected'
                ? 'rgba(16, 185, 129, 0.2)'
                : 'action.hover',
              transform: 'scale(1.05)',
            } : {}
          }}
          onClick={handleClick}
          onTouchEnd={handleClick}
          role="button"
          tabIndex={clickable ? 0 : -1}
          aria-label="WhatsApp Status"
        >
          {renderIcon()}
        </Box>
      </Tooltip>
    );
  }

  // Variante mini para sidebar
  if (variant === 'mini') {
    return (
      <Tooltip title={getTooltipText()}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 2,
            backgroundColor: status === 'connected' 
              ? 'rgba(16, 185, 129, 0.1)' 
              : 'rgba(255, 255, 255, 0.05)',
            border: '1px solid',
            borderColor: status === 'connected'
              ? 'rgba(16, 185, 129, 0.4)'
              : 'rgba(255, 255, 255, 0.1)',
            cursor: clickable ? 'pointer' : 'default',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden',
            animation: 'slideIn 0.3s ease-out',
            '&:hover': clickable ? {
              backgroundColor: status === 'connected'
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(255, 255, 255, 0.1)',
              borderColor: status === 'connected'
                ? 'rgba(16, 185, 129, 0.6)'
                : 'primary.main',
              transform: 'scale(1.1)',
            } : {},
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: status === 'connected' 
                ? 'linear-gradient(90deg, #10b981, #059669)' 
                : status === 'qr'
                ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                : status === 'connecting'
                ? 'linear-gradient(90deg, #3b82f6, #1d4ed8)'
                : 'linear-gradient(90deg, #ef4444, #dc2626)',
            }
          }}
          onClick={handleClick}
          onTouchEnd={handleClick}
          role="button"
          tabIndex={clickable ? 0 : -1}
          aria-label="WhatsApp Status Mini"
        >
          <Box sx={{ fontSize: 14 }}>
            {isLoading ? (
              <CircularProgress size={12} thickness={2} sx={{ color: 'primary.main' }} />
            ) : (
              renderIcon()
            )}
          </Box>
        </Box>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={getTooltipText()}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: config.padding,
          py: variant === 'compact' ? 0.5 : config.padding.xs,
          borderRadius: variant === 'compact' ? 1.5 : 2,
          backgroundColor: status === 'connected' 
            ? 'rgba(16, 185, 129, 0.1)' 
            : 'rgba(255, 255, 255, 0.08)',
          border: '1px solid',
          borderColor: status === 'connected'
            ? 'rgba(16, 185, 129, 0.3)'
            : 'rgba(255, 255, 255, 0.15)',
          color: indicator.color,
          cursor: clickable ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          minHeight: config.height,
          gap: 1,
          '&:hover': clickable ? {
            backgroundColor: status === 'connected'
              ? 'rgba(16, 185, 129, 0.2)'
              : 'action.selected',
            borderColor: status === 'connected'
              ? 'rgba(16, 185, 129, 0.5)'
              : 'primary.main',
            transform: 'translateY(-2px)',
            boxShadow: 2,
          } : {}
        }}
        onClick={handleClick}
        onTouchEnd={handleClick}
        role="button"
        tabIndex={clickable ? 0 : -1}
        aria-label={`WhatsApp Status: ${indicator.text}`}
      >
        {renderIcon()}
        
        {showText && (
          <Typography 
            variant="caption" 
            fontWeight={500}
            sx={{ 
              fontSize: config.fontSize,
              display: variant === 'compact' ? { xs: 'none', sm: 'block' } : 'block',
              whiteSpace: 'nowrap',
            }}
          >
            {variant === 'compact' ? 'WhatsApp' : indicator.text}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
}

// CSS para animações
if (typeof window !== 'undefined' && !document.getElementById('whatsapp-status-styles')) {
  const style = document.createElement('style');
  style.id = 'whatsapp-status-styles';
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes pulse {
      0%, 100% { 
        opacity: 1;
        transform: scale(1);
      }
      50% { 
        opacity: 0.7;
        transform: scale(0.95);
      }
    }
    
    @keyframes fadeIn {
      from { 
        opacity: 0;
        transform: scale(0.8);
      }
      to { 
        opacity: 1;
        transform: scale(1);
      }
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}