'use client';

import React from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Skeleton, 
  Stack,
  Card,
  CardContent,
  useTheme,
  alpha
} from '@mui/material';

export default function PropertyDetailSkeleton() {
  const theme = useTheme();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Back button skeleton */}
      <Box sx={{ mb: 3 }}>
        <Skeleton 
          variant="rounded" 
          width={180} 
          height={36}
          sx={{ 
            bgcolor: alpha(theme.palette.text.secondary, 0.1),
            borderRadius: 2,
          }}
        />
      </Box>

      {/* Hero image skeleton */}
      <Box sx={{ 
        position: 'relative', 
        height: { xs: 300, md: 500 },
        borderRadius: 4,
        overflow: 'hidden',
        mb: 4,
      }}>
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height="100%" 
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          }}
        />
        
        {/* Navigation buttons skeleton */}
        <Box sx={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}>
          <Skeleton 
            variant="circular" 
            width={48} 
            height={48}
            sx={{ bgcolor: alpha(theme.palette.background.paper, 0.9) }}
          />
        </Box>
        <Box sx={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
          <Skeleton 
            variant="circular" 
            width={48} 
            height={48}
            sx={{ bgcolor: alpha(theme.palette.background.paper, 0.9) }}
          />
        </Box>
        
        {/* Action buttons skeleton */}
        <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 1 }}>
          <Skeleton 
            variant="circular" 
            width={40} 
            height={40}
            sx={{ bgcolor: alpha(theme.palette.background.paper, 0.9) }}
          />
          <Skeleton 
            variant="circular" 
            width={40} 
            height={40}
            sx={{ bgcolor: alpha(theme.palette.background.paper, 0.9) }}
          />
        </Box>
        
        {/* Image counter skeleton */}
        <Box sx={{ position: 'absolute', bottom: 16, left: 16 }}>
          <Skeleton 
            variant="rounded" 
            width={80} 
            height={32}
            sx={{ bgcolor: alpha(theme.palette.background.paper, 0.9) }}
          />
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* Main Content */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={4}>
            {/* Property Title and Basic Info */}
            <Box>
              <Skeleton 
                variant="text" 
                width="80%" 
                height={48}
                sx={{ 
                  mb: 2,
                  bgcolor: alpha(theme.palette.text.primary, 0.1),
                }}
              />
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Skeleton 
                  variant="circular" 
                  width={20} 
                  height={20}
                  sx={{ mr: 1, bgcolor: alpha(theme.palette.text.secondary, 0.1) }}
                />
                <Skeleton 
                  variant="text" 
                  width="60%" 
                  height={24}
                  sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1) }}
                />
              </Box>
              
              <Stack direction="row" spacing={3} sx={{ mb: 3 }}>
                {[1, 2, 3, 4].map((index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Skeleton 
                      variant="circular" 
                      width={20} 
                      height={20}
                      sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1) }}
                    />
                    <Skeleton 
                      variant="text" 
                      width={40} 
                      height={16}
                      sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1) }}
                    />
                  </Box>
                ))}
              </Stack>
              
              <Skeleton 
                variant="rounded" 
                width={180} 
                height={32}
                sx={{ 
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderRadius: 2,
                }}
              />
            </Box>

            {/* Description Card */}
            <Card>
              <CardContent>
                <Skeleton 
                  variant="text" 
                  width="40%" 
                  height={32}
                  sx={{ 
                    mb: 2,
                    bgcolor: alpha(theme.palette.text.primary, 0.1),
                  }}
                />
                <Stack spacing={1}>
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="95%" height={20} />
                  <Skeleton variant="text" width="90%" height={20} />
                  <Skeleton variant="text" width="85%" height={20} />
                  <Skeleton variant="text" width="70%" height={20} />
                </Stack>
              </CardContent>
            </Card>

            {/* Amenities Card */}
            <Card>
              <CardContent>
                <Skeleton 
                  variant="text" 
                  width="30%" 
                  height={32}
                  sx={{ 
                    mb: 2,
                    bgcolor: alpha(theme.palette.text.primary, 0.1),
                  }}
                />
                <Grid container spacing={2}>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                        <Skeleton 
                          variant="circular" 
                          width={36} 
                          height={36}
                          sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                        />
                        <Skeleton 
                          variant="text" 
                          width={120} 
                          height={20}
                          sx={{ bgcolor: alpha(theme.palette.text.primary, 0.1) }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            {/* Policies Card */}
            <Card>
              <CardContent>
                <Skeleton 
                  variant="text" 
                  width="35%" 
                  height={32}
                  sx={{ 
                    mb: 2,
                    bgcolor: alpha(theme.palette.text.primary, 0.1),
                  }}
                />
                <Stack spacing={2}>
                  {[1, 2, 3, 4].map((index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Skeleton 
                        variant="circular" 
                        width={24} 
                        height={24}
                        sx={{ 
                          mt: 0.5,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton 
                          variant="text" 
                          width="60%" 
                          height={20}
                          sx={{ 
                            mb: 0.5,
                            bgcolor: alpha(theme.palette.text.primary, 0.1),
                          }}
                        />
                        <Skeleton 
                          variant="text" 
                          width="80%" 
                          height={16}
                          sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1) }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Booking Sidebar */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ position: 'sticky', top: 100 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                {/* Price section */}
                <Box>
                  <Skeleton 
                    variant="text" 
                    width="60%" 
                    height={40}
                    sx={{ 
                      mb: 1,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    }}
                  />
                  <Skeleton 
                    variant="text" 
                    width="40%" 
                    height={20}
                    sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1) }}
                  />
                  
                  <Box sx={{ mt: 2 }}>
                    <Skeleton variant="text" width="70%" height={16} />
                    <Skeleton variant="text" width="60%" height={16} />
                  </Box>
                </Box>

                {/* Booking button */}
                <Skeleton 
                  variant="rounded" 
                  width="100%" 
                  height={48}
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    borderRadius: 2,
                  }}
                />

                {/* Info text */}
                <Box sx={{ textAlign: 'center' }}>
                  <Skeleton variant="text" width="80%" height={16} />
                  <Skeleton variant="text" width="60%" height={16} />
                </Box>

                {/* Info box */}
                <Box sx={{ p: 2, backgroundColor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                  <Skeleton 
                    variant="text" 
                    width="100%" 
                    height={16}
                    sx={{ bgcolor: alpha(theme.palette.text.primary, 0.1) }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}