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
  Backdrop,
  Button,
  Chip,
  Stack,
  LinearProgress,
  Container
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Fullscreen as FullscreenIcon,
  SchoolOutlined as SchoolIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle as CheckIcon,
  Lightbulb as TipIcon
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
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

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
        setProgress(100);
        logger.info('📺 [FirstAccess] Vídeo assistido completamente');
      });
      
      video.addEventListener('timeupdate', () => {
        if (video.duration) {
          const progressPercent = (video.currentTime / video.duration) * 100;
          setProgress(progressPercent);
          setCurrentTime(video.currentTime);
        }
      });
      
      video.addEventListener('loadedmetadata', () => {
        setDuration(video.duration);
        setIsVideoLoaded(true);
        logger.info('📺 [FirstAccess] Vídeo carregado', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        });
      });
      
      video.addEventListener('loadstart', () => {
        setIsVideoLoaded(false);
      });
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          width: isMobile ? '100vw' : 'min(95vw, 1100px)',
          height: isMobile ? '100vh' : 'auto',
          maxWidth: 'none',
          maxHeight: 'none',
        },
        '& .MuiBackdrop-root': {
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
          backdropFilter: 'blur(20px)',
        }
      }}
      BackdropComponent={Backdrop}
    >
      <Fade in={open} timeout={500}>
        <DialogContent
          sx={{
            padding: 0,
            position: 'relative',
            height: isMobile ? '100vh' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'transparent',
          }}
        >
          {/* Header Profissional */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              borderTopLeftRadius: isMobile ? 0 : 16,
              borderTopRightRadius: isMobile ? 0 : 16,
              px: isMobile ? 2 : 4,
              py: isMobile ? 2 : 3,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, #10b981, #059669, #0891b2)',
                borderTopLeftRadius: isMobile ? 0 : 16,
                borderTopRightRadius: isMobile ? 0 : 16,
              }
            }}
          >
            {/* Header Content */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      inset: -2,
                      borderRadius: '14px',
                      background: 'linear-gradient(45deg, #10b981, #059669, #0891b2, #10b981)',
                      zIndex: -1,
                      opacity: 0.6,
                      animation: 'rotate 3s linear infinite',
                      '@keyframes rotate': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' },
                      }
                    }
                  }}
                >
                  <WhatsAppIcon sx={{ color: 'white', fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      color: 'white',
                      fontWeight: 700,
                      fontSize: isMobile ? '1.25rem' : '1.5rem',
                      mb: 0.5,
                      background: 'linear-gradient(135deg, #ffffff, #e2e8f0)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    Tutorial de Conexão WhatsApp
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Chip
                      icon={<SchoolIcon />}
                      label="Tutorial Oficial"
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        backdropFilter: 'blur(8px)',
                        fontWeight: 600,
                        '& .MuiChip-icon': { color: '#60a5fa' },
                        '&:hover': {
                          backgroundColor: 'rgba(59, 130, 246, 0.25)',
                          transform: 'translateY(-1px)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    />
                    <Chip
                      icon={<TipIcon />}
                      label="Opcional"
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        backdropFilter: 'blur(8px)',
                        fontWeight: 600,
                        '& .MuiChip-icon': { color: '#fbbf24' },
                        '&:hover': {
                          backgroundColor: 'rgba(245, 158, 11, 0.25)',
                          transform: 'translateY(-1px)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    />
                  </Stack>
                </Box>
              </Stack>
              
              {/* Close Button */}
              <IconButton
                onClick={handleClose}
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  width: 44,
                  height: 44,
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    transform: 'scale(1.05)',
                    '&::before': {
                      transform: 'translateX(0%)',
                    }
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(45deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))',
                    transform: 'translateX(-100%)',
                    transition: 'transform 0.3s ease',
                    zIndex: -1,
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            
            {/* Progress Bar */}
            {isVideoLoaded && (
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Progresso do vídeo
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #10b981, #059669)',
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Container do vídeo */}
          <Box
            sx={{
              position: 'relative',
              backgroundColor: '#000',
              borderBottomLeftRadius: isMobile ? 0 : 16,
              borderBottomRightRadius: isMobile ? 0 : 16,
              overflow: 'hidden',
              minHeight: isMobile ? 'calc(100vh - 200px)' : 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Loading State */}
            {!isVideoLoaded && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
                  zIndex: 1,
                }}
              >
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(1)', opacity: 1 },
                      '50%': { transform: 'scale(1.05)', opacity: 0.8 },
                      '100%': { transform: 'scale(1)', opacity: 1 },
                    },
                  }}
                >
                  <PlayIcon sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: 'white', 
                    mb: 1,
                    animation: 'fadeInOut 2s ease-in-out infinite',
                    '@keyframes fadeInOut': {
                      '0%': { opacity: 0.7 },
                      '50%': { opacity: 1 },
                      '100%': { opacity: 0.7 },
                    },
                  }}
                >
                  Carregando vídeo...
                </Typography>
                <LinearProgress
                  sx={{
                    width: 200,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #10b981, #059669, #0891b2, #10b981)',
                      backgroundSize: '200% 100%',
                      borderRadius: 2,
                      animation: 'shimmer 2s ease-in-out infinite',
                      '@keyframes shimmer': {
                        '0%': { backgroundPosition: '-200% 0' },
                        '100%': { backgroundPosition: '200% 0' },
                      },
                    },
                  }}
                />
              </Box>
            )}
            
            {/* Vídeo principal */}
            <video
              ref={handleVideoRef}
              src={TUTORIAL_VIDEO_URL}
              controls
              preload="metadata"
              playsInline
              controlsList="nodownload"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: '#000',
                borderBottomLeftRadius: isMobile ? 0 : 16,
                borderBottomRightRadius: isMobile ? 0 : 16,
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

            {/* Floating Action Button */}
            {isVideoLoaded && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 20,
                  right: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  opacity: 0.8,
                  transition: 'opacity 0.3s ease',
                  '&:hover': {
                    opacity: 1,
                  },
                }}
              >
                <IconButton
                  onClick={togglePlay}
                  sx={{
                    backgroundColor: 'rgba(16, 185, 129, 0.9)',
                    color: 'white',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    width: 48,
                    height: 48,
                    '&:hover': {
                      backgroundColor: 'rgba(16, 185, 129, 1)',
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </IconButton>

                <IconButton
                  onClick={toggleMute}
                  sx={{
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    color: 'white',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    width: 44,
                    height: 44,
                    '&:hover': {
                      backgroundColor: 'rgba(30, 41, 59, 1)',
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                </IconButton>

                {!isMobile && (
                  <IconButton
                    onClick={toggleFullscreen}
                    sx={{
                      backgroundColor: 'rgba(30, 41, 59, 0.9)',
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      width: 44,
                      height: 44,
                      '&:hover': {
                        backgroundColor: 'rgba(30, 41, 59, 1)',
                        transform: 'scale(1.05)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <FullscreenIcon />
                  </IconButton>
                )}
              </Box>
            )}
          </Box>

          {/* Footer Actions */}
          {!isMobile && (
            <Box
              sx={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))',
                backdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                px: 4,
                py: 3,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      animation: 'pulse 2s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%': { transform: 'scale(1)', opacity: 1 },
                        '50%': { transform: 'scale(1.1)', opacity: 0.8 },
                        '100%': { transform: 'scale(1)', opacity: 1 },
                      },
                    }}
                  >
                    <CheckIcon sx={{ color: 'white', fontSize: 14 }} />
                  </Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Este tutorial é <strong>opcional</strong> e pode ser fechado a qualquer momento
                  </Typography>
                </Stack>
                
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    onClick={handleClose}
                    sx={{
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Pular Tutorial
                  </Button>
                  
                  <Button
                    variant="contained"
                    onClick={() => {
                      if (videoRef) {
                        if (isPlaying) {
                          videoRef.pause();
                        } else {
                          videoRef.play();
                        }
                      }
                    }}
                    startIcon={isPlaying ? <PauseIcon /> : <PlayIcon />}
                    sx={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #059669, #047857)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isPlaying ? 'Pausar' : 'Reproduzir'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </DialogContent>
      </Fade>
    </Dialog>
  );
}