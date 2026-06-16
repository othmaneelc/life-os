import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getGreeting,
  getTodayStr,
  getDaysSince,
  daysBetween,
  getDaysElapsed,
  parseTime,
  timeToMinutes,
  formatTimeDisplay,
} from '../dateHelpers'

describe('getGreeting', () => {
  it('returns Good morning for 5-11', () => {
    vi.setSystemTime(new Date('2026-05-22T08:00:00'))
    expect(getGreeting()).toBe('Good morning')
  })

  it('returns Good afternoon for 12-17', () => {
    vi.setSystemTime(new Date('2026-05-22T14:00:00'))
    expect(getGreeting()).toBe('Good afternoon')
  })

  it('returns Good evening for 18-21', () => {
    vi.setSystemTime(new Date('2026-05-22T19:00:00'))
    expect(getGreeting()).toBe('Good evening')
  })

  it('returns Good night for 22-4', () => {
    vi.setSystemTime(new Date('2026-05-22T23:00:00'))
    expect(getGreeting()).toBe('Good night')
  })

  it('returns Good night for midnight', () => {
    vi.setSystemTime(new Date('2026-05-22T00:00:00'))
    expect(getGreeting()).toBe('Good night')
  })
})

describe('getTodayStr', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('returns YYYY-MM-DD format', () => {
    vi.setSystemTime(new Date('2026-05-22'))
    expect(getTodayStr()).toBe('2026-05-22')
  })

  it('zero-pads month and day', () => {
    vi.setSystemTime(new Date('2026-01-05'))
    expect(getTodayStr()).toBe('2026-01-05')
  })
})

describe('getDaysSince', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('returns 0 for today', () => {
    vi.setSystemTime(new Date('2026-05-22'))
    expect(getDaysSince('2026-05-22')).toBe(0)
  })

  it('returns positive for past dates', () => {
    vi.setSystemTime(new Date('2026-05-22'))
    expect(getDaysSince('2026-05-20')).toBe(2)
  })
})

describe('daysBetween', () => {
  it('returns days between dates', () => {
    expect(daysBetween('2026-05-20', '2026-05-22')).toBe(2)
  })

  it('returns 0 for same date', () => {
    expect(daysBetween('2026-05-22', '2026-05-22')).toBe(0)
  })

  it('returns negative if start after end', () => {
    expect(daysBetween('2026-05-22', '2026-05-20')).toBe(-2)
  })
})

describe('getDaysElapsed', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('returns 0 at start', () => {
    vi.setSystemTime(new Date('2026-05-20'))
    expect(getDaysElapsed('2026-05-20', '2026-05-25')).toBe(0)
  })

  it('returns clamped value', () => {
    vi.setSystemTime(new Date('2026-06-01'))
    expect(getDaysElapsed('2026-05-20', '2026-05-25')).toBe(5)
  })
})

describe('parseTime', () => {
  it('parses HH:MM format', () => {
    expect(parseTime('14:30')).toEqual({ h: 14, m: 30 })
  })

  it('handles single-digit hours', () => {
    expect(parseTime('05:05')).toEqual({ h: 5, m: 5 })
  })
})

describe('timeToMinutes', () => {
  it('converts time to minutes', () => {
    expect(timeToMinutes('02:30')).toBe(150)
  })

  it('returns 0 for midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0)
  })
})

describe('formatTimeDisplay', () => {
  it('formats AM time', () => {
    expect(formatTimeDisplay('08:30')).toBe('8:30 AM')
  })

  it('formats PM time', () => {
    expect(formatTimeDisplay('14:30')).toBe('2:30 PM')
  })

  it('handles noon', () => {
    expect(formatTimeDisplay('12:00')).toBe('12:00 PM')
  })

  it('handles midnight', () => {
    expect(formatTimeDisplay('00:00')).toBe('12:00 AM')
  })
})
