'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
  Link,
  Skeleton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Close,
  OpenInNew,
  BrokenImage,
  ZoomIn,
} from '@mui/icons-material';

/**
 * Regex patterns for URL and image detection
 */
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

/**
 * Check if a URL points to an image
 */
function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.test(url);
}

/**
 * Check if a URL points to a video
 */
function isVideoUrl(url: string): boolean {
  return VIDEO_EXTENSIONS.test(url);
}

/**
 * Extract all URLs from text
 */
function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches ? [...new Set(matches)] : [];
}

interface ImagePreviewProps {
  src: string;
  alt?: string;
  onOpen?: () => void;
}

/**
 * Single image preview with loading and error states
 */
function ImagePreview({ src, alt = 'Image', onOpen }: ImagePreviewProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <Box
        sx={{
          width: 200,
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.error.main, 0.1),
          borderRadius: 1,
          border: `1px dashed ${alpha(theme.palette.error.main, 0.3)}`,
        }}
      >
        <BrokenImage sx={{ color: theme.palette.error.main, fontSize: 32 }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-block',
        cursor: 'pointer',
        borderRadius: 1,
        overflow: 'hidden',
        maxWidth: '100%',
        '&:hover .zoom-overlay': {
          opacity: 1,
        },
      }}
      onClick={onOpen}
    >
      {loading && (
        <Skeleton
          variant="rectangular"
          width={200}
          height={120}
          sx={{ borderRadius: 1 }}
        />
      )}
      <Box
        component="img"
        src={src}
        alt={alt}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        sx={{
          display: loading ? 'none' : 'block',
          maxWidth: 280,
          maxHeight: 200,
          borderRadius: 1,
          objectFit: 'cover',
          boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.1)}`,
          transition: 'transform 0.2s ease',
          '&:hover': {
            transform: 'scale(1.02)',
          },
        }}
      />
      <Box
        className="zoom-overlay"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.common.black, 0.4),
          opacity: 0,
          transition: 'opacity 0.2s ease',
          borderRadius: 1,
        }}
      >
        <ZoomIn sx={{ color: 'white', fontSize: 32 }} />
      </Box>
    </Box>
  );
}

interface VideoPreviewProps {
  src: string;
}

/**
 * Video preview component
 */
function VideoPreview({ src }: VideoPreviewProps) {
  const theme = useTheme();

  return (
    <Box
      component="video"
      controls
      src={src}
      sx={{
        maxWidth: 320,
        maxHeight: 240,
        borderRadius: 1,
        boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.1)}`,
      }}
    />
  );
}

interface ImageLightboxProps {
  open: boolean;
  src: string;
  onClose: () => void;
}

/**
 * Fullscreen image lightbox
 */
