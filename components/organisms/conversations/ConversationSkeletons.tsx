'use client';

import React, { memo } from 'react';
import {
  Box,
  Paper,
  Skeleton,
  Stack,
  Grid,
  alpha,
  useTheme,
} from '@mui/material';

/**
 * Skeleton for a single conversation item in the list
 * Matches the layout of ConversationItem component
 */
export const ConversationItemSkeleton = memo(() => {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 2,
        mb: 1,
        borderLeft: 3,
        borderColor: 'transparent',
        bgcolor: 'background.paper',
      }}
    >
      <Box display="flex" gap={1.5}>
        {/* Avatar */}
        <Skeleton
          variant="circular"
          width={40}
          height={40}
          sx={{ flexShrink: 0 }}
        />

        <Box flex={1} minWidth={0}>
          {/* Name and time row */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width={50} height={16} />
          </Box>

          {/* Last message */}
          <Skeleton variant="text" width="85%" height={20} sx={{ mb: 1 }} />

          {/* Chips row */}
          <Box display="flex" gap={0.5} alignItems="center">
            <Skeleton
              variant="rounded"
              width={70}
              height={20}
              sx={{ borderRadius: '10px' }}
            />
            <Skeleton
              variant="rounded"
              width={60}
              height={20}
              sx={{ borderRadius: '10px' }}
            />
            <Skeleton variant="text" width={40} height={16} />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
});
ConversationItemSkeleton.displayName = 'ConversationItemSkeleton';

/**
 * Skeleton for the conversation list
 * Shows multiple conversation item skeletons with staggered animation
 */
export const ConversationListSkeleton = memo(({ count = 6 }: { count?: number }) => {
  return (
    <Stack spacing={0}>
      {Array.from({ length: count }).map((_, index) => (
        <Box
          key={index}
          sx={{
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: `${index * 0.1}s`,
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.6 },
            },
          }}
        >
          <ConversationItemSkeleton />
        </Box>
      ))}
    </Stack>
  );
});
ConversationListSkeleton.displayName = 'ConversationListSkeleton';

/**
 * Skeleton for a single message bubble
 * Can be configured for client (left) or sofia (right) messages
 */
export const MessageBubbleSkeleton = memo(({
  isClient = true,
  hasMedia = false,
}: {
  isClient?: boolean;
  hasMedia?: boolean;
}) => {
  const theme = useTheme();
  const width = Math.random() * 30 + 40; // Random width between 40-70%

  return (
    <Box
      display="flex"
      justifyContent={isClient ? 'flex-start' : 'flex-end'}
      gap={1.5}
    >
      {isClient && (
        <Skeleton
          variant="circular"
          width={36}
          height={36}
          sx={{ flexShrink: 0 }}
        />
      )}

      <Paper
        elevation={0}
        sx={{
          p: 2,
          maxWidth: '70%',
          width: `${width}%`,
          bgcolor: isClient
            ? 'background.paper'
            : alpha(theme.palette.primary.main, 0.08),
          border: `1px solid ${
            isClient
              ? theme.palette.divider
              : alpha(theme.palette.primary.main, 0.2)
          }`,
          borderRadius: 2,
          borderBottomLeftRadius: isClient ? 4 : 2,
          borderBottomRightRadius: isClient ? 2 : 4,
        }}
      >
        {/* Message text lines */}
        <Skeleton variant="text" width="100%" height={20} />
        <Skeleton variant="text" width="80%" height={20} />
        {Math.random() > 0.5 && (
          <Skeleton variant="text" width="60%" height={20} />
        )}

        {/* Optional media placeholder */}
        {hasMedia && (
          <Skeleton
            variant="rounded"
            width="100%"
            height={120}
            sx={{ mt: 1, borderRadius: 1 }}
          />
        )}

        {/* Timestamp */}
        <Skeleton variant="text" width={80} height={14} sx={{ mt: 1 }} />
      </Paper>

      {!isClient && (
        <Skeleton
          variant="circular"
          width={36}
          height={36}
          sx={{ flexShrink: 0 }}
        />
      )}
    </Box>
  );
});
MessageBubbleSkeleton.displayName = 'MessageBubbleSkeleton';

/**
 * Skeleton for the messages list
 * Shows a realistic conversation pattern
 */
