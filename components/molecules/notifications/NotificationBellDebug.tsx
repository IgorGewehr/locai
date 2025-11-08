'use client'

import React from 'react'
import { Badge, IconButton, Tooltip } from '@mui/material'
import { Notifications as NotificationsIcon } from '@mui/icons-material'

/**
 * Simplified NotificationBell for debugging
 * This component has minimal dependencies to isolate issues
 */
export const NotificationBellDebug: React.FC = () => {
  console.log('[NotificationBellDebug] Component rendering...')

  return (
    <Tooltip title="Debug Notification Bell">
      <IconButton
        size="medium"
        sx={{
          color: 'rgba(255, 255, 255, 0.8)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <Badge
          badgeContent={5}
          color="error"
          max={99}
        >
          <NotificationsIcon sx={{ fontSize: 24 }} />
        </Badge>
      </IconButton>
    </Tooltip>
  )
}

export default NotificationBellDebug
