'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Image as ImageIcon,
  VideoLibrary,
  Star,
  CheckCircle,
  Warning,
  AddPhotoAlternate,
  Cancel,
  ErrorOutline,
  CloudDone,
  Refresh,
} from '@mui/icons-material';
import { useFormContext } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { useMediaUpload, type UploadedFile } from '@/lib/hooks/useMediaUpload';
import { logger } from '@/lib/utils/logger';

// Constants
const MAX_PHOTOS = 20;
const MAX_VIDEOS = 5;
const RECOMMENDED_MIN_PHOTOS = 5;

// Types
interface MediaValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export const PropertyMedia: React.FC = () => {
  const theme = useTheme();
  const formContext = useFormContext();
  const { watch, setValue } = formContext || {};
  
  // Media upload hooks - using the unified production-ready hook
  const photoUploadConfig = useMemo(() => ({
    maxFiles: MAX_PHOTOS,
    maxSizeInMB: 10,
    allowedTypes: ['image/'],
    autoCompress: true,
    compressionQuality: 0.8
  }), []);

  const videoUploadConfig = useMemo(() => ({
    maxFiles: MAX_VIDEOS,
    maxSizeInMB: 50,
    allowedTypes: ['video/'],
    autoCompress: false
  }), []);

  const {
    uploadFiles: uploadPhotos,
    uploading: uploadingPhotos,
    progress: photoProgress,
    error: photoError,
    totalProgress: photoTotalProgress,
    clearError: clearPhotoError,
    cancelUploads: cancelPhotoUploads
  } = useMediaUpload(photoUploadConfig);

  const {
    uploadFiles: uploadVideos,
    uploading: uploadingVideos,
    progress: videoProgress,
    error: videoError,
    totalProgress: videoTotalProgress,
    clearError: clearVideoError,
    cancelUploads: cancelVideoUploads
  } = useMediaUpload(videoUploadConfig);
  
  // Local state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  
  // Form data
  const photosRaw = watch('photos');
  const videosRaw = watch('videos');
  
  const photos = Array.isArray(photosRaw) ? photosRaw : [];
  const videos = Array.isArray(videosRaw) ? videosRaw : [];

