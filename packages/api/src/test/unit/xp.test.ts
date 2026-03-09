import { describe, expect, it } from 'vitest'
import { getLevelFromXp, getLevelInfo, getProgressToNextLevel, xpForLevel } from '../../lib/xp'

describe('XP Logic', () => {
  describe('xpForLevel', () => {
    it('should calculate XP correctly for levels', () => {
      expect(xpForLevel(0)).toBe(0)
      expect(xpForLevel(1)).toBe(100)
      expect(xpForLevel(2)).toBe(300)
      expect(xpForLevel(3)).toBe(600)
    })
  })

  describe('getLevelFromXp', () => {
    it('should return correct level for given XP', () => {
      expect(getLevelFromXp(0)).toBe(1)
      expect(getLevelFromXp(99)).toBe(1)
      expect(getLevelFromXp(100)).toBe(2)
      expect(getLevelFromXp(299)).toBe(2)
      expect(getLevelFromXp(300)).toBe(3)
    })
  })

  describe('getLevelInfo', () => {
    it('should return correct info for levels 1-18', () => {
      const level1 = getLevelInfo(1)
      expect(level1.nameEn).toBe('Recruit')
      expect(level1.icon).toBe('rank-1')

      const level18 = getLevelInfo(18)
      expect(level18.nameEn).toBe('General')
      expect(level18.icon).toBe('rank-18')
    })

    it('should return roman numerals for levels above 18', () => {
      const level19 = getLevelInfo(19)
      expect(level19.nameEn).toBe('General I')
      expect(level19.nameVi).toBe('Đại tướng I')

      const level22 = getLevelInfo(22)
      expect(level22.nameEn).toBe('General IV')
    })
  })

  describe('getProgressToNextLevel', () => {
    it('should return correct progress data', () => {
      const progress = getProgressToNextLevel(150)
      expect(progress.currentLevel).toBe(2)
      expect(progress.currentLevelXp).toBe(100)
      expect(progress.nextLevelXp).toBe(300)
      expect(progress.progressXp).toBe(50)
    })
  })
})
