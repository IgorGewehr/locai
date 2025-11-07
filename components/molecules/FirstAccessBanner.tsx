'use client';

import { useState } from 'react';
import {
  Box,
  Alert,
  Button,
  IconButton,
  Typography,
  Fade
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayCircle as PlayIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { useFirstAccess } from '@/lib/hooks/useFirstAccess';
import FirstAccessDialog from '@/components/organisms/FirstAccessDialog';

interface FirstAccessBannerProps {
  variant?: 'banner' | 'card';
  showOnlyButton?: boolean;
}

/**
 * Banner opcional para mostrar tutorial em outras páginas
 * Complementa o dialog automático do dashboard
 */
export default function FirstAccessBanner({ 
  variant = 'banner', 
  showOnlyButton = false 
}: FirstAccessBannerProps) {
  const { isFirstAccess, markAsViewed } = useFirstAccess();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);

  // Se não é primeiro acesso, não mostrar nada
  if (!isFirstAccess || !bannerVisible) {
    return null;
  }

  const handleOpenTutorial = () => {
    setDialogOpen(true);
  };

  const handleCloseTutorial = () => {
    setDialogOpen(false);
  };

  const handleCompleteTutorial = async () => {
    setDialogOpen(false);
    setBannerVisible(false);
    await markAsViewed();
  };

  const handleDismissBanner = () => {
    setBannerVisible(false);
  };

  // Apenas botão
  if (showOnlyButton) {
    return (
      <>
        <Button
          onClick={handleOpenTutorial}
          startIcon={<PlayIcon />}
          variant="outlined"
          size="small"
          sx={{
            borderColor: 'primary.main',
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.main',
              color: 'white',
            },
          }}
        >
          Ver Tutorial
        </Button>

        <FirstAccessDialog
          open={dialogOpen}
          onClose={handleCloseTutorial}
          onComplete={handleCompleteTutorial}
        />
      </>
    );
  }

  // Banner completo
  if (variant === 'banner') {
    return (
      <Fade in timeout={500}>
        <Alert
          severity="info"
          icon={<SchoolIcon />}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                onClick={handleOpenTutorial}
                size="small"
                startIcon={<PlayIcon />}
                sx={{
                  color: 'inherit',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Assistir
              </Button>
              <IconButton
                onClick={handleDismissBanner}
                size="small"
                sx={{
                  color: 'inherit',
                  ml: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
          sx={{
            mb: 2,
            borderRadius: 2,
            '& .MuiAlert-message': {
              flex: 1,
            },
          }}
        >
          <Typography variant="body2" component="div">
            <Box component="span" fontWeight={600}>
              Novo por aqui?
            </Box>
            {' '}
            Assista nosso tutorial rápido sobre como conectar o WhatsApp e começar a usar o sistema.
          </Typography>
        </Alert>

        <FirstAccessDialog
          open={dialogOpen}
          onClose={handleCloseTutorial}
          onComplete={handleCompleteTutorial}
        />
      </Fade>
    );
  }

  // Card variant
  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'primary.main',
          borderRadius: 2,
          backgroundColor: 'background.paper',
          mb: 2,
          position: 'relative',
        }}
      >
        <IconButton
          onClick={handleDismissBanner}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'text.secondary',
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, pr: 4 }}>
          <SchoolIcon color="primary" sx={{ mt: 0.5 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              Tutorial de Conexão WhatsApp
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Aprenda como conectar seu WhatsApp e começar a usar todas as funcionalidades do sistema.
            </Typography>
            <Button
              onClick={handleOpenTutorial}
              variant="contained"
              startIcon={<PlayIcon />}
              size="small"
            >
              Assistir Tutorial
            </Button>
          </Box>
        </Box>

        <FirstAccessDialog
          open={dialogOpen}
          onClose={handleCloseTutorial}
          onComplete={handleCompleteTutorial}
        />
      </Box>
    </Fade>
  );
}