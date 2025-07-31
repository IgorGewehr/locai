'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Stack,
  Chip,
  Dialog,
  DialogContent,
  useTheme,
  useMediaQuery,
  alpha,
  Zoom,
  Fade,
  Button,
  Grid,
  Paper,
  Backdrop,
} from '@mui/material';
import {
  Close,
  ArrowBack,
  ArrowForward,
  Fullscreen,
  FullscreenExit,
  ZoomIn,
  ZoomOut,
  RotateLeft,
  RotateRight,
  Download,
  Share,
  PhotoCamera,
  Videocam,
  ThreeSixty,
  PlayArrow,
  Pause,
  VolumeOff,
  VolumeUp,
  GridView,
  ViewCarousel,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicProperty } from '@/lib/types/mini-site';
import LazyImage from './LazyImage';

interface PropertyGalleryProps {
  property: PublicProperty;
  open: boolean;
  onClose: () => void;
  initialIndex?: number;
}

interface MediaItem {
  type: 'image' | 'video' | 'virtual-tour';
  url: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  order: number;
}

export default function PropertyGallery({ 
  property, 
  open, 
  onClose, 
  initialIndex = 0 
}: PropertyGalleryProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [showThumbnails, setShowThumbnails] = useState(true);

  // Combine all media into a single array
  const allMedia: MediaItem[] = [
    ...property.media.photos.map(photo => ({
      type: 'image' as const,
      url: photo.url,
      thumbnail: photo.thumbnailUrl || photo.url,
      title: photo.caption || property.name,
      description: photo.description,
      order: photo.order,
    })),
    ...(property.media.videos || []).map(video => ({
      type: 'video' as const,
      url: video.url,
      thumbnail: video.thumbnailUrl || '/video-placeholder.jpg',
      title: video.title || 'Vídeo da Propriedade',
      description: video.description,
      order: video.order || 1000,
    })),
    ...(property.virtualTourUrl ? [{
      type: 'virtual-tour' as const,
      url: property.virtualTourUrl,
      thumbnail: '/vr-placeholder.jpg',
      title: 'Tour Virtual 360°',
      description: 'Explore a propriedade em realidade virtual',
      order: 2000,
    }] : []),
  ].sort((a, b) => a.order - b.order);

  const currentMedia = allMedia[currentIndex];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Escape':
          onClose();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
        case 'R':
          handleRotateRight();
          break;
        case 'l':
        case 'L':
          handleRotateLeft();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex]);

  // Touch/swipe support
  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      const swipeDistance = touchStartX - touchEndX;
      
      if (Math.abs(swipeDistance) > 50) {
        if (swipeDistance > 0) {
          handleNext();
        } else {
          handlePrevious();
        }
      }
    };

    if (open) {
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [open]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
    resetImageState();
  }, [allMedia.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % allMedia.length);
    resetImageState();
  }, [allMedia.length]);

  const resetImageState = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleRotateLeft = () => {
    setRotation(prev => prev - 90);
  };

  const handleRotateRight = () => {
    setRotation(prev => prev + 90);
  };

  const handleDownload = async () => {
    if (currentMedia.type === 'image') {
      try {
        const response = await fetch(currentMedia.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${property.name}-${currentIndex + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Error downloading image:', error);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentMedia.title,
          text: currentMedia.description || `Veja esta imagem da propriedade ${property.name}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
  };

  const renderMedia = () => {
    switch (currentMedia.type) {
      case 'image':
        return (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease',
              }}
            >
              <LazyImage
                src={currentMedia.url}
                alt={currentMedia.title || ''}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
            </motion.div>
          </Box>
        );

      case 'video':
        return (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#000000',
            }}
          >
            <video
              controls
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
            >
              <source src={currentMedia.url} type="video/mp4" />
              Seu navegador não suporta vídeos.
            </video>
          </Box>
        );

      case 'virtual-tour':
        return (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#000000',
            }}
          >
            <iframe
              src={currentMedia.url}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              style={{
                border: 'none',
                borderRadius: 8,
              }}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  const renderThumbnails = () => {
    if (!showThumbnails || viewMode === 'grid') return null;

    return (
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(10px)',
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }} className="scrollbar-thin">
          {allMedia.map((media, index) => (
            <Box
              key={index}
              onClick={() => setCurrentIndex(index)}
              sx={{
                position: 'relative',
                minWidth: 80,
                height: 60,
                borderRadius: 1,
                overflow: 'hidden',
                cursor: 'pointer',
                border: index === currentIndex ? `3px solid ${theme.palette.primary.main}` : 'none',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.3)}`,
                },
              }}
            >
              <LazyImage
                src={media.thumbnail || media.url}
                alt={media.title || ''}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              
              {/* Media type indicator */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  bgcolor: alpha(theme.palette.common.black, 0.7),
                  borderRadius: 0.5,
                  p: 0.5,
                  minWidth: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {media.type === 'image' && <PhotoCamera sx={{ fontSize: 12, color: '#ffffff' }} />}
                {media.type === 'video' && <Videocam sx={{ fontSize: 12, color: '#ffffff' }} />}
                {media.type === 'virtual-tour' && <ThreeSixty sx={{ fontSize: 12, color: '#ffffff' }} />}
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  };

  const renderGridView = () => {
    return (
      <Grid container spacing={2} sx={{ p: 2 }}>
        {allMedia.map((media, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Paper
                elevation={3}
                sx={{
                  position: 'relative',
                  paddingTop: '75%',
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.15)}`,
                  },
                }}
                onClick={() => {
                  setCurrentIndex(index);
                  setViewMode('single');
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <LazyImage
                    src={media.thumbnail || media.url}
                    alt={media.title || ''}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  
                  {/* Media type overlay */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: alpha(theme.palette.common.black, 0.7),
                      borderRadius: 1,
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    {media.type === 'image' && <PhotoCamera sx={{ fontSize: 16, color: '#ffffff' }} />}
                    {media.type === 'video' && <Videocam sx={{ fontSize: 16, color: '#ffffff' }} />}
                    {media.type === 'virtual-tour' && <ThreeSixty sx={{ fontSize: 16, color: '#ffffff' }} />}
                  </Box>

                  {/* Title overlay */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      bgcolor: alpha(theme.palette.common.black, 0.7),
                      color: '#ffffff',
                      p: 1,
                    }}
                  >
                    <Typography variant="body2" noWrap>
                      {media.title}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: '#000000',
          backgroundImage: 'none',
        },
      }}
      TransitionComponent={Fade}
      transitionDuration={300}
    >
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {/* Header */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            bgcolor: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ p: 2 }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h6" color="text.primary">
                {property.name}
              </Typography>
              <Chip
                label={`${currentIndex + 1} / ${allMedia.length}`}
                size="small"
                color="primary"
              />
              <Chip
                label={currentMedia.type === 'image' ? 'Foto' : 
                      currentMedia.type === 'video' ? 'Vídeo' : 
                      'Tour Virtual'}
                size="small"
                variant="outlined"
              />
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1}>
              {/* View Mode Toggle */}
              <IconButton
                onClick={() => setViewMode(viewMode === 'single' ? 'grid' : 'single')}
                color="inherit"
              >
                {viewMode === 'single' ? <GridView /> : <ViewCarousel />}
              </IconButton>

              {/* Thumbnail Toggle */}
              <IconButton
                onClick={() => setShowThumbnails(!showThumbnails)}
                color="inherit"
              >
                <PhotoCamera />
              </IconButton>

              {/* Download Button */}
              {currentMedia.type === 'image' && (
                <IconButton onClick={handleDownload} color="inherit">
                  <Download />
                </IconButton>
              )}

              {/* Share Button */}
              <IconButton onClick={handleShare} color="inherit">
                <Share />
              </IconButton>

              {/* Fullscreen Toggle */}
              <IconButton onClick={toggleFullscreen} color="inherit">
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>

              {/* Close Button */}
              <IconButton onClick={onClose} color="inherit">
                <Close />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        {/* Main Content */}
        <Box
          sx={{
            position: 'relative',
            height: '100vh',
            pt: viewMode === 'single' ? 8 : 0,
            pb: viewMode === 'single' && showThumbnails ? 10 : 0,
          }}
        >
          {viewMode === 'single' ? (
            <>
              {/* Navigation Arrows */}
              <AnimatePresence>
                {allMedia.length > 1 && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      style={{
                        position: 'absolute',
                        left: 20,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 5,
                      }}
                    >
                      <IconButton
                        onClick={handlePrevious}
                        sx={{
                          bgcolor: alpha(theme.palette.background.paper, 0.8),
                          backdropFilter: 'blur(10px)',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.background.paper, 0.9),
                          },
                        }}
                      >
                        <ArrowBack />
                      </IconButton>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      style={{
                        position: 'absolute',
                        right: 20,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 5,
                      }}
                    >
                      <IconButton
                        onClick={handleNext}
                        sx={{
                          bgcolor: alpha(theme.palette.background.paper, 0.8),
                          backdropFilter: 'blur(10px)',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.background.paper, 0.9),
                          },
                        }}
                      >
                        <ArrowForward />
                      </IconButton>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Media Controls for Images */}
              {currentMedia.type === 'image' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 100,
                    right: 20,
                    zIndex: 5,
                  }}
                >
                  <Stack spacing={1}>
                    <IconButton
                      onClick={handleZoomIn}
                      sx={{
                        bgcolor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <ZoomIn />
                    </IconButton>
                    <IconButton
                      onClick={handleZoomOut}
                      sx={{
                        bgcolor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <ZoomOut />
                    </IconButton>
                    <IconButton
                      onClick={handleRotateLeft}
                      sx={{
                        bgcolor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <RotateLeft />
                    </IconButton>
                    <IconButton
                      onClick={handleRotateRight}
                      sx={{
                        bgcolor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <RotateRight />
                    </IconButton>
                  </Stack>
                </Box>
              )}

              {/* Media Display */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {renderMedia()}
                </motion.div>
              </AnimatePresence>

              {/* Thumbnails */}
              {renderThumbnails()}
            </>
          ) : (
            // Grid View
            <Box sx={{ height: '100%', overflow: 'auto', pt: 8 }}>
              {renderGridView()}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}