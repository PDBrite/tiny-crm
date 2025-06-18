import React, { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface CalendarPopupProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: string
  onDateSelect: (date: string) => void
  touchpointCounts: Record<string, number>
  onMonthChange?: (startDate: string, endDate: string) => void
}

export default function CalendarPopup({ 
  isOpen, 
  onClose, 
  selectedDate, 
  onDateSelect, 
  touchpointCounts,
  onMonthChange 
}: CalendarPopupProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate))
  const popupRef = useRef<HTMLDivElement>(null)

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Notify parent when month changes (only when user navigates)
  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
    
    // Fetch touchpoint counts for the new month
    if (onMonthChange) {
      const startOfMonth = new Date(newMonth.getFullYear(), newMonth.getMonth(), 1)
      const endOfMonth = new Date(newMonth.getFullYear(), newMonth.getMonth() + 1, 0)
      onMonthChange(
        startOfMonth.toISOString().split('T')[0],
        endOfMonth.toISOString().split('T')[0]
      )
    }
  }

  if (!isOpen) return null

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelectedDate = (date: Date) => {
    return formatDateForAPI(date) === selectedDate
  }



  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12 w-full"></div>)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const dateStr = formatDateForAPI(date)
      const touchpointCount = touchpointCounts[dateStr] || 0
      const isSelected = isSelectedDate(date)
      const isTodayDate = isToday(date)

      days.push(
        <button
          key={day}
          onClick={() => {
            onDateSelect(dateStr)
            onClose()
          }}
          className={`h-12 w-full flex flex-col items-center justify-center text-xs rounded-md transition-all duration-200 border ${
            isSelected
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : isTodayDate
              ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          <span className="font-medium text-sm">{day}</span>
          {touchpointCount > 0 && (
            <div className={`text-[10px] px-1 py-0.5 rounded-full font-medium leading-none ${
              isSelected 
                ? 'bg-white text-blue-600' 
                : touchpointCount > 5
                ? 'bg-red-100 text-red-700'
                : touchpointCount > 2
                ? 'bg-orange-100 text-orange-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {touchpointCount}
            </div>
          )}
        </button>
      )
    }

    return days
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-start">
      <div 
        ref={popupRef}
        className="absolute top-20 left-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80"
        style={{ zIndex: 1000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-blue-600" />
            Select Date
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => handleMonthChange('prev')}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <h4 className="text-base font-medium text-gray-900">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>
          <button
            onClick={() => handleMonthChange('next')}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={index} className="h-6 flex items-center justify-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {renderCalendar()}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-600 rounded mr-1"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded mr-1"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-100 rounded mr-1"></div>
              <span>1-2</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-100 rounded mr-1"></div>
              <span>5+</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 