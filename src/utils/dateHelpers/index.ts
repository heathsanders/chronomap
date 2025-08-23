/**
 * Date Helper Utilities
 * Common date manipulation and formatting functions for timeline functionality
 */

export type DateGrouping = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Format date for display based on grouping strategy
 */
export function formatDateForDisplay(date: Date, grouping: DateGrouping): string {
  const options: Intl.DateTimeFormatOptions = {};

  switch (grouping) {
    case 'daily':
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'weekly':
      const weekStart = getWeekStart(date);
      const weekEnd = getWeekEnd(date);
      return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'monthly':
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });
    case 'yearly':
      return date.getFullYear().toString();
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Get the start of the week for a given date
 */
export function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day;
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of the week for a given date
 */
export function getWeekEnd(date: Date): Date {
  const result = getWeekStart(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get week number for a given date
 */
export function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = Math.floor((date.getTime() - firstDayOfYear.getTime()) / 86400000);
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Get date from year and week number
 */
export function getDateFromWeek(year: number, week: number): Date {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysToAdd = (week - 1) * 7 - firstDayOfYear.getDay();
  return new Date(year, 0, 1 + daysToAdd);
}

/**
 * Get start and end dates for a date range based on grouping
 */
export function getDateRangeForGrouping(date: Date, grouping: DateGrouping): { start: Date; end: Date } {
  switch (grouping) {
    case 'daily':
      return {
        start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
        end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
      };
    case 'weekly':
      return {
        start: getWeekStart(date),
        end: getWeekEnd(date)
      };
    case 'monthly':
      return {
        start: new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
      };
    case 'yearly':
      return {
        start: new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0),
        end: new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999)
      };
  }
}

/**
 * Check if two dates are in the same group based on grouping strategy
 */
export function areDatesInSameGroup(date1: Date, date2: Date, grouping: DateGrouping): boolean {
  switch (grouping) {
    case 'daily':
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    case 'weekly':
      const week1 = getWeekNumber(date1);
      const week2 = getWeekNumber(date2);
      return date1.getFullYear() === date2.getFullYear() && week1 === week2;
    case 'monthly':
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth()
      );
    case 'yearly':
      return date1.getFullYear() === date2.getFullYear();
  }
}

/**
 * Generate a unique key for a date based on grouping
 */
export function generateDateKey(date: Date, grouping: DateGrouping): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  switch (grouping) {
    case 'daily':
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    case 'weekly':
      const weekStart = getWeekStart(date);
      return `${weekStart.getFullYear()}-W${getWeekNumber(weekStart).toString().padStart(2, '0')}`;
    case 'monthly':
      return `${year}-${month.toString().padStart(2, '0')}`;
    case 'yearly':
      return year.toString();
  }
}

/**
 * Parse a date key back to a date range
 */
export function parseDateKey(key: string, grouping: DateGrouping): { start: Date; end: Date } | null {
  switch (grouping) {
    case 'daily': {
      const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return null;
      const [, year, month, day] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return getDateRangeForGrouping(date, grouping);
    }
    case 'weekly': {
      const match = key.match(/^(\d{4})-W(\d{2})$/);
      if (!match) return null;
      const [, year, week] = match;
      const date = getDateFromWeek(parseInt(year), parseInt(week));
      return getDateRangeForGrouping(date, grouping);
    }
    case 'monthly': {
      const match = key.match(/^(\d{4})-(\d{2})$/);
      if (!match) return null;
      const [, year, month] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return getDateRangeForGrouping(date, grouping);
    }
    case 'yearly': {
      const match = key.match(/^(\d{4})$/);
      if (!match) return null;
      const [, year] = match;
      const date = new Date(parseInt(year), 0, 1);
      return getDateRangeForGrouping(date, grouping);
    }
  }
}

/**
 * Calculate the difference between two dates in days
 */
export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return areDatesInSameGroup(date, today, 'daily');
}

/**
 * Check if a date is this week
 */
export function isThisWeek(date: Date): boolean {
  const today = new Date();
  return areDatesInSameGroup(date, today, 'weekly');
}

/**
 * Check if a date is this month
 */
export function isThisMonth(date: Date): boolean {
  const today = new Date();
  return areDatesInSameGroup(date, today, 'monthly');
}

/**
 * Check if a date is this year
 */
export function isThisYear(date: Date): boolean {
  const today = new Date();
  return areDatesInSameGroup(date, today, 'yearly');
}

/**
 * Format relative time (e.g., "2 days ago", "1 week ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  
  const years = Math.floor(diffDays / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Get the start of day for a date
 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * Get the end of day for a date
 */
export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(date.getDate() + days);
  return result;
}

/**
 * Subtract days from a date
 */
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Get the minimum and maximum dates from an array of dates
 */
export function getDateRange(dates: Date[]): { min: Date; max: Date } | null {
  if (dates.length === 0) return null;
  
  let min = dates[0];
  let max = dates[0];
  
  for (let i = 1; i < dates.length; i++) {
    if (dates[i] < min) min = dates[i];
    if (dates[i] > max) max = dates[i];
  }
  
  return { min, max };
}