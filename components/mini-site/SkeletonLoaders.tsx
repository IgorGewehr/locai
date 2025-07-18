'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  useTheme,
  alpha,
  Skeleton,
  Paper,
} from '@mui/material';
import { motion } from 'framer-motion';

// Enhanced Shimmer Animation
const shimmerKeyframes = `
  @keyframes shimmer {
    0% {
      background-position: -468px 0;
    }
    100% {
      background-position: 468px 0;
    }
  }
`;

const shimmerStyles = {
  background: `linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.4) 50%, 
    transparent 100%
  )`,
  backgroundSize: '468px 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'inherit',
    animation: 'inherit',
    zIndex: 1,
  },
};

// Inject shimmer keyframes
if (typeof window !== 'undefined' && !document.querySelector('#shimmer-styles')) {
  const style = document.createElement('style');
  style.id = 'shimmer-styles';
  style.textContent = shimmerKeyframes;
  document.head.appendChild(style);
}

// Enhanced Skeleton Component
interface EnhancedSkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'rectangular' | 'circular' | 'text' | 'rounded';
  animation?: 'pulse' | 'wave' | 'shimmer';
  delay?: number;
  children?: React.ReactNode;
}

export const EnhancedSkeleton: React.FC<EnhancedSkeletonProps> = ({
  width = '100%',
  height = '1rem',
  variant = 'rectangular',
  animation = 'shimmer',
  delay = 0,
  children,
}) => {
  const theme = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'circular':
        return { borderRadius: '50%' };
      case 'rounded':
        return { borderRadius: theme.spacing(2) };
      case 'text':
        return { borderRadius: theme.spacing(0.5) };
      default:
        return {};
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      <Box
        sx={{
          width,
          height,
          backgroundColor: alpha(theme.palette.text.primary, 0.11),
          ...(animation === 'shimmer' ? shimmerStyles : {}),
          ...getVariantStyles(),
        }}
      >
        {animation === 'pulse' && (
          <Skeleton
            variant={variant}
            width={width}
            height={height}
            animation="pulse"
            sx={{ bgcolor: 'transparent' }}
          />
        )}
        {animation === 'wave' && (
          <Skeleton
            variant={variant}
            width={width}
            height={height}
            animation="wave"
            sx={{ bgcolor: 'transparent' }}
          />
        )}
        {children}
      </Box>
    </motion.div>
  );
};

