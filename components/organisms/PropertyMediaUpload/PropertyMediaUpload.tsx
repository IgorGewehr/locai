import React, { useState, useCallback } from 'react';
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

interface MediaFile {
  url: string;
  caption?: string;
  order: number;
  type: 'photo' | 'video';
}

interface PropertyMediaUploadProps {
  photos: MediaFile[];
  videos: MediaFile[];
  onPhotosChange: (photos: MediaFile[]) => void;
  onVideosChange: (videos: MediaFile[]) => void;
}

export default function PropertyMediaUpload({
  photos,
  videos,
  onPhotosChange,
  onVideosChange,
}: PropertyMediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [tempCaption, setTempCaption] = useState('');

  const onDropPhotos = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    const newPhotos: MediaFile[] = [];

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      setUploadProgress((i / acceptedFiles.length) * 100);

      // Simulate upload - in production, upload to Firebase Storage
      const url = URL.createObjectURL(file);
      newPhotos.push({
        url,
        order: photos.length + i,
        type: 'photo',
      });
    }

    onPhotosChange([...photos, ...newPhotos]);
    setUploading(false);
    setUploadProgress(0);
  }, [photos, onPhotosChange]);

  const onDropVideos = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    const newVideos: MediaFile[] = [];

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      setUploadProgress((i / acceptedFiles.length) * 100);

      // Simulate upload
      const url = URL.createObjectURL(file);
      newVideos.push({
        url,
        order: videos.length + i,
        type: 'video',
      });
    }

    onVideosChange([...videos, ...newVideos]);
    setUploading(false);
    setUploadProgress(0);
  }, [videos, onVideosChange]);

  const { getRootProps: getPhotoRootProps, getInputProps: getPhotoInputProps } = useDropzone({
    onDrop: onDropPhotos,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    disabled: uploading,
  });

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps } = useDropzone({
    onDrop: onDropVideos,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi'],
    },
    disabled: uploading,
    maxFiles: 3,
  });

  const handleDeletePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const handleDeleteVideo = (index: number) => {
    const newVideos = videos.filter((_, i) => i !== index);
    onVideosChange(newVideos);
  };

  const handleEditCaption = (media: MediaFile) => {
    setSelectedMedia(media);
    setTempCaption(media.caption || '');
    setCaptionDialogOpen(true);
  };

  const handleSaveCaption = () => {
    if (selectedMedia) {
      if (selectedMedia.type === 'photo') {
        const index = photos.findIndex(p => p.url === selectedMedia.url);
        if (index !== -1) {
          const newPhotos = [...photos];
          newPhotos[index] = { ...newPhotos[index], caption: tempCaption };
          onPhotosChange(newPhotos);
        }
      } else {
        const index = videos.findIndex(v => v.url === selectedMedia.url);
        if (index !== -1) {
          const newVideos = [...videos];
          newVideos[index] = { ...newVideos[index], caption: tempCaption };
          onVideosChange(newVideos);
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
                  <LinearProgress variant="determinate" value={uploadProgress} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Enviando... {Math.round(uploadProgress)}%
                  </Typography>
                </Box>
              )}

              {photos.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Fotos carregadas (arraste para reordenar)
                  </Typography>
                  <ImageList sx={{ width: '100%', height: 300 }} cols={4} rowHeight={164}>
                    {photos.map((photo, index) => (
                      <ImageListItem key={photo.url}>
                        <img
                          src={photo.url}
                          alt={`Foto ${index + 1}`}
                          loading="lazy"
                          style={{ height: '164px', objectFit: 'cover' }}
                        />
                        <ImageListItemBar
                          title={photo.caption || `Foto ${index + 1}`}
                          subtitle={index === 0 ? 'Foto principal' : ''}
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
                    {videos.map((video, index) => (
                      <Grid item xs={12} sm={6} md={4} key={video.url}>
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
                              {video.caption || `Vídeo ${index + 1}`}
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