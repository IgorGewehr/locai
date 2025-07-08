// lib/hooks/useCalendar.ts
import { useState, useCallback, useMemo } from 'react'
import { 
  formatDateKey, 
  getDaysBetween, 
  isWeekend, 
  isHoliday, 
  isToday,
  addDays,
  startOfDay
} from '@/lib/utils/dateUtils'
import { CalendarDay, DateRange } from '@/lib/types/property'

export interface UseCalendarReturn {
  selectedDates: Date[]
  selectedRange: DateRange | null
  focusedDate: Date
  calendarDays: CalendarDay[]
  selectDate: (date: Date) => void
  selectRange: (start: Date, end: Date) => void
  clearSelection: () => void
  setFocusedDate: (date: Date) => void
  goToNextMonth: () => void
  goToPreviousMonth: () => void
  isDateSelected: (date: Date) => boolean
  isDateInRange: (date: Date) => boolean
}

export function useCalendar(
  unavailableDates: Date[] = [],
  customPricing: Record<string, number> = {},
  basePrice: number = 0
): UseCalendarReturn {
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [selectedRange, setSelectedRange] = useState<DateRange | null>(null)
  const [focusedDate, setFocusedDate] = useState(new Date())

  const unavailableDatesSet = useMemo(() => 
    new Set(unavailableDates.map(d => formatDateKey(d))), 
    [unavailableDates]
  )

  const selectDate = useCallback((date: Date) => {
    setSelectedDates(prev => {
      const dateKey = formatDateKey(date)
      const isSelected = prev.some(d => formatDateKey(d) === dateKey)
      
      if (isSelected) {
        return prev.filter(d => formatDateKey(d) !== dateKey)
      } else {
        return [...prev, date]
      }
    })
    setSelectedRange(null)
  }, [])

  const selectRange = useCallback((start: Date, end: Date) => {
    const rangeDates = getDaysBetween(start, end)
    setSelectedDates(rangeDates)
    setSelectedRange({ start, end })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedDates([])
    setSelectedRange(null)
  }, [])

  const goToNextMonth = useCallback(() => {
    setFocusedDate(prev => addDays(prev, 30))
  }, [])

  const goToPreviousMonth = useCallback(() => {
    setFocusedDate(prev => addDays(prev, -30))
  }, [])

  const isDateSelected = useCallback((date: Date) => {
    const dateKey = formatDateKey(date)
    return selectedDates.some(d => formatDateKey(d) === dateKey)
  }, [selectedDates])

  const isDateInRange = useCallback((date: Date) => {
    if (!selectedRange) return false
    return date >= selectedRange.start && date <= selectedRange.end
  }, [selectedRange])

  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1)
    const endOfMonth = new Date(focusedDate.getFullYear(), focusedDate.getMonth() + 1, 0)
    
    const days: CalendarDay[] = []
    
    // Add days from previous month to fill the week
    const startDay = startOfMonth.getDay()
    for (let i = startDay - 1; i >= 0; i--) {
      const date = addDays(startOfMonth, -i - 1)
      days.push(createCalendarDay(date, unavailableDatesSet, customPricing, basePrice))
    }
    
    // Add days of the current month
    for (let day = 1; day <= endOfMonth.getDate(); day++) {
      const date = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), day)
      days.push(createCalendarDay(date, unavailableDatesSet, customPricing, basePrice))
    }
    
    // Add days from next month to fill the week
    const endDay = endOfMonth.getDay()
    for (let i = 1; i < 7 - endDay; i++) {
      const date = addDays(endOfMonth, i)
      days.push(createCalendarDay(date, unavailableDatesSet, customPricing, basePrice))
    }
    
    return days
  }, [focusedDate, unavailableDatesSet, customPricing, basePrice])

  return {
    selectedDates,
    selectedRange,
    focusedDate,
    calendarDays,
    selectDate,
    selectRange,
    clearSelection,
    setFocusedDate,
    goToNextMonth,
    goToPreviousMonth,
    isDateSelected,
    isDateInRange,
  }
}

function createCalendarDay(
  date: Date,
  unavailableDatesSet: Set<string>,
  customPricing: Record<string, number>,
  basePrice: number
): CalendarDay {
  const dateKey = formatDateKey(date)
  
  return {
    date,
    isAvailable: !unavailableDatesSet.has(dateKey),
    price: customPricing[dateKey] || basePrice,
    isWeekend: isWeekend(date),
    isHoliday: isHoliday(date),
    isToday: isToday(date),
    isSelected: false, // This will be set by the component
  }
}