// Hero Section Skeleton
export const HeroSectionSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'relative',
        height: { xs: '100vh', md: '90vh' },
        minHeight: { xs: 600, md: 700 },
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={4} alignItems="center" textAlign="center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <EnhancedSkeleton
              width="60%"
              height="4rem"
              variant="text"
              animation="shimmer"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <EnhancedSkeleton
              width="80%"
              height="2rem"
              variant="text"
              animation="shimmer"
              delay={0.1}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{ width: '100%', maxWidth: 700 }}
          >
            <EnhancedSkeleton
              width="100%"
              height="60px"
              variant="rounded"
              animation="shimmer"
              delay={0.2}
            />
          </motion.div>

          <Grid container spacing={4} sx={{ mt: 2, maxWidth: 600 }}>
            {[0, 1, 2].map((index) => (
              <Grid item xs={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                >
                  <Stack alignItems="center" spacing={1}>
                    <EnhancedSkeleton
                      width="48px"
                      height="48px"
                      variant="circular"
                      animation="shimmer"
                      delay={0.3 + index * 0.1}
                    />
                    <EnhancedSkeleton
                      width="60px"
                      height="2rem"
                      variant="text"
                      animation="shimmer"
                      delay={0.4 + index * 0.1}
                    />
                    <EnhancedSkeleton
                      width="80px"
                      height="1rem"
                      variant="text"
                      animation="shimmer"
                      delay={0.5 + index * 0.1}
                    />
                  </Stack>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
};

// Property Card Skeleton
export const PropertyCardSkeleton: React.FC<{ variant?: 'default' | 'enhanced' }> = ({ 
  variant = 'default' 
}) => {
  const theme = useTheme();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        sx={{
          height: '100%',
          borderRadius: variant === 'enhanced' ? 3 : 2,
          overflow: 'hidden',
          background: variant === 'enhanced' 
            ? alpha(theme.palette.background.paper, 0.7)
            : theme.palette.background.paper,
          backdropFilter: variant === 'enhanced' ? 'blur(20px)' : 'none',
          border: variant === 'enhanced' 
            ? `1px solid ${alpha(theme.palette.divider, 0.2)}`
            : 'none',
          boxShadow: variant === 'enhanced'
            ? `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`
            : theme.shadows[2],
        }}
      >
        {/* Image Skeleton */}
        <Box sx={{ position: 'relative', paddingTop: '66.67%' }}>
          <EnhancedSkeleton
            width="100%"
            height="100%"
            variant="rectangular"
            animation="shimmer"
            sx={{ position: 'absolute', top: 0, left: 0 }}
          />
          
          {/* Badges */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
            }}
          >
            <EnhancedSkeleton
              width="60px"
              height="24px"
              variant="rounded"
              animation="shimmer"
              delay={0.1}
            />
            <EnhancedSkeleton
              width="40px"
              height="24px"
              variant="rounded"
              animation="shimmer"
              delay={0.2}
            />
          </Stack>

          {/* Action Buttons */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
            }}
          >
            <EnhancedSkeleton
              width="32px"
              height="32px"
              variant="circular"
              animation="shimmer"
              delay={0.3}
            />
            <EnhancedSkeleton
              width="32px"
              height="32px"
              variant="circular"
              animation="shimmer"
              delay={0.4}
            />
          </Stack>

          {/* Price Badge */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              right: 12,
            }}
          >
            <EnhancedSkeleton
              width="100px"
              height="60px"
              variant="rounded"
              animation="shimmer"
              delay={0.5}
            />
          </Box>
        </Box>

        {/* Content */}
        <CardContent>
          <Stack spacing={2}>
            {/* Title and Rating */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <EnhancedSkeleton
                width="70%"
                height="1.5rem"
                variant="text"
                animation="shimmer"
                delay={0.6}
              />
              <EnhancedSkeleton
                width="60px"
                height="1.5rem"
                variant="text"
                animation="shimmer"
                delay={0.7}
              />
            </Stack>

            {/* Location */}
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <EnhancedSkeleton
                width="16px"
                height="16px"
                variant="circular"
                animation="shimmer"
                delay={0.8}
              />
              <EnhancedSkeleton
                width="60%"
                height="1rem"
                variant="text"
                animation="shimmer"
                delay={0.9}
              />
            </Stack>

            {/* Property Specs */}
            <Stack direction="row" spacing={2}>
              {[0, 1, 2, 3].map((index) => (
                <Stack key={index} direction="row" alignItems="center" spacing={0.5}>
                  <EnhancedSkeleton
                    width="18px"
                    height="18px"
                    variant="circular"
                    animation="shimmer"
                    delay={1 + index * 0.1}
                  />
                  <EnhancedSkeleton
                    width="20px"
                    height="1rem"
                    variant="text"
                    animation="shimmer"
                    delay={1.1 + index * 0.1}
                  />
                </Stack>
              ))}
            </Stack>

            {/* Amenities */}
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {[0, 1, 2].map((index) => (
                <EnhancedSkeleton
                  key={index}
                  width="60px"
                  height="24px"
                  variant="rounded"
                  animation="shimmer"
                  delay={1.5 + index * 0.1}
                />
              ))}
            </Stack>

            {/* Description */}
            <Stack spacing={0.5}>
              <EnhancedSkeleton
                width="100%"
                height="1rem"
                variant="text"
                animation="shimmer"
                delay={1.8}
              />
              <EnhancedSkeleton
                width="80%"
                height="1rem"
                variant="text"
                animation="shimmer"
                delay={1.9}
              />
            </Stack>

            {/* Action Buttons */}
            <Stack direction="row" spacing={1}>
              <EnhancedSkeleton
                width="50%"
                height="36px"
                variant="rounded"
                animation="shimmer"
                delay={2}
              />
              <EnhancedSkeleton
                width="50%"
                height="36px"
                variant="rounded"
                animation="shimmer"
                delay={2.1}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Property Grid Skeleton
export const PropertyGridSkeleton: React.FC<{ count?: number; variant?: 'default' | 'enhanced' }> = ({ 
  count = 6, 
  variant = 'default' 
}) => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        {Array.from({ length: count }).map((_, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <PropertyCardSkeleton variant={variant} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

// Property Detail Skeleton
export const PropertyDetailSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        {/* Main Image Gallery */}
        <Grid item xs={12} md={8}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <EnhancedSkeleton
              width="100%"
              height="400px"
              variant="rounded"
              animation="shimmer"
            />
          </motion.div>
          
          {/* Thumbnail Gallery */}
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            {[0, 1, 2, 3, 4].map((index) => (
              <EnhancedSkeleton
                key={index}
                width="80px"
                height="60px"
                variant="rounded"
                animation="shimmer"
                delay={0.1 + index * 0.1}
              />
            ))}
          </Stack>
        </Grid>

        {/* Property Info */}
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Paper
              elevation={3}
              sx={{
                p: 3,
                borderRadius: 3,
                position: 'sticky',
                top: 100,
              }}
            >
              <Stack spacing={3}>
                {/* Title */}
                <EnhancedSkeleton
                  width="100%"
                  height="2rem"
                  variant="text"
                  animation="shimmer"
                />

                {/* Price */}
                <EnhancedSkeleton
                  width="60%"
                  height="2.5rem"
                  variant="text"
                  animation="shimmer"
                  delay={0.1}
                />

                {/* Location */}
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EnhancedSkeleton
                    width="16px"
                    height="16px"
                    variant="circular"
                    animation="shimmer"
                    delay={0.2}
                  />
                  <EnhancedSkeleton
                    width="80%"
                    height="1rem"
                    variant="text"
                    animation="shimmer"
                    delay={0.3}
                  />
                </Stack>

                {/* Specs */}
                <Stack spacing={2}>
                  {[0, 1, 2, 3].map((index) => (
                    <Stack key={index} direction="row" justifyContent="space-between">
                      <EnhancedSkeleton
                        width="40%"
                        height="1rem"
                        variant="text"
                        animation="shimmer"
                        delay={0.4 + index * 0.1}
                      />
                      <EnhancedSkeleton
                        width="30%"
                        height="1rem"
                        variant="text"
                        animation="shimmer"
                        delay={0.5 + index * 0.1}
                      />
                    </Stack>
                  ))}
                </Stack>

                {/* Buttons */}
                <Stack spacing={2}>
                  <EnhancedSkeleton
                    width="100%"
                    height="48px"
                    variant="rounded"
                    animation="shimmer"
                    delay={0.8}
                  />
                  <EnhancedSkeleton
                    width="100%"
                    height="48px"
                    variant="rounded"
                    animation="shimmer"
                    delay={0.9}
                  />
                </Stack>
              </Stack>
            </Paper>
          </motion.div>
        </Grid>

        {/* Description */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Stack spacing={2}>
                <EnhancedSkeleton
                  width="30%"
                  height="1.5rem"
                  variant="text"
                  animation="shimmer"
                />
                <EnhancedSkeleton
                  width="100%"
                  height="1rem"
                  variant="text"
                  animation="shimmer"
                  delay={0.1}
                />
                <EnhancedSkeleton
                  width="90%"
                  height="1rem"
                  variant="text"
                  animation="shimmer"
                  delay={0.2}
                />
                <EnhancedSkeleton
                  width="80%"
                  height="1rem"
                  variant="text"
                  animation="shimmer"
                  delay={0.3}
                />
              </Stack>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>
    </Container>
  );
};

// Navigation Skeleton
export const NavigationSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.9),
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        py: 2,
      }}
    >
      <Container maxWidth="xl">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          {/* Logo */}
          <Stack direction="row" alignItems="center" spacing={2}>
            <EnhancedSkeleton
              width="48px"
              height="48px"
              variant="circular"
              animation="shimmer"
            />
            <Stack spacing={0.5}>
              <EnhancedSkeleton
                width="120px"
                height="1.2rem"
                variant="text"
                animation="shimmer"
                delay={0.1}
              />
              <EnhancedSkeleton
                width="80px"
                height="0.8rem"
                variant="text"
                animation="shimmer"
                delay={0.2}
              />
            </Stack>
          </Stack>

          {/* Navigation Items */}
          <Stack direction="row" spacing={2}>
            {[0, 1, 2, 3].map((index) => (
              <EnhancedSkeleton
                key={index}
                width="60px"
                height="32px"
                variant="rounded"
                animation="shimmer"
                delay={0.3 + index * 0.1}
              />
            ))}
          </Stack>

          {/* Action Button */}
          <EnhancedSkeleton
            width="120px"
            height="40px"
            variant="rounded"
            animation="shimmer"
            delay={0.7}
          />
        </Stack>
      </Container>
    </Paper>
  );
};

