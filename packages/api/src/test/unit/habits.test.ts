import { describe, it, expect, beforeEach } from 'vitest'
import { Habit, HabitCompletion, UserProfile, XpTransaction } from '@we-grow/db/models/index'
import { generateId } from '@we-grow/db/utils/id'

import { createTestContext, createMockSession } from '../utils/create-test-context'
import { createMockUser } from '../utils/mock-data'
import { habitsRouter } from '../../routers/habits'
import { XP_REWARDS } from '../../lib/xp'

describe('Habits Router', () => {
  const mockUserId = generateId()
  const mockSession = createMockSession({
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
  })
  const authenticatedContext = createTestContext(mockSession.user)

  beforeEach(async () => {
    // Clear all collections before each test
    await Habit.deleteMany({})
    await HabitCompletion.deleteMany({})
    await UserProfile.deleteMany({})
    await XpTransaction.deleteMany({})
  })

  describe('list', () => {
    it('should return empty array when user has no habits', async () => {
      const result = await habitsRouter.list.handler({
        context: authenticatedContext,
        input: undefined,
      })

      expect(result).toEqual([])
    })

    it('should return only unarchived habits by default', async () => {
      const now = new Date()
      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'Active Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'Archived Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        archived: true,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.list.handler({
        context: authenticatedContext,
        input: undefined,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.title).toBe('Active Habit')
    })

    it('should return all habits when includeArchived is true', async () => {
      const now = new Date()
      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'Active Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'Archived Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        archived: true,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.list.handler({
        context: authenticatedContext,
        input: { includeArchived: true },
      })

      expect(result).toHaveLength(2)
    })

    it('should only return habits for current user', async () => {
      const otherUserId = generateId()
      const now = new Date()

      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'My Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      await Habit.create({
        _id: generateId(),
        userId: otherUserId,
        title: 'Other Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.list.handler({
        context: authenticatedContext,
        input: undefined,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.title).toBe('My Habit')
    })
  })

  describe('getById', () => {
    it('should return habit with completion status', async () => {
      const habitId = generateId()
      const now = new Date()
      const today = new Date().toISOString().split('T')[0]!

      await Habit.create({
        _id: habitId,
        userId: mockUserId,
        title: 'Test Habit',
        description: 'Test Description',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      await HabitCompletion.create({
        _id: generateId(),
        habitId,
        userId: mockUserId,
        date: today,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.getById.handler({
        context: authenticatedContext,
        input: { habitId },
      })

      expect(result).toBeDefined()
      expect(result?.title).toBe('Test Habit')
      expect(result?.completedToday).toBe(true)
    })

    it('should return null for non-existent habit', async () => {
      const result = await habitsRouter.getById.handler({
        context: authenticatedContext,
        input: { habitId: generateId() },
      })

      expect(result).toBeNull()
    })

    it('should return null for habit owned by different user', async () => {
      const otherUserId = generateId()
      const habitId = generateId()
      const now = new Date()

      await Habit.create({
        _id: habitId,
        userId: otherUserId,
        title: 'Other Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.getById.handler({
        context: authenticatedContext,
        input: { habitId },
      })

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a daily habit', async () => {
      const result = await habitsRouter.create.handler({
        context: authenticatedContext,
        input: {
          title: 'Exercise',
          description: 'Daily workout',
          frequency: 'daily',
        },
      })

      expect(result).toBeDefined()
      expect(result.title).toBe('Exercise')
      expect(result.description).toBe('Daily workout')
      expect(result.frequency).toBe('daily')

      const habitInDb = await Habit.findOne({ _id: result._id })
      expect(habitInDb).toBeDefined()
      expect(habitInDb?.userId).toBe(mockUserId)
    })

    it('should create a weekly habit with target', async () => {
      const result = await habitsRouter.create.handler({
        context: authenticatedContext,
        input: {
          title: 'Weekly Review',
          frequency: 'weekly',
          weeklyTarget: 3,
        },
      })

      expect(result.frequency).toBe('weekly')
      expect(result.weeklyTarget).toBe(3)
    })

    it('should create a specific_days habit', async () => {
      const result = await habitsRouter.create.handler({
        context: authenticatedContext,
        input: {
          title: 'Weekend Workout',
          frequency: 'specific_days',
          targetDays: [0, 6], // Sunday, Saturday
        },
      })

      expect(result.frequency).toBe('specific_days')
      expect(result.targetDays).toEqual([0, 6])
    })

    it('should reject habit with empty title', async () => {
      await expect(
        habitsRouter.create.handler({
          context: authenticatedContext,
          input: {
            title: '',
            frequency: 'daily',
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('should update habit title', async () => {
      const habitId = generateId()
      const now = new Date()

      await Habit.create({
        _id: habitId,
        userId: mockUserId,
        title: 'Old Title',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.update.handler({
        context: authenticatedContext,
        input: {
          habitId,
          title: 'New Title',
        },
      })

      expect(result?.title).toBe('New Title')

      const habitInDb = await Habit.findOne({ _id: habitId })
      expect(habitInDb?.title).toBe('New Title')
    })

    it('should not update habit owned by different user', async () => {
      const otherUserId = generateId()
      const habitId = generateId()
      const now = new Date()

      await Habit.create({
        _id: habitId,
        userId: otherUserId,
        title: 'Other Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.update.handler({
        context: authenticatedContext,
        input: {
          habitId,
          title: 'Updated Title',
        },
      })

      expect(result).toBeNull()
    })

    it('should update multiple fields at once', async () => {
      const habitId = generateId()
      const now = new Date()

      await Habit.create({
        _id: habitId,
        userId: mockUserId,
        title: 'Old Title',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.update.handler({
        context: authenticatedContext,
        input: {
          habitId,
          title: 'New Title',
          description: 'New Description',
          frequency: 'weekly',
          weeklyTarget: 2,
        },
      })

      expect(result?.title).toBe('New Title')
      expect(result?.description).toBe('New Description')
      expect(result?.frequency).toBe('weekly')
      expect(result?.weeklyTarget).toBe(2)
    })
  })

  describe('archive', () => {
    it('should archive a habit', async () => {
      const habitId = generateId()
      const now = new Date()

      await Habit.create({
        _id: habitId,
        userId: mockUserId,
        title: 'Test Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        archived: false,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.archive.handler({
        context: authenticatedContext,
        input: { habitId },
      })

      expect(result?.archived).toBe(true)

      const habitInDb = await Habit.findOne({ _id: habitId })
      expect(habitInDb?.archived).toBe(true)
    })

    it('should return null for non-existent habit', async () => {
      const result = await habitsRouter.archive.handler({
        context: authenticatedContext,
        input: { habitId: generateId() },
      })

      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete habit and its completions', async () => {
      const habitId = generateId()
      const now = new Date()
      const today = new Date().toISOString().split('T')[0]!

      await Habit.create({
        _id: habitId,
        userId: mockUserId,
        title: 'Test Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      await HabitCompletion.create({
        _id: generateId(),
        habitId,
        userId: mockUserId,
        date: today,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.delete.handler({
        context: authenticatedContext,
        input: { habitId },
      })

      expect(result.success).toBe(true)

      const habitInDb = await Habit.findOne({ _id: habitId })
      expect(habitInDb).toBeNull()

      const completions = await HabitCompletion.find({ habitId })
      expect(completions).toHaveLength(0)
    })
  })

  describe('complete', () => {
    it('should complete a daily habit', async () => {
      const habitId = generateId()
      const now = new Date()

      await Habit.create({
        _id: habitId,
        userId: mockUserId,
        title: 'Exercise',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      // Create user profile for XP tracking
      await UserProfile.create({
        _id: generateId(),
        userId: mockUserId,
        goals: [],
        timezone: 'UTC',
        totalXp: 0,
        level: 1,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.complete.handler({
        context: authenticatedContext,
        input: { habitId },
      })

      expect(result.success).toBe(true)
      expect(result.alreadyCompleted).toBe(false)
      expect(result.streak).toBe(1)
      expect(result.xpAwarded).toBe(XP_REWARDS.HABIT_COMPLETION)

      const completion = await HabitCompletion.findOne({ habitId, userId: mockUserId })
      expect(completion).toBeDefined()

      const habit = await Habit.findOne({ _id: habitId })
      expect(habit?.currentStreak).toBe(1)
      expect(habit?.lastCompletedDate).toBeDefined()

      const xpTransaction = await XpTransaction.findOne({
        userId: mockUserId,
        source: 'habit_completion',
      })
      expect(xpTransaction).toBeDefined()
      expect(xpTransaction?.amount).toBe(XP_REWARDS.HABIT_COMPLETION)
    })

    it('should return alreadyCompleted if already completed today', async () => {
      const habitId = generateId()
      const now = new Date()
      const today = new Date().toISOString().split('T')[0]!

      await Habit.create({
        _id: habitId,
        userId: mockUserId,
        title: 'Exercise',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      await HabitCompletion.create({
        _id: generateId(),
        habitId,
        userId: mockUserId,
        date: today,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.complete.handler({
        context: authenticatedContext,
        input: { habitId },
      })

      expect(result.alreadyCompleted).toBe(true)
    })

    it('should calculate streak correctly for consecutive days', async () => {
      const habitId = generateId()
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]!

      await Habit.create({
        _id: habitId,
        userId: mockUserId,
        title: 'Exercise',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        currentStreak: 1,
        lastCompletedDate: yesterdayStr,
        createdAt: now,
        updatedAt: now,
      })

      await UserProfile.create({
        _id: generateId(),
        userId: mockUserId,
        goals: [],
        timezone: 'UTC',
        totalXp: 0,
        level: 1,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.complete.handler({
        context: authenticatedContext,
        input: { habitId },
      })

      expect(result.streak).toBe(2)
    })

    it('should throw error for non-existent habit', async () => {
      await expect(
        habitsRouter.complete.handler({
          context: authenticatedContext,
          input: { habitId: generateId() },
        })
      ).rejects.toThrow('Habit not found')
    })
  })

  describe('uncomplete', () => {
    it('should remove habit completion', async () => {
      const habitId = generateId()
      const now = new Date()
      const today = new Date().toISOString().split('T')[0]!

      await Habit.create({
        _id: habitId,
        userId: mockUserId,
        title: 'Exercise',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        currentStreak: 5,
        lastCompletedDate: today,
        createdAt: now,
        updatedAt: now,
      })

      await HabitCompletion.create({
        _id: generateId(),
        habitId,
        userId: mockUserId,
        date: today,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.uncomplete.handler({
        context: authenticatedContext,
        input: { habitId },
      })

      expect(result.success).toBe(true)
      expect(result.wasCompleted).toBe(true)

      const completion = await HabitCompletion.findOne({ habitId, userId: mockUserId, date: today })
      expect(completion).toBeNull()

      const habit = await Habit.findOne({ _id: habitId })
      expect(habit?.currentStreak).toBe(0)
      expect(habit?.lastCompletedDate).toBeNull()
    })

    it('should return wasCompleted false if not completed', async () => {
      const habitId = generateId()
      const now = new Date()

      await Habit.create({
        _id: habitId,
        userId: mockUserId,
        title: 'Exercise',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.uncomplete.handler({
        context: authenticatedContext,
        input: { habitId },
      })

      expect(result.wasCompleted).toBe(false)
    })
  })

  describe('getCompletions', () => {
    it('should return completions within date range', async () => {
      const habitId = generateId()
      const now = new Date()
      const startDate = '2024-01-01'
      const endDate = '2024-01-07'

      for (let i = 0; i < 7; i++) {
        const date = new Date('2024-01-01')
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]!

        await HabitCompletion.create({
          _id: generateId(),
          habitId,
          userId: mockUserId,
          date: dateStr,
          createdAt: now,
          updatedAt: now,
        })
      }

      const result = await habitsRouter.getCompletions.handler({
        context: authenticatedContext,
        input: { habitId, startDate, endDate },
      })

      expect(result).toHaveLength(7)
    })

    it('should exclude completions outside date range', async () => {
      const habitId = generateId()
      const now = new Date()

      await HabitCompletion.create({
        _id: generateId(),
        habitId,
        userId: mockUserId,
        date: '2024-01-01',
        createdAt: now,
        updatedAt: now,
      })

      await HabitCompletion.create({
        _id: generateId(),
        habitId,
        userId: mockUserId,
        date: '2024-01-10',
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.getCompletions.handler({
        context: authenticatedContext,
        input: { habitId, startDate: '2024-01-01', endDate: '2024-01-05' },
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.date).toBe('2024-01-01')
    })
  })

  describe('todaySummary', () => {
    it('should return habits with isDue and completedToday status', async () => {
      const now = new Date()
      const today = new Date().toISOString().split('T')[0]!

      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'Daily Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      const weeklyHabitId = generateId()
      await Habit.create({
        _id: weeklyHabitId,
        userId: mockUserId,
        title: 'Weekly Habit',
        description: '',
        frequency: 'weekly',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      const specificDaysHabitId = generateId()
      await Habit.create({
        _id: specificDaysHabitId,
        userId: mockUserId,
        title: 'Weekend Habit',
        description: '',
        frequency: 'specific_days',
        targetDays: [0, 6],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      // Mark daily habit as completed
      await HabitCompletion.create({
        _id: generateId(),
        habitId: generateId(),
        userId: mockUserId,
        date: today,
        createdAt: now,
        updatedAt: now,
      })

      const result = await habitsRouter.todaySummary.handler({
        context: authenticatedContext,
      })

      expect(result).toHaveLength(3)

      const dailyHabit = result.find((h: any) => h.title === 'Daily Habit')
      expect(dailyHabit?.isDue).toBe(true)

      const weeklyHabit = result.find((h: any) => h.title === 'Weekly Habit')
      expect(weeklyHabit?.isDue).toBe(true)

      const weekendHabit = result.find((h: any) => h.title === 'Weekend Habit')
      const todayDow = new Date().getDay()
      const expectedIsDue = todayDow === 0 || todayDow === 6
      expect(weekendHabit?.isDue).toBe(expectedIsDue)
    })
  })
})
