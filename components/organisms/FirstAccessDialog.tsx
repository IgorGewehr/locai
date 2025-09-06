'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  Fade,
  Backdrop
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Fullscreen as FullscreenIcon
} from '@mui/icons-material';
import { logger } from '@/lib/utils/logger';

interface FirstAccessDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const TUTORIAL_VIDEO_URL = 'https://firebasestorage.googleapis.com/v0/b/locai-76dcf.firebasestorage.app/o/C%C3%B3pia%20de%20como%20conectar%20WhatsApp.mp4?alt=media&token=b95b879e-f7ec-400b-bdcd-4e64e1229153';

export default function FirstAccessDialog({ open, onClose, onComplete }: FirstAccessDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);

  const handleClose = () => {
    logger.info('📺 [FirstAccess] Dialog fechado pelo usuário');
    
    // Pausar vídeo ao fechar
    if (videoRef) {
      videoRef.pause();
      setIsPlaying(false);
    }
    
    onClose();
    onComplete?.();
  };

  const handleVideoRef = (video: HTMLVideoElement | null) => {
    setVideoRef(video);
    
    if (video) {
      // Event listeners para controle do player
      video.addEventListener('play', () => setIsPlaying(true));
      video.addEventListener('pause', () => setIsPlaying(false));
      video.addEventListener('ended', () => {
        setIsPlaying(false);
        logger.info('📺 [FirstAccess] Vídeo assistido completamente');
      });
      
      // Log quando vídeo carrega
      video.addEventListener('loadedmetadata', () => {
        logger.info('📺 [FirstAccess] Vídeo carregado', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        });
      });
    }
  };

  const togglePlay = () => {
    if (!videoRef) return;
    
    if (isPlaying) {
      videoRef.pause();
    } else {
      videoRef.play();
    }
  };

  const toggleMute = () => {
    if (!videoRef) return;
    
    videoRef.muted = !videoRef.muted;
    setIsMuted(videoRef.muted);
  };

  const toggleFullscreen = () => {
    if (!videoRef) return;
    
    if (videoRef.requestFullscreen) {
      videoRef.requestFullscreen();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: 'transparent',
          boxShadow: 'none',
          margin: isMobile ? 0 : 2,
          width: isMobile ? '100vw' : 'min(90vw, 900px)',
          height: isMobile ? '100vh' : 'min(90vh, 600px)',
          maxWidth: 'none',
          maxHeight: 'none',
        },
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
        }
      }}
      BackdropComponent={Backdrop}
    >
      <Fade in={open} timeout={300}>
        <DialogContent
          sx={{
            padding: 0,
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'transparent',
          }}
        >
          {/* Header com botão de fechar */}
          <Box
            sx={{
              position: 'absolute',
              top: isMobile ? 8 : 16,
              right: isMobile ? 8 : 16,
              zIndex: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '50%',
              backdropFilter: 'blur(4px)',
            }}
          >
            <IconButton
              onClick={handleClose}
              sx={{
                color: 'white',
                padding: isMobile ? 1 : 1.5,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
              size={isMobile ? 'medium' : 'large'}
            >
              <CloseIcon fontSize={isMobile ? 'medium' : 'large'} />
            </IconButton>
          </Box>

          {/* Título opcional para mobile */}
          {isMobile && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: 16,
                zIndex: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                borderRadius: 1,
                px: 2,
                py: 1,
                backdropFilter: 'blur(4px)',
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Tutorial de Conexão
              </Typography>
            </Box>
          )}

          {/* Container do vídeo */}
          <Box
            sx={{
              flex: 1,
              position: 'relative',
              backgroundColor: '#000',
              borderRadius: isMobile ? 0 : 2,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Vídeo principal */}
            <video
              ref={handleVideoRef}
              src={TUTORIAL_VIDEO_URL}
              controls
              preload="metadata"
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: '#000',
              }}
              onError={(e) => {
                logger.error('❌ [FirstAccess] Erro ao carregar vídeo', new Error('Video load error'));
                console.error('Video error:', e);
              }}
              onLoadStart={() => {
                logger.info('📺 [FirstAccess] Iniciando carregamento do vídeo');
              }}
            >
              <track kind="captions" />
            </video>

            {/* Overlay de controles customizados (opcional) */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                display: 'flex',
                gap: 1,
                opacity: 0,
                transition: 'opacity 0.3s ease',
                '&:hover': {
                  opacity: 1,
                },
              }}
            >
              <IconButton
                onClick={togglePlay}
                sx={{
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  },
                }}
                size="small"
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </IconButton>

              <IconButton
                onClick={toggleMute}
                sx={{
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  },
                }}
                size="small"
              >
                {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>

              {!isMobile && (
                <IconButton
                  onClick={toggleFullscreen}
                  sx={{
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    },
                  }}
                  size="small"
                >
                  <FullscreenIcon />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Footer informativo (apenas desktop) */}
          {!isMobile && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                borderRadius: 1,
                px: 3,
                py: 1,
                backdropFilter: 'blur(4px)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'white',
                  fontSize: '0.75rem',
                }}
              >
                Tutorial opcional - Pressione ESC ou clique no X para fechar
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Fade>
    </Dialog>
  );
}