export const MessagesListSkeleton = memo(({ count = 5 }: { count?: number }) => {
  // Create a realistic pattern of messages
  const messagePattern = [
    { isClient: true, hasMedia: false },
    { isClient: false, hasMedia: false },
    { isClient: true, hasMedia: false },
    { isClient: true, hasMedia: true },
    { isClient: false, hasMedia: false },
    { isClient: false, hasMedia: false },
    { isClient: true, hasMedia: false },
  ];

  return (
    <Stack spacing={3}>
      {/* Date divider skeleton */}
      <Box display="flex" justifyContent="center" my={2}>
        <Skeleton
          variant="rounded"
          width={180}
          height={28}
          sx={{ borderRadius: '14px' }}
        />
      </Box>

      {messagePattern.slice(0, count).map((msg, index) => (
        <Box
          key={index}
          sx={{
            animation: 'fadeIn 0.3s ease-out',
            animationDelay: `${index * 0.05}s`,
            animationFillMode: 'backwards',
            '@keyframes fadeIn': {
              from: { opacity: 0, transform: 'translateY(10px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          <MessageBubbleSkeleton
            isClient={msg.isClient}
            hasMedia={msg.hasMedia}
          />
        </Box>
      ))}
    </Stack>
  );
});
MessagesListSkeleton.displayName = 'MessagesListSkeleton';

/**
 * Skeleton for stats cards
 */
export const StatsCardsSkeleton = memo(() => {
  const theme = useTheme();

  return (
    <Grid container spacing={1} mb={2}>
      {[
        alpha(theme.palette.success.main, 0.1),
        alpha(theme.palette.info.main, 0.1),
        alpha(theme.palette.grey[500], 0.1),
      ].map((bgcolor, index) => (
        <Grid item xs={4} key={index}>
          <Paper sx={{ p: { xs: 1, md: 1.5 }, textAlign: 'center', bgcolor }}>
            <Skeleton
              variant="text"
              width={40}
              height={32}
              sx={{ mx: 'auto' }}
            />
            <Skeleton
              variant="text"
              width={50}
              height={16}
              sx={{ mx: 'auto' }}
            />
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
});
StatsCardsSkeleton.displayName = 'StatsCardsSkeleton';

/**
 * Skeleton for the channel selector sidebar
 */
export const ChannelSelectorSkeleton = memo(() => {
  return (
    <Stack spacing={2} sx={{ height: '100%' }}>
      <Box sx={{ minHeight: 48, display: 'flex', alignItems: 'center' }}>
        <Skeleton variant="text" width={60} height={16} sx={{ px: 1 }} />
      </Box>
      <Stack spacing={1}>
        {[1, 2, 3, 4].map((index) => (
          <Paper
            key={index}
            elevation={0}
            sx={{
              p: 1.25,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width={20} height={14} />
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
});
ChannelSelectorSkeleton.displayName = 'ChannelSelectorSkeleton';

/**
 * Skeleton for the chat header
 */
export const ChatHeaderSkeleton = memo(() => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: { xs: 64, md: 88 },
        p: 2,
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.background.default, 0.5),
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
        <Box display="flex" gap={{ xs: 1, md: 2 }} alignItems="center">
          <Skeleton variant="circular" width={40} height={40} />
          <Box>
            <Skeleton variant="text" width={150} height={28} />
            <Box display="flex" gap={1} alignItems="center">
              <Skeleton
                variant="rounded"
                width={60}
                height={18}
                sx={{ borderRadius: '9px' }}
              />
              <Skeleton variant="text" width={80} height={14} />
            </Box>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="circular" width={32} height={32} />
        </Box>
      </Box>
    </Box>
  );
});
ChatHeaderSkeleton.displayName = 'ChatHeaderSkeleton';

/**
 * Full page skeleton for initial load
 * Shows the complete layout structure
 */
export const ConversationsPageSkeleton = memo(() => {
  const theme = useTheme();

  return (
    <Box sx={{ height: { xs: 'calc(100vh - 64px)', md: 'calc(100vh - 80px)' }, p: { xs: 0, md: 3 } }}>
      <Grid container spacing={{ xs: 0, md: 2 }} sx={{ height: '100%' }}>
        {/* Channel Selector */}
        <Grid item md={1.5} lg={1.2} sx={{ height: '100%', display: { xs: 'none', md: 'block' } }}>
          <ChannelSelectorSkeleton />
        </Grid>

        {/* Conversations List */}
        <Grid
          item
          xs={12}
          md={4}
          lg={3.3}
          sx={{
            height: '100%',
            borderRight: { md: `1px solid ${theme.palette.divider}` },
            pr: { md: 2 },
          }}
        >
          <Stack spacing={2} sx={{ height: '100%' }}>
            {/* Header */}
            <Box sx={{ px: { xs: 2, md: 0 }, pt: { xs: 2, md: 0 } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ minHeight: 48 }}>
                <Skeleton variant="text" width={120} height={36} />
                <Skeleton variant="circular" width={32} height={32} />
              </Box>

              <StatsCardsSkeleton />

              {/* Search */}
              <Box display="flex" gap={1}>
                <Skeleton variant="rounded" width="100%" height={40} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: 1 }} />
              </Box>
            </Box>

            {/* Conversation list */}
            <Box sx={{ flex: 1, px: { xs: 2, md: 0 } }}>
              <ConversationListSkeleton count={6} />
            </Box>
          </Stack>
        </Grid>

        {/* Messages Panel */}
        <Grid item xs={12} md={6.5} lg={7.5} sx={{ height: '100%', pl: { md: 2 }, display: { xs: 'none', md: 'block' } }}>
          <Box
            sx={{
              height: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <ChatHeaderSkeleton />

            <Box sx={{ flex: 1, p: 3, bgcolor: alpha(theme.palette.background.default, 0.3) }}>
              <MessagesListSkeleton count={5} />
            </Box>

            {/* Input skeleton */}
            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Box display="flex" gap={1.5}>
                <Skeleton
                  variant="rounded"
                  width="100%"
                  height={44}
                  sx={{ borderRadius: '20px' }}
                />
                <Skeleton
                  variant="circular"
                  width={44}
                  height={44}
                />
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
});
ConversationsPageSkeleton.displayName = 'ConversationsPageSkeleton';

export default {
  ConversationItemSkeleton,
  ConversationListSkeleton,
  MessageBubbleSkeleton,
  MessagesListSkeleton,
  StatsCardsSkeleton,
  ChannelSelectorSkeleton,
  ChatHeaderSkeleton,
  ConversationsPageSkeleton,
};
