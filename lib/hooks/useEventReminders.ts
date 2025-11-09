// lib/hooks/useEventReminders.ts
// Hook to manage event reminder service lifecycle

import { useEffect } from 'react'
import { eventReminderService } from '@/lib/services/event-reminder-service'
import { logger } from '@/lib/utils/logger'

export function useEventReminders(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    // Start the service when component mounts
    logger.info('[useEventReminders] Initializing event reminder service', {
      component: 'useEventReminders'
    })

    eventReminderService.start()

    // Cleanup: stop the service when component unmounts
    return () => {
      logger.info('[useEventReminders] Stopping event reminder service', {
        component: 'useEventReminders'
      })
      eventReminderService.stop()
    }
  }, [enabled])

  return {
    status: eventReminderService.getStatus()
  }
}
