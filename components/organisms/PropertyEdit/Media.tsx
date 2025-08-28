'use client';

import React, { useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  LinearProgress,
  Alert,
  useTheme,
  alpha,
  Chip,
  Dialog,
  DialogContent,
  Fade,
  Zoom,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Image as ImageIcon,
  VideoLibrary,
  DragIndicator,
  ZoomIn,
  Star,
  CheckCircle,
  Warning,
  AddPhotoAlternate,
} from '@mui/icons-material';
import { useFormContext, Controller } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { useTenant } from '@/contexts/TenantContext';
import { useSimpleMediaUpload } from '@/lib/hooks/useSimpleMediaUpload';
import { logger } from '@/lib/utils/logger';

const MAX_PHOTOS = 20;
const MAX_VIDEOS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const PropertyMedia: React.FC = () => {
  const theme = useTheme();
  const { control, watch, setValue } = useFormContext();
  const { tenantId } = useTenant();
  const { uploadFiles, uploading, progress, error: hookUploadError, reset } = useSimpleMediaUpload();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const photos = watch('photos') || [];
  const videos = watch('videos') || [];

  // Photo upload handler
  const handlePhotoUpload = useCallback(async (acceptedFiles: File[]) => {
    setUploadError(null);
    
    if (photos.length + acceptedFiles.length > MAX_PHOTOS) {
      setUploadError(`Máximo de ${MAX_PHOTOS} fotos permitidas`);
      return;
    }

    const validFiles = acceptedFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`Arquivo ${file.name} excede 10MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    logger.info('Uploading photos', { count: validFiles.length });

    try {
      const urls = await uploadFiles(validFiles);
      if (urls.length > 0) {
        setValue('photos', [...(photos || []), ...urls]);
        logger.info('Photos uploaded successfully', { count: urls.length });
      }
    } catch (error) {
      logger.error('Photo upload failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      setUploadError('Erro ao enviar fotos');
    }
  }, [photos, uploadFiles, setValue]);

  // Video upload handler
  const handleVideoUpload = useCallback(async (acceptedFiles: File[]) => {
    setUploadError(null);
    
    if (videos.length + acceptedFiles.length > MAX_VIDEOS) {
      setUploadError(`Máximo de ${MAX_VIDEOS} vídeos permitidos`);
      return;
    }

    const validFiles = acceptedFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE * 5) { // 50MB for videos
        setUploadError(`Vídeo ${file.name} excede 50MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    logger.info('Uploading videos', { count: validFiles.length });

    try {
      const urls = await uploadFiles(validFiles);
      if (urls.length > 0) {
        setValue('videos', [...(videos || []), ...urls]);
        logger.info('Videos uploaded successfully', { count: urls.length });
      }
    } catch (error) {
      logger.error('Video upload failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      setUploadError('Erro ao enviar vídeos');
    }
  }, [videos, uploadFiles, setValue]);

  // Dropzone for photos
  const photoDropzone = useDropzone({
    onDrop: handlePhotoUpload,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxFiles: MAX_PHOTOS - photos.length,
    disabled: uploading || photos.length >= MAX_PHOTOS,
  });

  // Dropzone for videos
  const videoDropzone = useDropzone({
    onDrop: handleVideoUpload,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    },
    maxFiles: MAX_VIDEOS - videos.length,
    disabled: uploading || videos.length >= MAX_VIDEOS,
  });

  // Remove photo
  const handleRemovePhoto = (index: number) => {
    const updated = photos.filter((_: any, i: number) => i !== index);
    setValue('photos', updated);
    logger.info('Photo removed', { index, remaining: updated.length });
  };

  // Remove video
  const handleRemoveVideo = (index: number) => {
    const updated = videos.filter((_: any, i: number) => i !== index);
    setValue('videos', updated);
    logger.info('Video removed', { index, remaining: updated.length });
  };

  // Set main photo
  const handleSetMainPhoto = (index: number) => {
    const reordered = [...photos];
    const [mainPhoto] = reordered.splice(index, 1);
    reordered.unshift(mainPhoto);
    setValue('photos', reordered);
    logger.info('Main photo set', { index });
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Upload Progress */}
        {uploading && (
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: alpha(theme.palette.info.main, 0.05),
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" gutterBottom>
                Enviando mídia... {Object.keys(progress).length > 0 ? 
                  Math.round(Object.values(progress).reduce((acc, p) => acc + p.progress, 0) / Object.keys(progress).length) 
                  : 0}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={Object.keys(progress).length > 0 ? 
                  Object.values(progress).reduce((acc, p) => acc + p.progress, 0) / Object.keys(progress).length 
                  : 0} 
                sx={{ 
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: alpha(theme.palette.info.main, 0.1),
                }}
              />
            </Paper>
          </Grid>
        )}

        {/* Error Alert */}
        {(uploadError || hookUploadError) && (
          <Grid item xs={12}>
            <Alert 
              severity="error" 
              onClose={() => {
                setUploadError(null);
                reset();
              }}
              sx={{ borderRadius: 2 }}
            >
              {uploadError || hookUploadError}
            </Alert>
          </Grid>
        )}

        {/* Photos Section */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon />
                Fotos do Imóvel
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip
                  label={`${photos.length}/${MAX_PHOTOS}`}
                  size="small"
                  color={photos.length >= MAX_PHOTOS ? 'error' : 'primary'}
                />
                {photos.length >= 3 && (
                  <CheckCircle color="success" fontSize="small" />
                )}
              </Box>
            </Box>

            {/* Photo Upload Area */}
            <Box
              {...photoDropzone.getRootProps()}
              sx={{
                p: 3,
                mb: 2,
                border: `2px dashed ${
                  photoDropzone.isDragActive 
                    ? theme.palette.primary.main 
                    : alpha(theme.palette.primary.main, 0.3)
                }`,
                borderRadius: 2,
                backgroundColor: photoDropzone.isDragActive 
                  ? alpha(theme.palette.primary.main, 0.05) 
                  : 'background.paper',
                cursor: photos.length >= MAX_PHOTOS ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                '&:hover': photos.length < MAX_PHOTOS ? {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                } : {},
              }}
            >
              <input {...photoDropzone.getInputProps()} />
              <AddPhotoAlternate sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                {photoDropzone.isDragActive
                  ? 'Solte as fotos aqui...'
                  : 'Arraste fotos ou clique para selecionar'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Formatos: JPG, PNG, WEBP (máx. 10MB cada)
              </Typography>
            </Box>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <ImageList cols={4} gap={8} sx={{ mt: 2 }}>
                {photos.map((photo: string, index: number) => (
                  <Fade in key={index} timeout={300 * (index + 1)}>
                    <ImageListItem
                      sx={{
                        borderRadius: 2,
                        overflow: 'hidden',
                        position: 'relative',
                        '&:hover .MuiImageListItemBar-root': {
                          opacity: 1,
                        },
                      }}
                    >
                      <img
                        src={photo}
                        alt={`Foto ${index + 1}`}
                        loading="lazy"
                        style={{ 
                          cursor: 'pointer',
                          objectFit: 'cover',
                          width: '100%',
                          height: '200px',
                        }}
                        onClick={() => setSelectedImage(photo)}
                      />
                      {index === 0 && (
                        <Chip
                          label="Principal"
                          size="small"
                          color="primary"
                          icon={<Star />}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            zIndex: 1,
                          }}
                        />
                      )}
                      <ImageListItemBar
                        sx={{
                          opacity: 0,
                          transition: 'opacity 0.3s',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                        }}
                        actionIcon={
                          <Box sx={{ display: 'flex', gap: 1, p: 1 }}>
                            {index !== 0 && (
                              <IconButton
                                size="small"
                                sx={{ color: 'white' }}
                                onClick={() => handleSetMainPhoto(index)}
                              >
                                <Star />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              sx={{ color: 'white' }}
                              onClick={() => handleRemovePhoto(index)}
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        }
                      />
                    </ImageListItem>
                  </Fade>
                ))}
              </ImageList>
            )}
          </Paper>
        </Grid>

        {/* Videos Section */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: alpha(theme.palette.secondary.main, 0.05),
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VideoLibrary />
                Vídeos do Imóvel
              </Typography>
              <Chip
                label={`${videos.length}/${MAX_VIDEOS}`}
                size="small"
                color={videos.length >= MAX_VIDEOS ? 'error' : 'secondary'}
              />
            </Box>

            {/* Video Upload Area */}
            <Box
              {...videoDropzone.getRootProps()}
              sx={{
                p: 3,
                mb: 2,
                border: `2px dashed ${
                  videoDropzone.isDragActive 
                    ? theme.palette.secondary.main 
                    : alpha(theme.palette.secondary.main, 0.3)
                }`,
                borderRadius: 2,
                backgroundColor: videoDropzone.isDragActive 
                  ? alpha(theme.palette.secondary.main, 0.05) 
                  : 'background.paper',
                cursor: videos.length >= MAX_VIDEOS ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                '&:hover': videos.length < MAX_VIDEOS ? {
                  borderColor: theme.palette.secondary.main,
                  backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                } : {},
              }}
            >
              <input {...videoDropzone.getInputProps()} />
              <VideoLibrary sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                {videoDropzone.isDragActive
                  ? 'Solte os vídeos aqui...'
                  : 'Arraste vídeos ou clique para selecionar'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Formatos: MP4, MOV, AVI, WEBM (máx. 50MB cada)
              </Typography>
            </Box>

            {/* Video List */}
            {videos.length > 0 && (
              <Grid container spacing={2}>
                {videos.map((video: string, index: number) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Paper
                      sx={{
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'background.paper',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <VideoLibrary color="secondary" />
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            Vídeo {index + 1}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Enviado com sucesso
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveVideo(index)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>

        {/* Tips */}
        <Grid item xs={12}>
          <Alert severity="info" icon={<Warning />}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Dicas para Mídias:
            </Typography>
            <Box component="ul" sx={{ pl: 2, my: 0 }}>
              <Typography component="li" variant="body2">
                Adicione pelo menos 5 fotos de alta qualidade para melhor apresentação
              </Typography>
              <Typography component="li" variant="body2">
                A primeira foto será a imagem principal do anúncio
              </Typography>
              <Typography component="li" variant="body2">
                Mostre todos os cômodos e áreas externas
              </Typography>
              <Typography component="li" variant="body2">
                Vídeos ajudam a aumentar as reservas em até 30%
              </Typography>
            </Box>
          </Alert>
        </Grid>
      </Grid>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => setSelectedImage(null)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.7)',
              },
            }}
          >
            <Delete />
          </IconButton>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Preview"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '80vh',
                objectFit: 'contain',
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};