function ImageLightbox({ open, src, onClose }: ImageLightboxProps) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          bgcolor: 'transparent',
          boxShadow: 'none',
          maxWidth: '95vw',
          maxHeight: '95vh',
        },
      }}
    >
      <DialogContent
        sx={{
          p: 0,
          position: 'relative',
          bgcolor: alpha(theme.palette.common.black, 0.9),
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: alpha(theme.palette.common.white, 0.9),
            zIndex: 1,
            '&:hover': {
              bgcolor: theme.palette.common.white,
            },
          }}
        >
          <Close />
        </IconButton>
        <IconButton
          component="a"
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            position: 'absolute',
            top: 8,
            right: 48,
            bgcolor: alpha(theme.palette.common.white, 0.9),
            zIndex: 1,
            '&:hover': {
              bgcolor: theme.palette.common.white,
            },
          }}
        >
          <OpenInNew />
        </IconButton>
        <Box
          component="img"
          src={src}
          alt="Fullscreen preview"
          sx={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            objectFit: 'contain',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

interface MessageContentProps {
  /** The text content to render */
  text: string;
  /** Additional media URLs (from API) */
  mediaUrls?: string[];
  /** Typography variant */
  variant?: 'body1' | 'body2';
  /** Custom styles for the text */
  sx?: object;
}

/**
 * MessageContent - Renders message text with inline images and clickable links
 *
 * Features:
 * - Auto-detects image URLs in text and renders them inline
 * - Auto-detects video URLs and renders video player
 * - Makes regular URLs clickable
 * - Supports additional mediaUrls from API
 * - Lightbox for full-screen image viewing
 */
export function MessageContent({
  text,
  mediaUrls = [],
  variant = 'body2',
  sx = {},
}: MessageContentProps) {
  const theme = useTheme();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Parse text and extract media
  const { segments, inlineImages, inlineVideos, links } = useMemo(() => {
    const urls = extractUrls(text);
    const images: string[] = [];
    const videos: string[] = [];
    const regularLinks: string[] = [];

    urls.forEach((url) => {
      if (isImageUrl(url)) {
        images.push(url);
      } else if (isVideoUrl(url)) {
        videos.push(url);
      } else {
        regularLinks.push(url);
      }
    });

    // Create text segments (text between URLs becomes regular text, URLs become links/media)
    const parts: Array<{ type: 'text' | 'link' | 'image' | 'video'; content: string }> = [];
    let lastIndex = 0;
    let match;

    const regex = new RegExp(URL_REGEX.source, 'gi');
    while ((match = regex.exec(text)) !== null) {
      // Add text before URL
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        });
      }

      const url = match[0];
      if (isImageUrl(url)) {
        parts.push({ type: 'image', content: url });
      } else if (isVideoUrl(url)) {
        parts.push({ type: 'video', content: url });
      } else {
        parts.push({ type: 'link', content: url });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return {
      segments: parts,
      inlineImages: images,
      inlineVideos: videos,
      links: regularLinks,
    };
  }, [text]);

  // Combine inline images with mediaUrls prop
  const allImages = useMemo(() => {
    const combined = [...inlineImages, ...mediaUrls.filter(isImageUrl)];
    return [...new Set(combined)];
  }, [inlineImages, mediaUrls]);

  const allVideos = useMemo(() => {
    const combined = [...inlineVideos, ...mediaUrls.filter(isVideoUrl)];
    return [...new Set(combined)];
  }, [inlineVideos, mediaUrls]);

  return (
    <Box>
      {/* Render text with inline links (images/videos rendered separately below) */}
      <Typography variant={variant} sx={{ whiteSpace: 'pre-wrap', ...sx }}>
        {segments.map((segment, index) => {
          if (segment.type === 'text') {
            return <React.Fragment key={index}>{segment.content}</React.Fragment>;
          }

          if (segment.type === 'link') {
            return (
              <Link
                key={index}
                href={segment.content}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: theme.palette.primary.main,
                  textDecoration: 'underline',
                  wordBreak: 'break-all',
                  '&:hover': {
                    color: theme.palette.primary.dark,
                  },
                }}
              >
                {segment.content}
              </Link>
            );
          }

          // For images and videos in text, just show a placeholder link
          // The actual media will be rendered below
          if (segment.type === 'image' || segment.type === 'video') {
            return null;
          }

          return null;
        })}
      </Typography>

      {/* Render images */}
      {allImages.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            mt: segments.some((s) => s.type === 'text' && s.content.trim()) ? 1.5 : 0,
          }}
        >
          {allImages.map((url, index) => (
            <ImagePreview
              key={`img-${index}`}
              src={url}
              alt={`Image ${index + 1}`}
              onOpen={() => setLightboxImage(url)}
            />
          ))}
        </Box>
      )}

      {/* Render videos */}
      {allVideos.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            mt: 1.5,
          }}
        >
          {allVideos.map((url, index) => (
            <VideoPreview key={`vid-${index}`} src={url} />
          ))}
        </Box>
      )}

      {/* Lightbox */}
      <ImageLightbox
        open={!!lightboxImage}
        src={lightboxImage || ''}
        onClose={() => setLightboxImage(null)}
      />
    </Box>
  );
}

export default MessageContent;
