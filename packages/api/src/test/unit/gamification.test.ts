import { describe, it, expect, beforeEach } from 'vitest'
import { UserProfile, XpTransaction, Habit } from '@we-grow/db/models/index'
import { generateId } from '@we-grow/db/utils/id'

import { createTestContext, createMockSession } from '../utils/create-test-context'
import { gamificationRouter } from '../../routers/gamification'
import { xpForLevel, getLevelFromXp } from '../../lib/xp'

describe('Gamification Router', () => {
  const mockUserId = generateId()
  const mockSession = createMockSession({
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
  })
  const authenticatedContext = createTestContext(mockSession.user)

  beforeEach(async () => {
    await UserProfile.deleteMany({})
    await XpTransaction.deleteMany({})
    await Habit.deleteMany({})
  })

  describe('getProfile', () => {
    it('should return default values for user without profile', async () => {
      const result = await gamificationRouter.getProfile.handler({
        context: authenticatedContext,
      })

      expect(result.totalXp).toBe(0)
      expect(result.level).toBe(1)
      expect(result.currentLevel).toBe(1)
      expect(result.currentLevelXp).toBe(0)
      expect(result.nextLevelXp).toBe(100)
      expect(result.progressXp).toBe(0)
    })

    it('should return user profile data', async () => {
      const now = new Date()
      await UserProfile.create({
        _id: generateId(),
        userId: mockUserId,
        goals: [],
        timezone: 'UTC',
        totalXp: 500,
        level: 3,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      const result = await gamificationRouter.getProfile.handler({
        context: authenticatedContext,
      })

      expect(result.totalXp).toBe(500)
      expect(result.level).toBe(3)
      expect(result.currentLevel).toBe(3)
      expect(result.currentLevelXp).toBe(xpForLevel(3))
      expect(result.nextLevelXp).toBe(xpForLevel(4))
    })

    it('should calculate progress correctly', async () => {
      const now = new Date()
      await UserProfile.create({
        _id: generateId(),
        userId: mockUserId,
        goals: [],
        timezone: 'UTC',
        totalXp: 250, // Level 3 starts at 300, level 2 at 100
        level: 2,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      const result = await gamificationRouter.getProfile.handler({
        context: authenticatedContext,
      })

      expect(result.currentLevel).toBe(2)
      expect(result.currentLevelXp).toBe(100)
      expect(result.nextLevelXp).toBe(300)
      expect(result.progressXp).toBe(150)
    })
  })

  describe('getXpHistory', () => {
    it('should return empty array for user with no transactions', async () => {
      const result = await gamificationRouter.getXpHistory.handler({
        context: authenticatedContext,
      })

      expect(result.transactions).toEqual([])
      expect(result.total).toBe(0)
      expect(result.limit).toBe(20)
      expect(result.offset).toBe(0)
    })

    it('should return paginated XP transactions', async () => {
      const now = new Date()
      for (let i = 0; i < 25; i++) {
        await XpTransaction.create({
          _id: generateId(),
          userId: mockUserId,
          amount: 10,
          source: 'habit_completion',
          sourceId: `habit-${i}`,
          description: `Completion ${i}`,
          createdAt: now,
          updatedAt: now,
        })
      }

      const result = await gamificationRouter.getXpHistory.handler({
        context: authenticatedContext,
        input: { limit: 10, offset: 0 },
      })

      expect(result.transactions).toHaveLength(10)
      expect(result.total).toBe(25)
      expect(result.limit).toBe(10)
      expect(result.offset).toBe(0)
    })

    it('should use default pagination values', async () => {
      const now = new Date()
      for (let i = 0; i < 30; i++) {
        await XpTransaction.create({
          _id: generateId(),
          userId: mockUserId,
          amount: 10,
          source: 'habit_completion',
          sourceId: `habit-${i}`,
          description: `Completion ${i}`,
          createdAt: now,
          updatedAt: now,
        })
      }

      const result = await gamificationRouter.getXpHistory.handler({
        context: authenticatedContext,
      })

      expect(result.transactions).toHaveLength(20)
      expect(result.limit).toBe(20)
      expect(result.offset).toBe(0)
    })

    it('should return transactions sorted by createdAt descending', async () => {
      const now = new Date()
      const transactionIds: string[] = []

      for (let i = 0; i < 5; i++) {
        const id = generateId()
        transactionIds.push(id)
        const date = new Date(now.getTime() + i * 1000)
        await XpTransaction.create({
          _id: id,
          userId: mockUserId,
          amount: 10,
          source: 'habit_completion',
          sourceId: `habit-${i}`,
          description: `Completion ${i}`,
          createdAt: date,
          updatedAt: date,
        })
      }

      const result = await gamificationRouter.getXpHistory.handler({
        context: authenticatedContext,
      })

      expect(result.transactions[0]?._id).toBe(transactionIds[4])
      expect(result.transactions[4]?._id).toBe(transactionIds[0])
    })

    it('should only return transactions for current user', async () => {
      const otherUserId = generateId()
      const now = new Date()

      await XpTransaction.create({
        _id: generateId(),
        userId: mockUserId,
        amount: 10,
        source: 'habit_completion',
        sourceId: 'habit-1',
        description: 'My completion',
        createdAt: now,
        updatedAt: now,
      })

      await XpTransaction.create({
        _id: generateId(),
        userId: otherUserId,
        amount: 10,
        source: 'habit_completion',
        sourceId: 'habit-2',
        description: 'Other completion',
        createdAt: now,
        updatedAt: now,
      })

      const result = await gamificationRouter.getXpHistory.handler({
        context: authenticatedContext,
      })

      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0]?.description).toBe('My completion')
    })
  })

  describe('getGlobalLeaderboard', () => {
    it('should return empty array when no profiles exist', async () => {
      const result = await gamificationRouter.getGlobalLeaderboard.handler({
        context: authenticatedContext,
      })

      expect(result).toEqual([])
    })

    it('should return users sorted by total XP', async () => {
      const now = new Date()
      const userIds = [generateId(), generateId(), generateId()]

      await UserProfile.create({
        _id: generateId(),
        userId: userIds[0],
        goals: [],
        timezone: 'UTC',
        totalXp: 500,
        level: 3,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      await UserProfile.create({
        _id: generateId(),
        userId: userIds[1],
        goals: [],
        timezone: 'UTC',
        totalXp: 1000,
        level: 5,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      await UserProfile.create({
        _id: generateId(),
        userId: userIds[2],
        goals: [],
        timezone: 'UTC',
        totalXp: 250,
        level: 2,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      const result = await gamificationRouter.getGlobalLeaderboard.handler({
        context: authenticatedContext,
      })

      expect(result[0]?.userId).toBe(userIds[1])
      expect(result[0]?.totalXp).toBe(1000)
      expect(result[1]?.userId).toBe(userIds[0])
      expect(result[1]?.totalXp).toBe(500)
      expect(result[2]?.userId).toBe(userIds[2])
      expect(result[2]?.totalXp).toBe(250)
    })

    it('should limit results', async () => {
      const now = new Date()

      for (let i = 0; i < 30; i++) {
        await UserProfile.create({
          _id: generateId(),
          userId: generateId(),
          goals: [],
          timezone: 'UTC',
          totalXp: i * 10,
          level: 1,
          onboardingCompleted: false,
          createdAt: now,
          updatedAt: now,
        })
      }

      const result = await gamificationRouter.getGlobalLeaderboard.handler({
        context: authenticatedContext,
        input: { limit: 10 },
      })

      expect(result).toHaveLength(10)
    })

    it('should use default limit of 20', async () => {
      const now = new Date()

      for (let i = 0; i < 30; i++) {
        await UserProfile.create({
          _id: generateId(),
          userId: generateId(),
          goals: [],
          timezone: 'UTC',
          totalXp: i * 10,
          level: 1,
          onboardingCompleted: false,
          createdAt: now,
          updatedAt: now,
        })
      }

      const result = await gamificationRouter.getGlobalLeaderboard.handler({
        context: authenticatedContext,
      })

      expect(result).toHaveLength(20)
    })

    it('should only return userId, totalXp, and level fields', async () => {
      const now = new Date()
      const userId = generateId()

      await UserProfile.create({
        _id: generateId(),
        userId,
        goals: ['fitness', 'health'],
        timezone: 'UTC',
        totalXp: 500,
        level: 3,
        onboardingCompleted: true,
        createdAt: now,
        updatedAt: now,
      })

      const result = await gamificationRouter.getGlobalLeaderboard.handler({
        context: authenticatedContext,
      })

      expect(result[0]?.userId).toBe(userId)
      expect(result[0]?.totalXp).toBe(500)
      expect(result[0]?.level).toBe(3)
      expect(result[0]?.goals).toBeUndefined()
      expect(result[0]?.timezone).toBeUndefined()
      expect(result[0]?.onboardingCompleted).toBeUndefined()
    })
  })

  describe('getGroupLeaderboard', () => {
    it('should return empty array for group with no members', async () => {
      const groupId = generateId()

      const result = await gamificationRouter.getGroupLeaderboard.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result).toEqual([])
    })

    it('should return members sorted by total XP', async () => {
      const groupId = generateId()
      const now = new Date()
      const userIds = [generateId(), generateId(), generateId()]

      // Create group members
      const { GroupMember } = await import('@we-grow/db/models/index')
      for (const userId of userIds) {
        await GroupMember.create({
          _id: generateId(),
          groupId,
          userId,
          role: 'member',
          status: 'active',
          joinedAt: now,
          createdAt: now,
          updatedAt: now,
        })
      }

      // Create user profiles
      await UserProfile.create({
        _id: generateId(),
        userId: userIds[0],
        goals: [],
        timezone: 'UTC',
        totalXp: 500,
        level: 3,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      await UserProfile.create({
        _id: generateId(),
        userId: userIds[1],
        goals: [],
        timezone: 'UTC',
        totalXp: 1000,
        level: 5,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      await UserProfile.create({
        _id: generateId(),
        userId: userIds[2],
        goals: [],
        timezone: 'UTC',
        totalXp: 250,
        level: 2,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      // Create habits for best streak calculation
      for (const userId of userIds) {
        await Habit.create({
          _id: generateId(),
          userId,
          title: 'Test Habit',
          description: '',
          frequency: 'daily',
          targetDays: [],
          weeklyTarget: 1,
          currentStreak: userId === userIds[1] ? 10 : 5,
          createdAt: now,
          updatedAt: now,
        })
      }

      const result = await gamificationRouter.getGroupLeaderboard.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result[0]?.userId).toBe(userIds[1])
      expect(result[0]?.totalXp).toBe(1000)
      expect(result[0]?.bestStreak).toBe(10)
    })

    it('should include users without profiles with default values', async () => {
      const groupId = generateId()
      const now = new Date()
      const userId = generateId()

      const { GroupMember } = await import('@we-grow/db/models/index')
      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId,
        role: 'member',
        status: 'active',
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      })

      const result = await gamificationRouter.getGroupLeaderboard.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.userId).toBe(userId)
      expect(result[0]?.totalXp).toBe(0)
      expect(result[0]?.level).toBe(1)
      expect(result[0]?.bestStreak).toBe(0)
    })

    it('should only include active members', async () => {
      const groupId = generateId()
      const now = new Date()
      const activeUserId = generateId()
      const inactiveUserId = generateId()

      const { GroupMember } = await import('@we-grow/db/models/index')
      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId: activeUserId,
        role: 'member',
        status: 'active',
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      })

      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId: inactiveUserId,
        role: 'member',
        status: 'inactive',
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      })

      await UserProfile.create({
        _id: generateId(),
        userId: activeUserId,
        goals: [],
        timezone: 'UTC',
        totalXp: 100,
        level: 1,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      await UserProfile.create({
        _id: generateId(),
        userId: inactiveUserId,
        goals: [],
        timezone: 'UTC',
        totalXp: 200,
        level: 2,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      const result = await gamificationRouter.getGroupLeaderboard.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.userId).toBe(activeUserId)
    })
  })
})

describe('XP Utility Functions', () => {
  describe('xpForLevel', () => {
    it('should return correct XP for level 1', () => {
      expect(xpForLevel(1)).toBe(100)
    })

    it('should return correct XP for level 2', () => {
      expect(xpForLevel(2)).toBe(300)
    })

    it('should return correct XP for level 3', () => {
      expect(xpForLevel(3)).toBe(600)
    })

    it('should return correct XP for level 5', () => {
      expect(xpForLevel(5)).toBe(1500)
    })
  })

  describe('getLevelFromXp', () => {
    it('should return level 1 for 0 XP', () => {
      expect(getLevelFromXp(0)).toBe(1)
    })

    it('should return level 1 for 50 XP', () => {
      expect(getLevelFromXp(50)).toBe(1)
    })

    it('should return level 2 for 100 XP', () => {
      expect(getLevelFromXp(100)).toBe(2)
    })

    it('should return level 3 for 300 XP', () => {
      expect(getLevelFromXp(300)).toBe(3)
    })

    it('should return level 5 for 1500 XP', () => {
      expect(getLevelFromXp(1500)).toBe(5)
    })
  })
})
