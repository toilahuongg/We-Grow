import { describe, it, expect, beforeEach } from 'vitest'
import { Habit, HabitCompletion, UserProfile, XpTransaction, Group, GroupMember } from '@we-grow/db/models/index'
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
    await Group.deleteMany({})
    await GroupMember.deleteMany({})
  })

  // Helper to create a group with the user as a member
  async function createGroupWithMembership(userId: string, role = 'member') {
    const ownerId = role === 'owner' ? userId : generateId()
    const groupId = generateId()
    const now = new Date()

    await Group.create({
      _id: groupId,
      name: 'Test Group',
      description: '',
      mode: 'together',
      inviteCode: generateId().slice(0, 8),
      ownerId,
      createdAt: now,
      updatedAt: now,
    })

    await GroupMember.create({
      _id: generateId(),
      groupId,
      userId: ownerId,
      role: 'owner',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })

    if (role !== 'owner') {
      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId,
        role,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
    }

    return groupId
  }

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

    it('should auto-create UserProfile when awarding XP if missing', async () => {
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

      // No UserProfile created - should be auto-created
      const result = await habitsRouter.complete.handler({
        context: authenticatedContext,
        input: { habitId },
      })

      expect(result.success).toBe(true)

      const profile = await UserProfile.findOne({ userId: mockUserId })
      expect(profile).toBeDefined()
      expect(profile?.totalXp).toBe(XP_REWARDS.HABIT_COMPLETION)
    })

    it('should not award all-habits bonus twice on same day', async () => {
      const habitId1 = generateId()
      const habitId2 = generateId()
      const now = new Date()

      await Habit.create({
        _id: habitId1,
        userId: mockUserId,
        title: 'Habit 1',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      await Habit.create({
        _id: habitId2,
        userId: mockUserId,
        title: 'Habit 2',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
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

      // Complete both habits
      await habitsRouter.complete.handler({
        context: authenticatedContext,
        input: { habitId: habitId1 },
      })
      await habitsRouter.complete.handler({
        context: authenticatedContext,
        input: { habitId: habitId2 },
      })

      // Uncomplete and re-complete habit 2
      await habitsRouter.uncomplete.handler({
        context: authenticatedContext,
        input: { habitId: habitId2 },
      })
      await habitsRouter.complete.handler({
        context: authenticatedContext,
        input: { habitId: habitId2 },
      })

      // Should only have one all_habits_bonus
      const bonusTransactions = await XpTransaction.find({
        userId: mockUserId,
        source: 'all_habits_bonus',
      })
      expect(bonusTransactions).toHaveLength(1)
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

    it('should reverse XP when uncompleting a habit', async () => {
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

      // Complete the habit
      await habitsRouter.complete.handler({
        context: authenticatedContext,
        input: { habitId },
      })

      // Verify XP was awarded
      let profile = await UserProfile.findOne({ userId: mockUserId })
      expect(profile?.totalXp).toBe(XP_REWARDS.HABIT_COMPLETION)

      // Uncomplete the habit
      await habitsRouter.uncomplete.handler({
        context: authenticatedContext,
        input: { habitId },
      })

      // Verify XP was reversed
      profile = await UserProfile.findOne({ userId: mockUserId })
      expect(profile?.totalXp).toBe(0)

      // Verify XP transaction was deleted
      const xpTransactions = await XpTransaction.find({ userId: mockUserId })
      expect(xpTransactions).toHaveLength(0)
    })

    it('should correctly reduce streak when uncompleting latest day', async () => {
      const habitId = generateId()
      const now = new Date()
      const today = new Date().toISOString().split('T')[0]!
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]!
      const twoDaysAgo = new Date(now)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0]!

      await Habit.create({
        _id: habitId,
        userId: mockUserId,
        title: 'Exercise',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        currentStreak: 3,
        lastCompletedDate: today,
        createdAt: now,
        updatedAt: now,
      })

      // Create completions for 3 consecutive days
      for (const date of [twoDaysAgoStr, yesterdayStr, today]) {
        await HabitCompletion.create({
          _id: generateId(),
          habitId,
          userId: mockUserId,
          date,
          createdAt: now,
          updatedAt: now,
        })
      }

      // Uncomplete today
      await habitsRouter.uncomplete.handler({
        context: authenticatedContext,
        input: { habitId },
      })

      const habit = await Habit.findOne({ _id: habitId })
      expect(habit?.currentStreak).toBe(2)
      expect(habit?.lastCompletedDate).toBe(yesterdayStr)
    })

    it('should not allow XP farming via complete/uncomplete cycle', async () => {
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

      // Complete → uncomplete → complete cycle
      await habitsRouter.complete.handler({
        context: authenticatedContext,
        input: { habitId },
      })
      await habitsRouter.uncomplete.handler({
        context: authenticatedContext,
        input: { habitId },
      })
      await habitsRouter.complete.handler({
        context: authenticatedContext,
        input: { habitId },
      })

      // Should only have XP for one completion, not two
      const profile = await UserProfile.findOne({ userId: mockUserId })
      expect(profile?.totalXp).toBe(XP_REWARDS.HABIT_COMPLETION)

      const xpTransactions = await XpTransaction.find({ userId: mockUserId })
      expect(xpTransactions).toHaveLength(1)
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

      const dailyHabitId = generateId()
      await Habit.create({
        _id: dailyHabitId,
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
        habitId: dailyHabitId,
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
      expect(dailyHabit?.completedToday).toBe(true)

      const weeklyHabit = result.find((h: any) => h.title === 'Weekly Habit')
      expect(weeklyHabit?.isDue).toBe(true)
      expect(weeklyHabit?.completedToday).toBe(false)

      const weekendHabit = result.find((h: any) => h.title === 'Weekend Habit')
      const todayDow = new Date().getDay()
      const expectedIsDue = todayDow === 0 || todayDow === 6
      expect(weekendHabit?.isDue).toBe(expectedIsDue)
    })

    it('should filter by groupId when provided', async () => {
      const now = new Date()
      const groupId = await createGroupWithMembership(mockUserId, 'owner')

      // Personal habit (no group)
      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'Personal Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      // Group habit
      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        groupId,
        title: 'Group Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      // Without groupId filter — should return all
      const allResult = await habitsRouter.todaySummary.handler({
        context: authenticatedContext,
      })
      expect(allResult).toHaveLength(2)

      // With groupId filter — should return only group habits
      const groupResult = await habitsRouter.todaySummary.handler({
        context: authenticatedContext,
        input: { groupId },
      })
      expect(groupResult).toHaveLength(1)
      expect(groupResult[0]?.title).toBe('Group Habit')
    })

    it('should not include archived habits', async () => {
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

      const result = await habitsRouter.todaySummary.handler({
        context: authenticatedContext,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.title).toBe('Active Habit')
    })
  })

  describe('create with groupId', () => {
    it('should create personal habit in group context', async () => {
      const groupId = await createGroupWithMembership(mockUserId, 'member')

      const result = await habitsRouter.create.handler({
        context: authenticatedContext,
        input: {
          title: 'My Personal Group Habit',
          description: 'Personal in group',
          frequency: 'daily',
          groupId,
        },
      })

      expect(result).toBeDefined()
      expect(result.title).toBe('My Personal Group Habit')
      expect(result.groupId).toBe(groupId)
      expect(result.userId).toBe(mockUserId)
      // Should not have groupHabitId since it's personal
      expect(result.groupHabitId).toBeUndefined()
    })

    it('should allow any group member to create personal habit', async () => {
      const groupId = await createGroupWithMembership(mockUserId, 'member')

      const result = await habitsRouter.create.handler({
        context: authenticatedContext,
        input: {
          title: 'Member Habit',
          frequency: 'weekly',
          weeklyTarget: 2,
          groupId,
        },
      })

      expect(result.groupId).toBe(groupId)
      expect(result.frequency).toBe('weekly')
      expect(result.weeklyTarget).toBe(2)
    })

    it('should throw FORBIDDEN for non-member creating group habit', async () => {
      const nonMemberGroupId = generateId()
      const now = new Date()

      await Group.create({
        _id: nonMemberGroupId,
        name: 'Other Group',
        description: '',
        mode: 'together',
        inviteCode: 'NOACCESS',
        ownerId: generateId(),
        createdAt: now,
        updatedAt: now,
      })

      await expect(
        habitsRouter.create.handler({
          context: authenticatedContext,
          input: {
            title: 'Forbidden Habit',
            frequency: 'daily',
            groupId: nonMemberGroupId,
          },
        })
      ).rejects.toThrow()
    })

    it('should create habit without groupId as personal habit', async () => {
      const result = await habitsRouter.create.handler({
        context: authenticatedContext,
        input: {
          title: 'Pure Personal',
          frequency: 'daily',
        },
      })

      expect(result.groupId).toBeNull()
    })
  })

  describe('list with groupId filter', () => {
    it('should filter habits by groupId', async () => {
      const groupId = await createGroupWithMembership(mockUserId, 'owner')
      const now = new Date()

      // Personal habit
      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'Personal Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      // Group habit
      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        groupId,
        title: 'Group Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      // Without filter — should return all
      const allHabits = await habitsRouter.list.handler({
        context: authenticatedContext,
        input: undefined,
      })
      expect(allHabits).toHaveLength(2)

      // With groupId — should return only group habits
      const groupHabits = await habitsRouter.list.handler({
        context: authenticatedContext,
        input: { groupId },
      })
      expect(groupHabits).toHaveLength(1)
      expect(groupHabits[0]?.title).toBe('Group Habit')
    })

    it('should combine groupId and includeArchived filters', async () => {
      const groupId = await createGroupWithMembership(mockUserId, 'owner')
      const now = new Date()

      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        groupId,
        title: 'Active Group Habit',
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
        groupId,
        title: 'Archived Group Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        archived: true,
        createdAt: now,
        updatedAt: now,
      })

      // Group filter without archived — only active
      const activeOnly = await habitsRouter.list.handler({
        context: authenticatedContext,
        input: { groupId },
      })
      expect(activeOnly).toHaveLength(1)
      expect(activeOnly[0]?.title).toBe('Active Group Habit')

      // Group filter with archived — both
      const withArchived = await habitsRouter.list.handler({
        context: authenticatedContext,
        input: { groupId, includeArchived: true },
      })
      expect(withArchived).toHaveLength(2)
    })
  })
})
