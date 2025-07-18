'use client';

import React from 'react';
import { 
  Button, 
  ButtonProps, 
  styled, 
  keyframes,
  alpha,
  Box,
  CircularProgress,
  Typography
} from '@mui/material';

// Elegant ripple animation
const rippleAnimation = keyframes`
  0% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.3;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
`;

// Floating animation for hover
const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-2px);
  }
`;

// Styled button with modern design
const StyledModernButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'isLoading' && prop !== 'variant' && prop !== 'size'
})<{ 
  variant?: 'primary' | 'secondary' | 'elegant' | 'gradient' | 'glass';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
}>(({ theme, variant: customVariant, size, isLoading }) => ({
  position: 'relative',
  overflow: 'hidden',
  fontWeight: 600,
  textTransform: 'none',
  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  borderRadius: customVariant === 'elegant' ? '12px' : '8px',
  minHeight: size === 'small' ? '36px' : size === 'large' ? '48px' : '42px',
  paddingX: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px',
  paddingY: size === 'small' ? '8px' : size === 'large' ? '12px' : '10px',
  boxShadow: customVariant === 'primary' 
    ? `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.25)}`
    : customVariant === 'elegant'
    ? `0 8px 25px -8px ${alpha(theme.palette.primary.main, 0.3)}`
    : `0 2px 8px ${alpha(theme.palette.grey[500], 0.15)}`,
  
  // Variant-specific styles
  ...(customVariant === 'primary' && {
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    color: theme.palette.primary.contrastText,
    border: 'none',
    '&:hover': {
      background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
      transform: 'translateY(-2px)',
      boxShadow: `0 8px 25px -8px ${alpha(theme.palette.primary.main, 0.4)}`,
    },
  }),
  
  ...(customVariant === 'secondary' && {
    background: alpha(theme.palette.primary.main, 0.08),
    color: theme.palette.primary.main,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
    '&:hover': {
      background: alpha(theme.palette.primary.main, 0.12),
      borderColor: theme.palette.primary.main,
      transform: 'translateY(-1px)',
    },
  }),
  
  ...(customVariant === 'elegant' && {
    background: `linear-gradient(135deg, 
      ${alpha(theme.palette.primary.main, 0.95)} 0%, 
      ${alpha(theme.palette.primary.dark, 0.95)} 50%,
      ${alpha(theme.palette.primary.main, 0.95)} 100%)`,
    color: theme.palette.primary.contrastText,
    border: `1px solid ${alpha(theme.palette.primary.light, 0.3)}`,
    backdropFilter: 'blur(10px)',
    '&:hover': {
      background: `linear-gradient(135deg, 
        ${theme.palette.primary.dark} 0%, 
        ${theme.palette.primary.main} 50%,
        ${theme.palette.primary.dark} 100%)`,
      transform: 'translateY(-3px) scale(1.02)',
      boxShadow: `0 12px 35px -10px ${alpha(theme.palette.primary.main, 0.4)}`,
      animation: `${floatAnimation} 2s ease-in-out infinite`,
    },
  }),
  
  ...(customVariant === 'gradient' && {
    background: `linear-gradient(45deg, 
      ${theme.palette.primary.main} 0%, 
      ${theme.palette.secondary.main} 50%,
      ${theme.palette.primary.main} 100%)`,
    backgroundSize: '200% 200%',
    color: theme.palette.primary.contrastText,
    border: 'none',
    animation: `${rippleAnimation} 3s ease-in-out infinite`,
    '&:hover': {
      backgroundPosition: '100% 100%',
      transform: 'translateY(-2px)',
      boxShadow: `0 10px 30px -8px ${alpha(theme.palette.primary.main, 0.5)}`,
    },
  }),
  
  ...(customVariant === 'glass' && {
    background: alpha(theme.palette.background.paper, 0.1),
    backdropFilter: 'blur(20px)',
    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
    color: theme.palette.primary.main,
    '&:hover': {
      background: alpha(theme.palette.primary.main, 0.1),
      border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
      transform: 'translateY(-2px)',
      boxShadow: `0 10px 25px -5px ${alpha(theme.palette.primary.main, 0.2)}`,
    },
  }),
  
  // Loading state
  ...(isLoading && {
    pointerEvents: 'none',
    opacity: 0.7,
  }),
  
  // Active state
  '&:active': {
    transform: 'translateY(0px) scale(0.98)',
  },
  
  // Focus state
  '&:focus': {
    outline: 'none',
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
  
  // Disabled state
  '&:disabled': {
    background: alpha(theme.palette.grey[400], 0.3),
    color: theme.palette.grey[500],
    boxShadow: 'none',
    cursor: 'not-allowed',
  },
  
  // Icon spacing
  '& .MuiButton-startIcon': {
    marginRight: '8px',
    marginLeft: '-4px',
  },
  
  '& .MuiButton-endIcon': {
    marginLeft: '8px',
    marginRight: '-4px',
  },
  
  // Responsive adjustments
  [theme.breakpoints.down('sm')]: {
    minHeight: size === 'large' ? '44px' : '38px',
    paddingX: size === 'large' ? '20px' : '16px',
    fontSize: size === 'large' ? '0.95rem' : '0.875rem',
  },
}));

// Loading overlay
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
  borderRadius: 'inherit',
}));

export interface ModernButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
  variant?: 'primary' | 'secondary' | 'elegant' | 'gradient' | 'glass';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const ModernButton: React.FC<ModernButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  loadingText = 'Carregando...',
  icon,
  children,
  disabled,
  ...props
}) => {
  return (
    <StyledModernButton
      variant={variant}
      size={size}
      isLoading={loading}
      disabled={disabled || loading}
      startIcon={!loading && icon}
      {...props}
    >
      {loading ? (
        <LoadingOverlay>
          <CircularProgress size={18} sx={{ mr: 1 }} />
          <Typography variant="body2">{loadingText}</Typography>
        </LoadingOverlay>
      ) : (
        children
      )}
    </StyledModernButton>
  );
};

export default ModernButton;