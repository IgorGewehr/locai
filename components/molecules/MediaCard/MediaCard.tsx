// components/molecules/MediaCard/MediaCard.tsx
import React from 'react'
import {
  Card,
  CardMedia,
  CardActions,
  IconButton,
  Box,
  useTheme,
  alpha,
  Fade,
  Chip
} from '@mui/material'
import {
  Delete,
  Star,
  StarBorder,
  PlayArrow,
  DragIndicator,
  Visibility
} from '@mui/icons-material'
import { PropertyPhoto, PropertyVideo } from '@/lib/types/property'

export interface MediaCardProps {
  media: PropertyPhoto | PropertyVideo
  onDelete: (id: string) => void
  onPreview: (media: PropertyPhoto | PropertyVideo) => void
  onSetMain?: (id: string) => void
  dragHandleProps?: any
  isDragging?: boolean
  showDragHandle?: boolean
}

export const MediaCard: React.FC<MediaCardProps> = ({
  media,
  onDelete,
  onPreview,
  onSetMain,
  dragHandleProps,
  isDragging = false,
  showDragHandle = true,
}) => {
  const theme = useTheme()
  
  const isPhoto = 'isMain' in media
  const isVideo = 'title' in media
  
  return (
    <Card
      sx={{
        position: 'relative',
        transform: isDragging ? 'rotate(5deg)' : 'none',
        boxShadow: isDragging ? theme.shadows[8] : theme.shadows[2],
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: isDragging ? 'rotate(5deg)' : 'translateY(-4px)',
          boxShadow: theme.shadows[6],
        },
        overflow: 'hidden',
      }}
    >
      {/* Drag Handle */}
      {showDragHandle && (
        <Box
          {...dragHandleProps}
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 2,
            backgroundColor: alpha(theme.palette.background.paper, 0.9),
            borderRadius: 1,
            p: 0.5,
            cursor: 'grab',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            },
          }}
        >
          <DragIndicator fontSize="small" />
        </Box>
      )}

      {/* Main Photo Badge */}
      {isPhoto && media.isMain && (
        <Chip
          icon={<Star />}
          label="Principal"
          size="small"
          color="primary"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': {
                boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0.7)}`,
              },
              '70%': {
                boxShadow: `0 0 0 10px ${alpha(theme.palette.primary.main, 0)}`,
              },
              '100%': {
                boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0)}`,
              },
            },
          }}
        />
      )}

      {/* Media Content */}
      <Box
        sx={{
          position: 'relative',
          height: 200,
          overflow: 'hidden',
          cursor: 'pointer',
        }}
        onClick={() => onPreview(media)}
      >
        {isPhoto ? (
          <CardMedia
            component="img"
            height="200"
            image={media.url}
            alt={media.filename}
            sx={{
              objectFit: 'cover',
              transition: 'transform 0.3s ease-in-out',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          />
        ) : (
          <Box
            sx={{
              height: '100%',
              backgroundColor: theme.palette.grey[900],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <PlayArrow 
              sx={{ 
                fontSize: 48, 
                color: 'white',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.2)',
                },
              }} 
            />
            {media.thumbnail && (
              <Box
                component="img"
                src={media.thumbnail}
                alt={media.title}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.3,
                }}
              />
            )}
          </Box>
        )}

        {/* Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.3s ease-in-out',
            '&:hover': {
              opacity: 1,
            },
          }}
        >
          <IconButton
            sx={{
              backgroundColor: alpha(theme.palette.background.paper, 0.9),
              '&:hover': {
                backgroundColor: theme.palette.background.paper,
              },
            }}
          >
            <Visibility />
          </IconButton>
        </Box>
      </Box>

      {/* Actions */}
      <CardActions 
        sx={{ 
          p: 1,
          justifyContent: 'space-between',
          backgroundColor: alpha(theme.palette.background.paper, 0.8),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isPhoto && onSetMain && (
            <IconButton
              size="small"
              onClick={() => onSetMain(media.id)}
              color={media.isMain ? 'primary' : 'default'}
              sx={{
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.1)',
                },
              }}
            >
              {media.isMain ? <Star /> : <StarBorder />}
            </IconButton>
          )}
        </Box>

        <IconButton
          size="small"
          onClick={() => onDelete(media.id)}
          color="error"
          sx={{
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.1)',
              backgroundColor: alpha(theme.palette.error.main, 0.1),
            },
          }}
        >
          <Delete />
        </IconButton>
      </CardActions>
    </Card>
  )
}