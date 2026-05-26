'use client';

import React from 'react';
import { Box, Card, Skeleton, Grid } from '@mui/material';

/**
 * Reusable dark-themed loading skeletons for Locai.
 *
 * Aesthetic: dark panels (#111827), subtle borders (rgba(255,255,255,0.08)),
 * shimmer fills (rgba(255,255,255,0.06)), rounded corners. Wave animation.
 * No brand red here on purpose — skeletons stay quiet until real data lands.
 */

const SKELETON_BG = 'rgba(255, 255, 255, 0.06)';
const PANEL_BG = '#111827';
const PANEL_BORDER = '1px solid rgba(255, 255, 255, 0.08)';

const baseSkeletonSx = {
  bgcolor: SKELETON_BG,
} as const;

interface StatCardsSkeletonProps {
  /** Number of stat cards in the row. Default 4. */
  count?: number;
}

/** A responsive row of rounded stat-card skeletons. */
export function StatCardsSkeleton({ count = 4 }: StatCardsSkeletonProps) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid item xs={12} sm={6} md={12 / count} key={i}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              bgcolor: PANEL_BG,
              border: PANEL_BORDER,
              borderRadius: '12px',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <Skeleton
                  variant="rounded"
                  animation="wave"
                  width="55%"
                  height={32}
                  sx={{ ...baseSkeletonSx, borderRadius: '10px', mb: 1 }}
                />
                <Skeleton
                  variant="rounded"
                  animation="wave"
                  width="80%"
                  height={16}
                  sx={{ ...baseSkeletonSx, borderRadius: '8px' }}
                />
              </Box>
              <Skeleton
                variant="rounded"
                animation="wave"
                width={40}
                height={40}
                sx={{ ...baseSkeletonSx, borderRadius: '12px', ml: 2 }}
              />
            </Box>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

interface ListSkeletonProps {
  /** Number of list rows. Default 6. */
  count?: number;
  /** Render an avatar circle on the left of each row. Default true. */
  showAvatar?: boolean;
}

/** Vertical list of row skeletons: avatar + two text lines + trailing action. */
export function ListSkeleton({ count = 6, showAvatar = true }: ListSkeletonProps) {
  return (
    <Box>
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 2,
            px: 2,
            borderBottom: i < count - 1 ? PANEL_BORDER : 'none',
          }}
        >
          {showAvatar && (
            <Skeleton
              variant="circular"
              animation="wave"
              width={48}
              height={48}
              sx={{ ...baseSkeletonSx, flexShrink: 0 }}
            />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton
              variant="rounded"
              animation="wave"
              width="40%"
              height={18}
              sx={{ ...baseSkeletonSx, borderRadius: '8px', mb: 1 }}
            />
            <Skeleton
              variant="rounded"
              animation="wave"
              width="65%"
              height={14}
              sx={{ ...baseSkeletonSx, borderRadius: '8px' }}
            />
          </Box>
          <Skeleton
            variant="rounded"
            animation="wave"
            width={40}
            height={40}
            sx={{ ...baseSkeletonSx, borderRadius: '12px', flexShrink: 0 }}
          />
        </Box>
      ))}
    </Box>
  );
}

interface CardGridSkeletonProps {
  /** Number of card placeholders. Default 8. */
  count?: number;
}

/** Responsive grid of card skeletons (image header + title + meta lines). */
export function CardGridSkeleton({ count = 8 }: CardGridSkeletonProps) {
  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid item xs={12} sm={6} md={4} lg={3} xl={3} key={i}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: PANEL_BG,
              border: PANEL_BORDER,
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <Skeleton
              variant="rounded"
              animation="wave"
              height={200}
              sx={{ ...baseSkeletonSx, borderRadius: 0 }}
            />
            <Box sx={{ p: 2.5, flexGrow: 1 }}>
              <Skeleton
                variant="rounded"
                animation="wave"
                width="85%"
                height={22}
                sx={{ ...baseSkeletonSx, borderRadius: '8px', mb: 1.5 }}
              />
              <Skeleton
                variant="rounded"
                animation="wave"
                width="60%"
                height={16}
                sx={{ ...baseSkeletonSx, borderRadius: '8px', mb: 2 }}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Skeleton
                  variant="rounded"
                  animation="wave"
                  width={48}
                  height={16}
                  sx={{ ...baseSkeletonSx, borderRadius: '8px' }}
                />
                <Skeleton
                  variant="rounded"
                  animation="wave"
                  width={48}
                  height={16}
                  sx={{ ...baseSkeletonSx, borderRadius: '8px' }}
                />
                <Skeleton
                  variant="rounded"
                  animation="wave"
                  width={64}
                  height={16}
                  sx={{ ...baseSkeletonSx, borderRadius: '8px' }}
                />
              </Box>
            </Box>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

interface TableSkeletonProps {
  /** Number of body rows. Default 6. */
  rows?: number;
  /** Number of columns per row. Default 5. */
  columns?: number;
}

/** Table-shaped skeleton: a header strip plus N rows of column cells. */
export function TableSkeleton({ rows = 6, columns = 5 }: TableSkeletonProps) {
  return (
    <Box sx={{ width: '100%' }}>
      {/* Header strip */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          px: 2,
          py: 1.5,
          borderBottom: PANEL_BORDER,
        }}
      >
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton
            key={c}
            variant="rounded"
            animation="wave"
            height={16}
            sx={{ ...baseSkeletonSx, borderRadius: '8px', flex: c === 0 ? 1.5 : 1 }}
          />
        ))}
      </Box>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <Box
          key={r}
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            px: 2,
            py: 2,
            borderBottom: r < rows - 1 ? PANEL_BORDER : 'none',
          }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              variant="rounded"
              animation="wave"
              height={14}
              sx={{ ...baseSkeletonSx, borderRadius: '8px', flex: c === 0 ? 1.5 : 1 }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}

export default {
  StatCardsSkeleton,
  ListSkeleton,
  CardGridSkeleton,
  TableSkeleton,
};