  // Validation
  const mediaValidation = useMemo((): MediaValidationResult => {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (photos.length < RECOMMENDED_MIN_PHOTOS) {
      warnings.push(`Recomendamos pelo menos ${RECOMMENDED_MIN_PHOTOS} fotos para melhor apresentação`);
    }

    if (photos.length === 0) {
      errors.push('Pelo menos uma foto é obrigatória');
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }, [photos.length]);

  // Progress calculations
  const isUploading = uploadingPhotos || uploadingVideos;
  const combinedProgress = useMemo(() => {
    if (!isUploading) return 0;
    
    const photoCount = Object.keys(photoProgress).length;
    const videoCount = Object.keys(videoProgress).length;
    const totalFiles = photoCount + videoCount;
    
    if (totalFiles === 0) return 0;
    
    return ((photoTotalProgress * photoCount) + (videoTotalProgress * videoCount)) / totalFiles;
  }, [isUploading, photoProgress, videoProgress, photoTotalProgress, videoTotalProgress]);

  // Error handling
  const allErrors = useMemo(() => {
    const errors = [...localErrors];
    if (photoError) errors.push(`Fotos: ${photoError}`);
    if (videoError) errors.push(`Vídeos: ${videoError}`);
    return errors;
  }, [localErrors, photoError, videoError]);

  const clearAllErrors = useCallback(() => {
    setLocalErrors([]);
    clearPhotoError();
    clearVideoError();
  }, [clearPhotoError, clearVideoError]);

  // Cancel all uploads
  const cancelAllUploads = useCallback(() => {
    cancelPhotoUploads();
    cancelVideoUploads();
    logger.info('All uploads cancelled by user');
  }, [cancelPhotoUploads, cancelVideoUploads]);

  // Photo upload handler
  const handlePhotoUpload = useCallback(async (acceptedFiles: File[]) => {
    setLocalErrors([]);
    
    if (photos.length + acceptedFiles.length > MAX_PHOTOS) {
      setLocalErrors([`Máximo de ${MAX_PHOTOS} fotos permitidas. Você tem ${photos.length} e está tentando adicionar ${acceptedFiles.length}.`]);
      return;
    }

    logger.info('Starting photo upload', { 
      currentCount: photos.length,
      newCount: acceptedFiles.length,
      fileNames: acceptedFiles.map(f => f.name)
    });

    try {
      const results = await uploadPhotos(acceptedFiles, 'image');
      
      if (results.length > 0) {
        const newPhotos = [...photos, ...results.map(r => r.url)];
        if (setValue && typeof setValue === 'function') {
          setValue('photos', newPhotos);
        }
        
        logger.info('Photos uploaded and added to form', { 
          uploadedCount: results.length,
          totalCount: newPhotos.length
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no upload de fotos';
      setLocalErrors([errorMessage]);
      logger.error('Photo upload failed', { error: errorMessage });
    }
  }, [photos, uploadPhotos, setValue]);

  // Video upload handler
  const handleVideoUpload = useCallback(async (acceptedFiles: File[]) => {
    setLocalErrors([]);
    
    if (videos.length + acceptedFiles.length > MAX_VIDEOS) {
      setLocalErrors([`Máximo de ${MAX_VIDEOS} vídeos permitidos. Você tem ${videos.length} e está tentando adicionar ${acceptedFiles.length}.`]);
      return;
    }

    logger.info('Starting video upload', { 
      currentCount: videos.length,
      newCount: acceptedFiles.length,
      fileNames: acceptedFiles.map(f => f.name)
    });

    try {
      const results = await uploadVideos(acceptedFiles, 'video');
      
      if (results.length > 0) {
        const newVideos = [...videos, ...results.map(r => r.url)];
        if (setValue && typeof setValue === 'function') {
          setValue('videos', newVideos);
        }
        
        logger.info('Videos uploaded and added to form', { 
          uploadedCount: results.length,
          totalCount: newVideos.length
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no upload de vídeos';
      setLocalErrors([errorMessage]);
      logger.error('Video upload failed', { error: errorMessage });
    }
  }, [videos, uploadVideos, setValue]);

  // Dropzone configurations
  const photoDropzone = useDropzone({
    onDrop: handlePhotoUpload,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxFiles: MAX_PHOTOS - photos.length,
    disabled: isUploading || photos.length >= MAX_PHOTOS,
    onDropRejected: (fileRejections) => {
      const errors = fileRejections.map(rejection => 
        `${rejection.file.name}: ${rejection.errors.map(e => e.message).join(', ')}`
      );
      setLocalErrors([`Arquivos rejeitados: ${errors.join('; ')}`]);
    }
  });

  const videoDropzone = useDropzone({
    onDrop: handleVideoUpload,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    },
    maxFiles: MAX_VIDEOS - videos.length,
    disabled: isUploading || videos.length >= MAX_VIDEOS,
    onDropRejected: (fileRejections) => {
      const errors = fileRejections.map(rejection => 
        `${rejection.file.name}: ${rejection.errors.map(e => e.message).join(', ')}`
      );
      setLocalErrors([`Arquivos de vídeo rejeitados: ${errors.join('; ')}`]);
    }
  });

  // Remove handlers
  const handleRemovePhoto = useCallback((index: number) => {
    const updated = photos.filter((_: any, i: number) => i !== index);
    if (setValue && typeof setValue === 'function') {
      setValue('photos', updated);
    }
    logger.info('Photo removed', { index, remaining: updated.length });
  }, [photos, setValue]);

  const handleRemoveVideo = useCallback((index: number) => {
    const updated = videos.filter((_: any, i: number) => i !== index);
    if (setValue && typeof setValue === 'function') {
      setValue('videos', updated);
    }
    logger.info('Video removed', { index, remaining: updated.length });
  }, [videos, setValue]);

  // Set main photo
  const handleSetMainPhoto = useCallback((index: number) => {
    const reordered = [...photos];
    const [mainPhoto] = reordered.splice(index, 1);
    reordered.unshift(mainPhoto);
    if (setValue && typeof setValue === 'function') {
      setValue('photos', reordered);
    }
    logger.info('Main photo changed', { newMainIndex: index });
  }, [photos, setValue]);

  // Render upload progress
  const renderUploadProgress = () => {
    if (!isUploading) return null;

    const activeUploads = [...Object.values(photoProgress), ...Object.values(videoProgress)];
    
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          backgroundColor: alpha(theme.palette.info.main, 0.05),
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUpload />
            Enviando Mídia
          </Typography>
          <Button
            size="small"
            color="error"
            onClick={cancelAllUploads}
            startIcon={<Cancel />}
          >
            Cancelar
          </Button>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Progresso Geral: {Math.round(combinedProgress)}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={combinedProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: alpha(theme.palette.info.main, 0.1),
            }}
          />
        </Box>

        <List dense>
          {activeUploads.map((upload) => (
            <ListItem key={upload.fileName}>
              <ListItemIcon>
                {upload.status === 'completed' ? (
                  <CheckCircle color="success" />
                ) : upload.status === 'error' ? (
                  <ErrorOutline color="error" />
                ) : (
                  <CircularProgress size={20} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={upload.fileName}
                secondary={
                  upload.status === 'error' 
                    ? upload.error
                    : `${Math.round(upload.progress)}%`
                }
              />
              <ListItemSecondaryAction>
                <Typography variant="caption" color="text.secondary">
                  {upload.status === 'completed' ? 'Concluído' : 
                   upload.status === 'error' ? 'Erro' : 'Enviando...'}
                </Typography>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Upload Progress */}
        {isUploading && (
          <Grid item xs={12}>
            {renderUploadProgress()}
          </Grid>
        )}

        {/* Error Alerts */}
        {allErrors.length > 0 && (
          <Grid item xs={12}>
            <Alert 
              severity="error" 
              onClose={clearAllErrors}
              sx={{ borderRadius: 2 }}
              action={
                <Button color="inherit" size="small" onClick={clearAllErrors}>
                  <Refresh />
                </Button>
              }
            >
              <Box>
                {allErrors.map((error, index) => (
                  <Typography key={index} variant="body2">
                    • {error}
                  </Typography>
                ))}
              </Box>
            </Alert>
          </Grid>
        )}

        {/* Validation Warnings */}
        {mediaValidation.warnings.length > 0 && allErrors.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              <Box>
                {mediaValidation.warnings.map((warning, index) => (
                  <Typography key={index} variant="body2">
                    • {warning}
                  </Typography>
                ))}
              </Box>
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
                {photos.length >= RECOMMENDED_MIN_PHOTOS && (
                  <CheckCircle color="success" fontSize="small" />
                )}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip
                  label={`${photos.length}/${MAX_PHOTOS}`}
                  size="small"
                  color={photos.length >= MAX_PHOTOS ? 'error' : photos.length >= RECOMMENDED_MIN_PHOTOS ? 'success' : 'primary'}
                />
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
                cursor: photos.length >= MAX_PHOTOS || isUploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                opacity: photos.length >= MAX_PHOTOS || isUploading ? 0.5 : 1,
                '&:hover': photos.length < MAX_PHOTOS && !isUploading ? {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                } : {},
              }}
            >
              <input {...photoDropzone.getInputProps()} />
              <AddPhotoAlternate sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                {isUploading ? 'Upload em andamento...' :
                 photos.length >= MAX_PHOTOS ? 'Limite máximo de fotos atingido' :
                 photoDropzone.isDragActive ? 'Solte as fotos aqui...' : 'Arraste fotos ou clique para selecionar'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Formatos: JPG, PNG, WEBP (máx. 10MB cada) • Recomendado: {RECOMMENDED_MIN_PHOTOS}+ fotos
              </Typography>
            </Box>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <ImageList cols={4} gap={8} sx={{ mt: 2 }}>
                {photos.map((photo: string, index: number) => (
                  <Fade in key={`${photo}-${index}`} timeout={300 * (index + 1)}>
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
                        onError={(e) => {
                          logger.error('Image load error', { url: photo, index });
                          // Could implement placeholder or retry logic here
                        }}
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetMainPhoto(index);
                                }}
                                title="Definir como foto principal"
                              >
                                <Star />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              sx={{ color: 'white' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePhoto(index);
                              }}
                              title="Remover foto"
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
                {videos.length > 0 && (
                  <CheckCircle color="success" fontSize="small" />
                )}
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
                cursor: videos.length >= MAX_VIDEOS || isUploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                opacity: videos.length >= MAX_VIDEOS || isUploading ? 0.5 : 1,
                '&:hover': videos.length < MAX_VIDEOS && !isUploading ? {
                  borderColor: theme.palette.secondary.main,
                  backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                } : {},
              }}
            >
              <input {...videoDropzone.getInputProps()} />
              <VideoLibrary sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                {isUploading ? 'Upload em andamento...' :
                 videos.length >= MAX_VIDEOS ? 'Limite máximo de vídeos atingido' :
                 videoDropzone.isDragActive ? 'Solte os vídeos aqui...' : 'Arraste vídeos ou clique para selecionar'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Formatos: MP4 (recomendado), MOV, AVI, WEBM (máx. 50MB cada)
              </Typography>
            </Box>

            {/* Video List */}
            {videos.length > 0 && (
              <Grid container spacing={2}>
                {videos.map((video: string, index: number) => (
                  <Grid item xs={12} sm={6} key={`${video}-${index}`}>
                    <Fade in timeout={300 * (index + 1)}>
                      <Paper
                        sx={{
                          p: 2,
                          backgroundColor: 'background.paper',
                          borderRadius: 2,
                          border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                        }}
                      >
                        <Box sx={{ position: 'relative', mb: 2 }}>
                          <video
                            src={video}
                            style={{
                              width: '100%',
                              height: 180,
                              objectFit: 'cover',
                              borderRadius: 8,
                              backgroundColor: '#000',
                            }}
                            controls
                            preload="metadata"
                            onError={(e) => {
                              logger.error('Video load error', { url: video, index, error: e });
                            }}
                          />
                          <Chip
                            label={`Vídeo ${index + 1}`}
                            size="small"
                            color="secondary"
                            icon={<VideoLibrary />}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              zIndex: 1,
                            }}
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              Vídeo {index + 1}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {video.includes('firebase') ? (
                                <>
                                  <CloudDone fontSize="inherit" sx={{ mr: 0.5 }} />
                                  Carregado com sucesso
                                </>
                              ) : 'URL externa'}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveVideo(index)}
                            color="error"
                            sx={{
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.error.main, 0.1)
                              }
                            }}
                            title="Remover vídeo"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </Paper>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>

        {/* Tips */}
        <Grid item xs={12}>
          <Alert severity="info" icon={<Warning />} sx={{ borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              📸 Dicas para Mídias de Qualidade:
            </Typography>
            <Box component="ul" sx={{ pl: 2, my: 0 }}>
              <Typography component="li" variant="body2">
                <strong>Mínimo recomendado:</strong> {RECOMMENDED_MIN_PHOTOS} fotos de alta qualidade
              </Typography>
              <Typography component="li" variant="body2">
                <strong>Foto principal:</strong> A primeira foto será a capa do anúncio
              </Typography>
              <Typography component="li" variant="body2">
                <strong>Cobertura completa:</strong> Mostre todos os cômodos, áreas externas e diferenciais
              </Typography>
              <Typography component="li" variant="body2">
                <strong>Vídeos:</strong> Aumentam as reservas em até 30% - use MP4 para melhor compatibilidade
              </Typography>
              <Typography component="li" variant="body2">
                <strong>Qualidade:</strong> Boa iluminação e imagens nítidas são essenciais
              </Typography>
            </Box>
          </Alert>
        </Grid>
      </Grid>

      {/* Image Preview Modal */}
      <Dialog
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        maxWidth="lg"
        fullWidth
        sx={{ '& .MuiDialog-paper': { borderRadius: 2 } }}
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
                borderRadius: 8,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};