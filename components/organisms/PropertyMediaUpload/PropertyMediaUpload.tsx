'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Button,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  LinearProgress,
  Alert,
  Chip,
  Dialog,
  DialogContent,
  TextField,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  DragIndicator,
  Close,
  Videocam,
  Image as ImageIcon,
  Add,
  Edit,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useFormContext } from 'react-hook-form';
import { useMediaUpload } from '@/lib/hooks/useMediaUpload';
import { createPhotoFromFile, createVideoFromFile } from '@/lib/utils/mediaUtils';
import { PropertyPhoto, PropertyVideo } from '@/lib/types/property';

export default function PropertyMediaUpload() {
  const { watch, setValue, formState: { errors } } = useFormContext();
  const photos: PropertyPhoto[] = watch('photos') || [];
  const videos: PropertyVideo[] = watch('videos') || [];
  const { uploadFiles, uploading, progress, error, clearError } = useMediaUpload();
  
  const [selectedMedia, setSelectedMedia] = useState<PropertyPhoto | PropertyVideo | null>(null);
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [tempCaption, setTempCaption] = useState('');

  // Create local SVG placeholder for images
  const createImagePlaceholder = (text: string, width: number = 164, height: number = 164) => {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#e5e7eb"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" 
              fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">
          ${text}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      photos?.forEach(photo => {
        if (photo?.url?.startsWith('blob:')) {
          URL.revokeObjectURL(photo.url);
        }
      });
      videos?.forEach(video => {
        if (video?.url?.startsWith('blob:')) {
          URL.revokeObjectURL(video.url);
        }
      });
    };
  }, [photos, videos]);

  const onDropPhotos = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      console.log('⚠️ [PropertyMediaUpload] No files accepted for upload');
      return;
    }
    
    console.log(`🖼️ [PropertyMediaUpload] Starting photo upload`, {
      filesCount: acceptedFiles.length,
      fileNames: acceptedFiles.map(f => f.name),
      fileSizes: acceptedFiles.map(f => f.size),
      fileTypes: acceptedFiles.map(f => f.type),
      existingPhotosCount: photos.length,
      uploading,
      hasUploadFunction: !!uploadFiles,
      hasSetValueFunction: !!setValue
    });
    
    try {
      clearError();
      
      // Create immediate preview with blob URLs
      const previewPhotos: PropertyPhoto[] = acceptedFiles.map((file, index) => ({
        id: `temp-${Date.now()}-${index}`,
        url: URL.createObjectURL(file), // Blob URL for immediate preview
        filename: file.name,
        order: photos.length + index,
        isMain: photos.length === 0 && index === 0, // First photo is main
        caption: '',
      }));

      console.log('🖼️ [PropertyMediaUpload] Created preview photos', {
        previewCount: previewPhotos.length,
        previewData: previewPhotos.map(p => ({
          id: p?.id,
          filename: p?.filename,
          isBlobUrl: p?.url?.startsWith('blob:') || false
        }))
      });
      
      // Add photos with preview URLs immediately
      setValue('photos', [...photos, ...previewPhotos]);
      
      console.log('🚀 [PropertyMediaUpload] Starting Firebase upload...');
      // Upload files in background and replace URLs
      const uploadResults = await uploadFiles(acceptedFiles, 'image');
      console.log(`✅ [PropertyMediaUpload] Firebase upload complete`, {
        resultsCount: uploadResults.length,
        uploadedFiles: uploadResults.map(r => ({
          name: r.name,
          url: r.url,
          size: r.size,
          isFirebaseUrl: r.url.includes('firebasestorage.googleapis.com')
        }))
      });
      
      // Replace blob URLs with Firebase URLs
      const finalPhotos: PropertyPhoto[] = uploadResults.map((result, index) => ({
        ...previewPhotos[index],
        url: result.url, // Replace with Firebase URL
      }));

      // VALIDATION: Only accept Firebase URLs
      const validFirebasePhotos = finalPhotos.filter(photo => 
        photo?.url?.includes('firebasestorage.googleapis.com') || false
      );

      if (validFirebasePhotos.length !== finalPhotos.length) {
        console.warn('[PropertyMediaUpload] Some photos do not have valid Firebase URLs');
        console.warn('Invalid photos:', finalPhotos.filter(p => !p?.url?.includes('firebasestorage.googleapis.com')));
      }

      console.log('[PropertyMediaUpload] Updating form with Firebase URLs');
      // Update with final URLs - maintain existing photos + only valid Firebase photos
      const updatedPhotos = [...photos, ...validFirebasePhotos];
      setValue('photos', updatedPhotos, { shouldValidate: true });
      
      // Verify Firebase URLs are properly set
      console.log('[PropertyMediaUpload] Final photos validation:', {
        totalPhotos: updatedPhotos.length,
        firebaseUrls: updatedPhotos.filter(p => p?.url?.includes('firebasestorage.googleapis.com')).length,
        blobUrls: updatedPhotos.filter(p => p?.url?.startsWith('blob:')).length,
        photoData: updatedPhotos.map(p => ({
          id: p?.id,
          filename: p?.filename,
          urlType: p?.url?.includes('firebasestorage.googleapis.com') ? 'firebase' : (p?.url?.startsWith('blob:') ? 'blob' : 'other')
        }))
      });
      
      console.log('[PropertyMediaUpload] Photo upload process completed successfully');
      
    } catch (error) {
      console.error('[PropertyMediaUpload] Error uploading photos:', error);
      // Remove preview photos on error - keep existing photos
      setValue('photos', photos);
      // The error will be shown by the useMediaUpload hook
    }
  }, [photos, setValue, uploadFiles, clearError]);

  const onDropVideos = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    try {
      clearError();
      
      // Create immediate preview with blob URLs
      const previewVideos: PropertyVideo[] = acceptedFiles.map((file, index) => ({
        id: `temp-${Date.now()}-${index}`,
        url: URL.createObjectURL(file), // Blob URL for immediate preview
        filename: file.name,
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        order: videos.length + index,
        duration: 0,
        thumbnail: '',
      }));

      // Add videos with preview URLs immediately
      setValue('videos', [...videos, ...previewVideos]);
      
      // Upload files in background and replace URLs
      const uploadResults = await uploadFiles(acceptedFiles, 'video');
      
      // Replace blob URLs with Firebase URLs
      const finalVideos: PropertyVideo[] = uploadResults.map((result, index) => ({
        ...previewVideos[index],
        url: result.url, // Replace with Firebase URL
      }));

      // Update with final URLs
      const updatedVideos = [...videos, ...finalVideos];
      setValue('videos', updatedVideos);
      
    } catch (error) {
      // Remove preview videos on error
      setValue('videos', videos);
      console.error('Error uploading videos:', error);
    }
  }, [videos, setValue, uploadFiles, clearError]);

  const { getRootProps: getPhotoRootProps, getInputProps: getPhotoInputProps } = useDropzone({
    onDrop: onDropPhotos,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    disabled: uploading, // Só desabilitar se realmente estiver fazendo upload
    multiple: true,
    noClick: false,
    preventDropOnDocument: true,
  });

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps } = useDropzone({
    onDrop: onDropVideos,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi'],
    },
    disabled: uploading,
    maxFiles: 3,
    multiple: true,
    noClick: false,
    preventDropOnDocument: true,
  });

  const handleDeletePhoto = (index: number) => {
    const photoToDelete = photos[index];
    // Cleanup blob URL if it exists
    if (photoToDelete?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(photoToDelete.url);
    }
    
    const newPhotos = photos.filter((_, i: number) => i !== index);
    setValue('photos', newPhotos);
  };

  const handleDeleteVideo = (index: number) => {
    const videoToDelete = videos[index];
    // Cleanup blob URL if it exists
    if (videoToDelete?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(videoToDelete.url);
    }
    
    const newVideos = videos.filter((_, i: number) => i !== index);
    setValue('videos', newVideos);
  };

  const handleEditCaption = (media: PropertyPhoto | PropertyVideo) => {
    setSelectedMedia(media);
    // PropertyPhoto has 'caption', PropertyVideo has 'title'
    const currentText = 'isMain' in media ? media.caption || '' : media.title || '';
    setTempCaption(currentText);
    setCaptionDialogOpen(true);
  };

  const handleSaveCaption = () => {
    if (selectedMedia) {
      // Check if it's a PropertyPhoto by checking for 'isMain' property
      if ('isMain' in selectedMedia) {
        const index = photos.findIndex((p: PropertyPhoto) => p.id === selectedMedia.id);
        if (index !== -1) {
          const newPhotos = [...photos];
          newPhotos[index] = { ...newPhotos[index], caption: tempCaption };
          setValue('photos', newPhotos);
        }
      } else {
        // It's a PropertyVideo
        const index = videos.findIndex((v: PropertyVideo) => v.id === selectedMedia.id);
        if (index !== -1) {
          const newVideos = [...videos];
          newVideos[index] = { ...newVideos[index], title: tempCaption };
          setValue('videos', newVideos);
        }
      }
    }
    setCaptionDialogOpen(false);
    setSelectedMedia(null);
    setTempCaption('');
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Photos Upload */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                  Fotos do Imóvel
                </Typography>
                <Chip
                  icon={<ImageIcon />}
                  label={`${photos.length} fotos`}
                  color="primary"
                  size="small"
                />
              </Box>

              {errors.photos && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {typeof errors.photos === 'string' ? errors.photos : String(errors.photos.message || 'Erro nas fotos')}
                </Alert>
              )}

              <Box
                {...getPhotoRootProps()}
                sx={{
                  border: '2px dashed',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <input {...getPhotoInputProps()} />
                <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                  Arraste fotos aqui ou clique para selecionar
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Formatos aceitos: JPG, PNG, WEBP (máx. 10MB cada)
                </Typography>
              </Box>

              {uploading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Enviando... {Math.round(progress)}%
                  </Typography>
                </Box>
              )}

              {error && (
                <Alert severity="error" sx={{ mt: 2 }} onClose={clearError}>
                  {error}
                </Alert>
              )}

              {photos.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Fotos carregadas (arraste para reordenar)
                  </Typography>
                  <ImageList sx={{ width: '100%', height: 300 }} cols={4} rowHeight={164}>
                    {photos.map((photo: PropertyPhoto, index: number) => (
                      <ImageListItem key={photo?.id || `photo-${index}`}>
                        <img
                          src={(() => {
                            // Safe image URL validation for uploads
                            if (photo?.url && (photo.url.startsWith('http') || photo.url.startsWith('blob:'))) {
                              return photo.url;
                            }
                            return createImagePlaceholder(`Foto ${index + 1}`);
                          })()}
                          alt={photo?.caption || `Foto ${index + 1}`}
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = createImagePlaceholder(`Erro ${index + 1}`);
                          }}
                          style={{ 
                            height: '164px', 
                            objectFit: 'cover',
                            backgroundColor: '#f5f5f5',
                          }}
                        />
                        <ImageListItemBar
                          title={photo?.caption || `Foto ${index + 1}`}
                          subtitle={photo?.isMain ? 'Foto principal' : ''}
                          actionIcon={
                            <Box>
                              <IconButton
                                sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                                onClick={() => handleEditCaption(photo)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                                onClick={() => handleDeletePhoto(index)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          }
                        />
                        {index === 0 && (
                          <Chip
                            label="Principal"
                            size="small"
                            color="primary"
                            sx={{ position: 'absolute', top: 8, left: 8 }}
                          />
                        )}
                      </ImageListItem>
                    ))}
                  </ImageList>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Videos Upload */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                  Vídeos do Imóvel
                </Typography>
                <Chip
                  icon={<Videocam />}
                  label={`${videos.length} vídeos`}
                  color="secondary"
                  size="small"
                />
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                Vídeos ajudam a mostrar melhor o imóvel. Recomendamos vídeos de 30-60 segundos.
              </Alert>

              <Box
                {...getVideoRootProps()}
                sx={{
                  border: '2px dashed',
                  borderColor: 'secondary.main',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <input {...getVideoInputProps()} />
                <Videocam sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                  Arraste vídeos aqui ou clique para selecionar
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Formatos aceitos: MP4, MOV, AVI (máx. 100MB cada, até 3 vídeos)
                </Typography>
              </Box>

              {videos.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Vídeos carregados
                  </Typography>
                  <Grid container spacing={2}>
                    {videos.map((video: PropertyVideo, index: number) => (
                      <Grid item xs={12} sm={6} md={4} key={video.id}>
                        <Card variant="outlined">
                          <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
                            <video
                              src={video.url}
                              controls
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                              }}
                            />
                          </Box>
                          <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">
                              {video.title || `Vídeo ${index + 1}`}
                            </Typography>
                            <Box>
                              <IconButton size="small" onClick={() => handleEditCaption(video)}>
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteVideo(index)} color="error">
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Caption Edit Dialog */}
      <Dialog open={captionDialogOpen} onClose={() => setCaptionDialogOpen(false)}>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Editar Legenda
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={tempCaption}
            onChange={(e) => setTempCaption(e.target.value)}
            placeholder="Adicione uma descrição para esta mídia..."
            sx={{ mt: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
            <Button onClick={() => setCaptionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleSaveCaption}>
              Salvar
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}