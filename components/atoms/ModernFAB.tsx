'use client';

import React from 'react';
import { 
  Fab, 
  FabProps, 
  styled, 
  keyframes,
  alpha,
  Box,
  CircularProgress,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';

// Pulse animation
const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(25, 118, 210, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
`;

// Bounce animation
const bounceAnimation = keyframes`
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
`;

// Styled FAB with modern design
const StyledModernFAB = styled(Fab, {
  shouldForwardProp: (prop) => prop !== 'isLoading' && prop !== 'variant' && prop !== 'size'
})<{ 
  variant?: 'primary' | 'elegant' | 'gradient' | 'glass';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
}>(({ theme, variant: customVariant, size, isLoading }) => ({
  position: 'fixed',
  bottom: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px',
  right: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px',
  zIndex: 1000,
  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  width: size === 'small' ? '48px' : size === 'large' ? '64px' : '56px',
  height: size === 'small' ? '48px' : size === 'large' ? '64px' : '56px',
  
  // Variant-specific styles
  ...(customVariant === 'primary' && {
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    color: theme.palette.primary.contrastText,
    boxShadow: `0 8px 25px -8px ${alpha(theme.palette.primary.main, 0.4)}`,
    '&:hover': {
      background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
      transform: 'translateY(-4px) scale(1.05)',
      boxShadow: `0 12px 35px -10px ${alpha(theme.palette.primary.main, 0.5)}`,
      animation: `${pulseAnimation} 2s infinite`,
    },
  }),
  
  ...(customVariant === 'elegant' && {
    background: `linear-gradient(135deg, 
      ${alpha(theme.palette.primary.main, 0.95)} 0%, 
      ${alpha(theme.palette.primary.dark, 0.95)} 50%,
      ${alpha(theme.palette.primary.main, 0.95)} 100%)`,
    backdropFilter: 'blur(20px)',
    border: `1px solid ${alpha(theme.palette.primary.light, 0.3)}`,
    boxShadow: `0 12px 35px -10px ${alpha(theme.palette.primary.main, 0.3)}`,
    '&:hover': {
      background: `linear-gradient(135deg, 
        ${theme.palette.primary.dark} 0%, 
        ${theme.palette.primary.main} 50%,
        ${theme.palette.primary.dark} 100%)`,
      transform: 'translateY(-6px) scale(1.08)',
      boxShadow: `0 20px 45px -15px ${alpha(theme.palette.primary.main, 0.6)}`,
      animation: `${bounceAnimation} 1s ease-in-out`,
    },
  }),
  
  ...(customVariant === 'gradient' && {
    background: `linear-gradient(45deg, 
      ${theme.palette.primary.main} 0%, 
      ${theme.palette.secondary.main} 50%,
      ${theme.palette.primary.main} 100%)`,
    backgroundSize: '200% 200%',
    animation: `${pulseAnimation} 3s ease-in-out infinite`,
    boxShadow: `0 10px 30px -8px ${alpha(theme.palette.primary.main, 0.4)}`,
    '&:hover': {
      backgroundPosition: '100% 100%',
      transform: 'translateY(-4px) scale(1.1)',
      boxShadow: `0 15px 40px -12px ${alpha(theme.palette.primary.main, 0.6)}`,
    },
  }),
  
  ...(customVariant === 'glass' && {
    background: alpha(theme.palette.background.paper, 0.1),
    backdropFilter: 'blur(25px)',
    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
    color: theme.palette.primary.main,
    boxShadow: `0 8px 25px -8px ${alpha(theme.palette.primary.main, 0.2)}`,
    '&:hover': {
      background: alpha(theme.palette.primary.main, 0.15),
      border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
      transform: 'translateY(-4px) scale(1.05)',
      boxShadow: `0 12px 35px -10px ${alpha(theme.palette.primary.main, 0.3)}`,
    },
  }),
  
  // Loading state
  ...(isLoading && {
    pointerEvents: 'none',
    opacity: 0.7,
  }),
  
  // Active state
  '&:active': {
    transform: 'translateY(-2px) scale(0.95)',
  },
  
  // Focus state
  '&:focus': {
    outline: 'none',
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.3)}`,
  },
  
  // Disabled state
  '&:disabled': {
    background: alpha(theme.palette.grey[400], 0.3),
    color: theme.palette.grey[500],
    boxShadow: 'none',
    cursor: 'not-allowed',
  },
  
  // Mobile adjustments
  [theme.breakpoints.down('sm')]: {
    width: size === 'large' ? '56px' : '48px',
    height: size === 'large' ? '56px' : '48px',
    bottom: '16px',
    right: '16px',
  },
}));

// Loading overlay for FAB
const LoadingOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(2px)',
  borderRadius: '50%',
}));

export interface ModernFABProps extends Omit<FabProps, 'variant' | 'size'> {
  variant?: 'primary' | 'elegant' | 'gradient' | 'glass';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  tooltip?: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

const ModernFAB: React.FC<ModernFABProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  tooltip = '',
  icon,
  disabled,
  onClick,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const fabContent = (
    <StyledModernFAB
      variant={variant}
      size={size}
      isLoading={loading}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <LoadingOverlay>
          <CircularProgress size={size === 'small' ? 20 : size === 'large' ? 28 : 24} />
        </LoadingOverlay>
      ) : (
        icon
      )}
    </StyledModernFAB>
  );
  
  if (tooltip && !loading) {
    return (
      <Tooltip 
        title={tooltip} 
        placement="left"
        arrow
        sx={{
          '& .MuiTooltip-tooltip': {
            bgcolor: alpha(theme.palette.grey[900], 0.9),
            backdropFilter: 'blur(10px)',
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: '6px',
            px: 1.5,
            py: 0.75,
          },
          '& .MuiTooltip-arrow': {
            color: alpha(theme.palette.grey[900], 0.9),
          },
        }}
      >
        {fabContent}
      </Tooltip>
    );
  }
  
  return fabContent;
};

export default ModernFAB;