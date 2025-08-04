/**
 * Date utility functions to handle timezone issues consistently
 */

/**
 * Get the current date in YYYY-MM-DD format using local timezone
 * This avoids timezone issues that can occur with toISOString()
 */
export function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert a Date object to YYYY-MM-DD format using local timezone
 * @param date Date object to convert
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Create a date range for a specific date (start and end of day in UTC)
 * This is useful for database queries that need to match a specific date
 * @param dateString Date string in YYYY-MM-DD format
 * @returns Object with start and end dates in UTC
 */
export function createDateRangeForDate(dateString: string): {
  start: Date;
  end: Date;
} {
  const [year, month, day] = dateString.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  return { start, end };
}

/**
 * Check if a date string represents today
 * @param dateString Date string in YYYY-MM-DD format
 * @returns True if the date is today
 */
export function isToday(dateString: string): boolean {
  return dateString === getCurrentDateString();
}

/**
 * Get a date string for a specific number of days from today
 * @param daysOffset Number of days to add/subtract (positive for future, negative for past)
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateStringFromToday(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return formatDateToLocalString(date);
}

/**
 * Debug function to test date utilities
 * @returns Object with current date information for debugging
 */
export function debugDateInfo(): {
  currentDate: Date;
  currentDateString: string;
  toISOStringDate: string;
  timezone: string;
} {
  const now = new Date();
  return {
    currentDate: now,
    currentDateString: getCurrentDateString(),
    toISOStringDate: now.toISOString().split('T')[0],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
} 