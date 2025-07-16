'use client';

import React from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Skeleton, 
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import PropertyCardSkeleton from './PropertyCardSkeleton';

export default function PropertyGridSkeleton() {
  const theme = useTheme();

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="xl">
        {/* Header skeleton */}
        <Box sx={{ mb: 4 }}>
          <Stack spacing={3}>
            {/* Hero section skeleton */}
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Skeleton 
                variant="text" 
                width="60%" 
                height={48}
                sx={{ 
                  mx: 'auto',
                  mb: 2,
                  bgcolor: alpha(theme.palette.text.primary, 0.1),
                }}
              />
              <Skeleton 
                variant="text" 
                width="40%" 
                height={24}
                sx={{ 
                  mx: 'auto',
                  bgcolor: alpha(theme.palette.text.secondary, 0.1),
                }}
              />
            </Box>

            {/* Search and filters skeleton */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              flexWrap: 'wrap',
              justifyContent: 'center',
              mb: 4,
            }}>
              {/* Search bar skeleton */}
              <Skeleton 
                variant="rounded" 
                width={300} 
                height={48}
                sx={{ 
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                  borderRadius: 3,
                }}
              />
              
              {/* Filter buttons skeleton */}
              {[1, 2, 3, 4].map((index) => (
                <Skeleton 
                  key={index}
                  variant="rounded" 
                  width={100} 
                  height={48}
                  sx={{ 
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    borderRadius: 3,
                  }}
                />
              ))}
            </Box>

            {/* Results count skeleton */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton 
                variant="text" 
                width={200} 
                height={24}
                sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1) }}
              />
              
              <Skeleton 
                variant="rounded" 
                width={150} 
                height={36}
                sx={{ 
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                  borderRadius: 2,
                }}
              />
            </Box>
          </Stack>
        </Box>

        {/* Properties grid skeleton */}
        <Grid container spacing={3}>
          {Array.from({ length: 9 }).map((_, index) => (
            <Grid 
              item 
              xs={12} 
              sm={6} 
              md={4} 
              lg={3} 
              key={index}
              className="stagger-item"
              sx={{
                opacity: 0,
                animation: 'fadeInUp 0.6s ease-out forwards',
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <PropertyCardSkeleton />
            </Grid>
          ))}
        </Grid>

        {/* Pagination skeleton */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mt: 6,
          gap: 1,
        }}>
          {[1, 2, 3, 4, 5].map((index) => (
            <Skeleton 
              key={index}
              variant="circular" 
              width={40} 
              height={40}
              sx={{ 
                bgcolor: alpha(theme.palette.background.paper, 0.8),
              }}
            />
          ))}
        </Box>
      </Container>
    </Box>
  );
}