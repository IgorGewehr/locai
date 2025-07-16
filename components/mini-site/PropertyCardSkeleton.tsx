'use client';

import React from 'react';
import { 
  Card, 
  CardContent, 
  Box, 
  Skeleton, 
  Stack,
  useTheme,
  alpha
} from '@mui/material';

export default function PropertyCardSkeleton() {
  const theme = useTheme();

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        '&:hover': {
          transform: 'none',
          boxShadow: 'none',
        },
      }}
    >
      {/* Image skeleton */}
      <Box sx={{ position: 'relative', height: 240 }}>
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height="100%" 
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            '&::after': {
              animationDuration: '1.5s',
            },
          }}
        />
        
        {/* Favorite button skeleton */}
        <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
          <Skeleton 
            variant="circular" 
            width={36} 
            height={36}
            sx={{ bgcolor: alpha(theme.palette.background.paper, 0.9) }}
          />
        </Box>
        
        {/* Image counter skeleton */}
        <Box sx={{ position: 'absolute', bottom: 12, right: 12 }}>
          <Skeleton 
            variant="rounded" 
            width={60} 
            height={24}
            sx={{ bgcolor: alpha(theme.palette.background.paper, 0.9) }}
          />
        </Box>
      </Box>

      <CardContent sx={{ flex: 1, p: 2.5 }}>
        <Stack spacing={2}>
          {/* Title skeleton */}
          <Box>
            <Skeleton 
              variant="text" 
              width="85%" 
              height={28}
              sx={{ 
                fontSize: '1.25rem',
                bgcolor: alpha(theme.palette.text.primary, 0.1),
              }}
            />
            <Skeleton 
              variant="text" 
              width="60%" 
              height={20}
              sx={{ 
                mt: 0.5,
                bgcolor: alpha(theme.palette.text.secondary, 0.1),
              }}
            />
          </Box>

          {/* Location skeleton */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton 
              variant="circular" 
              width={16} 
              height={16}
              sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1) }}
            />
            <Skeleton 
              variant="text" 
              width="70%" 
              height={20}
              sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1) }}
            />
          </Box>

          {/* Features skeleton */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3].map((index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Skeleton 
                  variant="circular" 
                  width={16} 
                  height={16}
                  sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1) }}
                />
                <Skeleton 
                  variant="text" 
                  width={20} 
                  height={16}
                  sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1) }}
                />
              </Box>
            ))}
          </Box>

          {/* Amenities skeleton */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map((index) => (
              <Skeleton 
                key={index}
                variant="rounded" 
                width={60} 
                height={20}
                sx={{ 
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderRadius: 1,
                }}
              />
            ))}
          </Box>

          {/* Price and button skeleton */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Box>
              <Skeleton 
                variant="text" 
                width={80} 
                height={24}
                sx={{ 
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  fontWeight: 'bold',
                }}
              />
              <Skeleton 
                variant="text" 
                width={60} 
                height={16}
                sx={{ 
                  bgcolor: alpha(theme.palette.text.secondary, 0.1),
                  mt: 0.5,
                }}
              />
            </Box>
            
            <Skeleton 
              variant="rounded" 
              width={120} 
              height={36}
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                borderRadius: 2,
              }}
            />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}