// Footer Skeleton
export const FooterSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.9),
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        py: 6,
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={4}>
          <Grid item xs={12} md={3}>
            <Stack spacing={2}>
              <EnhancedSkeleton
                width="150px"
                height="1.5rem"
                variant="text"
                animation="shimmer"
              />
              <EnhancedSkeleton
                width="100%"
                height="1rem"
                variant="text"
                animation="shimmer"
                delay={0.1}
              />
              <EnhancedSkeleton
                width="80%"
                height="1rem"
                variant="text"
                animation="shimmer"
                delay={0.2}
              />
            </Stack>
          </Grid>

          {[0, 1, 2].map((section) => (
            <Grid item xs={12} md={3} key={section}>
              <Stack spacing={2}>
                <EnhancedSkeleton
                  width="100px"
                  height="1.2rem"
                  variant="text"
                  animation="shimmer"
                  delay={0.3 + section * 0.1}
                />
                {[0, 1, 2, 3].map((item) => (
                  <EnhancedSkeleton
                    key={item}
                    width="80px"
                    height="1rem"
                    variant="text"
                    animation="shimmer"
                    delay={0.4 + section * 0.1 + item * 0.05}
                  />
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Paper>
  );
};

export default {
  EnhancedSkeleton,
  HeroSectionSkeleton,
  PropertyCardSkeleton,
  PropertyGridSkeleton,
  PropertyDetailSkeleton,
  NavigationSkeleton,
  FooterSkeleton,
};