import { describe, expect, it } from 'vitest'
import { addDays, getDateStr, getDayOfWeek, getWeekStart } from '../../lib/date-utils'

describe('Date Utilities', () => {
  describe('getDateStr', () => {
    it('should format date correctly in UTC', () => {
      const date = new Date('2024-05-20T12:00:00Z')
      expect(getDateStr(date)).toBe('2024-05-20')
    })

    it('should format date correctly with timezone', () => {
      const date = new Date('2024-05-20T23:00:00Z')
      // 23:00 UTC on May 20 is May 21 in some Asian timezones
      expect(getDateStr(date, 'Asia/Ho_Chi_Minh')).toBe('2024-05-21')
    })
  })

  describe('addDays', () => {
    it('should add days correctly', () => {
      expect(addDays('2024-05-20', 1)).toBe('2024-05-21')
      expect(addDays('2024-05-20', -1)).toBe('2024-05-19')
      expect(addDays('2024-05-31', 1)).toBe('2024-06-01')
    })
  })

  describe('getWeekStart', () => {
    it('should return Monday as the start of the week', () => {
      // 2024-05-22 is Wednesday
      expect(getWeekStart('2024-05-22')).toBe('2024-05-20')
      // 2024-05-19 is Sunday
      expect(getWeekStart('2024-05-19')).toBe('2024-05-13')
    })
  })

  describe('getDayOfWeek', () => {
    it('should return correct day of week index (0-6)', () => {
      expect(getDayOfWeek('2024-05-20')).toBe(1) // Monday
      expect(getDayOfWeek('2024-05-26')).toBe(0) // Sunday
    })
  })
})
