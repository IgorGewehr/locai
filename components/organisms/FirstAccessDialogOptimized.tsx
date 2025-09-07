'use client';

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  Button,
  Stack,
  LinearProgress,
  Portal
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { logger } from '@/lib/utils/logger';

interface FirstAccessDialogOptimizedProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const TUTORIAL_VIDEO_URL = 'https://firebasestorage.googleapis.com/v0/b/locai-76dcf.firebasestorage.app/o/C%C3%B3pia%20de%20como%20conectar%20WhatsApp.mp4?alt=media&token=b95b879e-f7ec-400b-bdcd-4e64e1229153';

// Memoized header component
const DialogHeader = memo(({ onClose, isMobile }: { onClose: () => void; isMobile: boolean }) => (
  <Box
    sx={{
      background: 'rgba(15, 23, 42, 0.98)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      px: isMobile ? 2 : 3,
      py: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <Stack direction="row" alignItems="center" spacing={2}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <WhatsAppIcon sx={{ color: 'white', fontSize: 20 }} />
      </Box>
      <Box>
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            fontWeight: 600,
            fontSize: isMobile ? '1.1rem' : '1.25rem',
          }}
        >
          Conectar WhatsApp
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.75rem',
          }}
        >
          Tutorial rápido • 2 minutos
        </Typography>
      </Box>
    </Stack>
    
    <IconButton
      onClick={onClose}
      sx={{
        color: 'rgba(255, 255, 255, 0.9)',
        p: 1,
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        },
      }}
    >
      <CloseIcon />
    </IconButton>
  </Box>
));

DialogHeader.displayName = 'DialogHeader';

export default function FirstAccessDialogOptimized({ 
  open, 
  onClose, 
  onComplete 
}: FirstAccessDialogOptimizedProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVideoError, setIsVideoError] = useState(false);
  const [progress, setProgress] = useState(0);
  const closeTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Optimized close handler with debounce
  const handleClose = useCallback(() => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    
    // Immediate visual feedback
    logger.info('📺 [FirstAccess] Fechando tutorial');
    
    // Pause video immediately
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = ''; // Free memory
    }
    
    // Close dialog
    onClose();
    onComplete?.();
  }, [onClose, onComplete]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, handleClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      if (videoRef.current) {
        videoRef.current.src = '';
      }
    };
  }, []);

  // Video event handlers
  const handleVideoLoad = useCallback(() => {
    setIsVideoLoaded(true);
    setIsVideoError(false);
    logger.info('📺 [FirstAccess] Vídeo carregado');
  }, []);

  const handleVideoError = useCallback(() => {
    setIsVideoError(true);
    setIsVideoLoaded(false);
    logger.error('❌ [FirstAccess] Erro ao carregar vídeo', new Error('Video load failed'));
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && videoRef.current.duration) {
      const progressPercent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progressPercent);
    }
  }, []);

  // Lazy load video only when dialog opens
  useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current.load();
    }
  }, [open]);

  if (!open) return null;

  return (
    <Portal>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth={false}
        fullWidth
        fullScreen={isMobile}
        disableEscapeKeyDown={false}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(4px)',
            }
          }
        }}
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: '#0f172a',
            margin: isMobile ? 0 : 2,
            width: isMobile ? '100vw' : 'min(90vw, 900px)',
            maxWidth: 'none',
            borderRadius: isMobile ? 0 : 2,
            overflow: 'hidden',
          },
        }}
      >
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Optimized Header */}
          <DialogHeader onClose={handleClose} isMobile={isMobile} />

          {/* Video Container */}
          <Box
            sx={{
              position: 'relative',
              backgroundColor: '#000',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: isMobile ? 300 : 400,
            }}
          >
            {/* Loading/Error State */}
            {!isVideoLoaded && !isVideoError && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  zIndex: 1,
                }}
              >
                <PlayIcon sx={{ color: '#10b981', fontSize: 48, mb: 2 }} />
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Carregando vídeo...
                </Typography>
              </Box>
            )}

            {/* Error State */}
            {isVideoError && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  zIndex: 1,
                  p: 3,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body1" sx={{ color: 'white', mb: 2 }}>
                  Não foi possível carregar o vídeo
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3 }}>
                  Você pode acessar o tutorial a qualquer momento em Configurações
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleClose}
                  sx={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #059669, #047857)',
                    },
                  }}
                >
                  Continuar
                </Button>
              </Box>
            )}

            {/* Optimized Video */}
            <video
              ref={videoRef}
              src={TUTORIAL_VIDEO_URL}
              controls
              preload="none" // Don't preload until needed
              playsInline
              controlsList="nodownload"
              style={{
                width: '100%',
                height: '100%',
                maxHeight: isMobile ? 'calc(100vh - 200px)' : '500px',
                objectFit: 'contain',
                display: isVideoError ? 'none' : 'block',
              }}
              onLoadedData={handleVideoLoad}
              onError={handleVideoError}
              onTimeUpdate={handleTimeUpdate}
            >
              <track kind="captions" />
            </video>
          </Box>

          {/* Progress Bar */}
          {isVideoLoaded && !isVideoError && (
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #10b981, #059669)',
                },
              }}
            />
          )}

          {/* Footer Actions */}
          <Box
            sx={{
              background: 'rgba(15, 23, 42, 0.98)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              px: isMobile ? 2 : 3,
              py: 2,
            }}
          >
            <Stack 
              direction={isMobile ? 'column' : 'row'} 
              spacing={2} 
              justifyContent="space-between"
              alignItems={isMobile ? 'stretch' : 'center'}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.6)',
                  display: isMobile ? 'none' : 'block'
                }}
              >
                Este tutorial pode ser acessado novamente em Configurações
              </Typography>
              
              <Stack direction="row" spacing={2} justifyContent={isMobile ? 'space-between' : 'flex-end'}>
                <Button
                  variant="outlined"
                  onClick={handleClose}
                  fullWidth={isMobile}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                  }}
                >
                  Pular
                </Button>
                
                <Button
                  variant="contained"
                  onClick={handleClose}
                  fullWidth={isMobile}
                  sx={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #059669, #047857)',
                    },
                  }}
                >
                  Entendi
                </Button>
              </Stack>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    </Portal>
  );
}