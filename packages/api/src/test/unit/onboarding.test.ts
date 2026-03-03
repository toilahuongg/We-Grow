import { describe, it, expect, beforeEach } from 'vitest'
import { UserProfile, XpTransaction } from '@we-grow/db/models/index'
import { generateId } from '@we-grow/db/utils/id'

import { createTestContext, createMockSession } from '../utils/create-test-context'
import { onboardingRouter } from '../../routers/onboarding'
import { XP_REWARDS } from '../../lib/xp'

describe('Onboarding Router', () => {
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
  })

  describe('getStatus', () => {
    it('should return false for user without profile', async () => {
      const result = await onboardingRouter.getStatus.handler({
        context: authenticatedContext,
      })

      expect(result.completed).toBe(false)
      expect(result.goals).toEqual([])
      expect(result.timezone).toBe('UTC')
    })

    it('should return profile status for user with incomplete onboarding', async () => {
      const now = new Date()
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

      const result = await onboardingRouter.getStatus.handler({
        context: authenticatedContext,
      })

      expect(result.completed).toBe(false)
      expect(result.goals).toEqual([])
      expect(result.timezone).toBe('UTC')
    })

    it('should return completed status for user who completed onboarding', async () => {
      const now = new Date()
      await UserProfile.create({
        _id: generateId(),
        userId: mockUserId,
        goals: ['fitness', 'health'],
        timezone: 'America/New_York',
        totalXp: 100,
        level: 2,
        onboardingCompleted: true,
        createdAt: now,
        updatedAt: now,
      })

      const result = await onboardingRouter.getStatus.handler({
        context: authenticatedContext,
      })

      expect(result.completed).toBe(true)
      expect(result.goals).toEqual(['fitness', 'health'])
      expect(result.timezone).toBe('America/New_York')
    })
  })

  describe('complete', () => {
    it('should create profile and award XP on first completion', async () => {
      const result = await onboardingRouter.complete.handler({
        context: authenticatedContext,
        input: {
          goals: ['fitness', 'health'],
          timezone: 'America/New_York',
        },
      })

      expect(result.success).toBe(true)
      expect(result.alreadyCompleted).toBe(false)

      const profile = await UserProfile.findOne({ userId: mockUserId })
      expect(profile).toBeDefined()
      expect(profile?.goals).toEqual(['fitness', 'health'])
      expect(profile?.timezone).toBe('America/New_York')
      expect(profile?.onboardingCompleted).toBe(true)
      expect(profile?.totalXp).toBe(XP_REWARDS.ONBOARDING)
      expect(profile?.level).toBe(1)

      const xpTransaction = await XpTransaction.findOne({
        userId: mockUserId,
        source: 'onboarding',
      })
      expect(xpTransaction).toBeDefined()
      expect(xpTransaction?.amount).toBe(XP_REWARDS.ONBOARDING)
      expect(xpTransaction?.description).toBe('Completed onboarding')
    })

    it('should update existing profile and award XP', async () => {
      const now = new Date()
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

      const result = await onboardingRouter.complete.handler({
        context: authenticatedContext,
        input: {
          goals: ['fitness', 'health'],
          timezone: 'America/New_York',
        },
      })

      expect(result.success).toBe(true)
      expect(result.alreadyCompleted).toBe(false)

      const profile = await UserProfile.findOne({ userId: mockUserId })
      expect(profile?.goals).toEqual(['fitness', 'health'])
      expect(profile?.timezone).toBe('America/New_York')
      expect(profile?.onboardingCompleted).toBe(true)
      expect(profile?.totalXp).toBe(XP_REWARDS.ONBOARDING)
    })

    it('should return alreadyCompleted for user who already completed onboarding', async () => {
      const now = new Date()
      await UserProfile.create({
        _id: generateId(),
        userId: mockUserId,
        goals: ['fitness'],
        timezone: 'UTC',
        totalXp: XP_REWARDS.ONBOARDING,
        level: 1,
        onboardingCompleted: true,
        createdAt: now,
        updatedAt: now,
      })

      const result = await onboardingRouter.complete.handler({
        context: authenticatedContext,
        input: {
          goals: ['fitness', 'health'],
          timezone: 'America/New_York',
        },
      })

      expect(result.success).toBe(true)
      expect(result.alreadyCompleted).toBe(true)

      // Profile should not be updated
      const profile = await UserProfile.findOne({ userId: mockUserId })
      expect(profile?.goals).toEqual(['fitness'])
      expect(profile?.timezone).toBe('UTC')

      // No additional XP transaction should be created
      const transactions = await XpTransaction.find({
        userId: mockUserId,
        source: 'onboarding',
      })
      expect(transactions).toHaveLength(0)
    })

    it('should require at least one goal', async () => {
      await expect(
        onboardingRouter.complete.handler({
          context: authenticatedContext,
          input: {
            goals: [],
            timezone: 'UTC',
          },
        })
      ).rejects.toThrow()
    })

    it('should require timezone', async () => {
      await expect(
        onboardingRouter.complete.handler({
          context: authenticatedContext,
          input: {
            goals: ['fitness'],
            timezone: '',
          },
        })
      ).rejects.toThrow()
    })

    it('should add onboarding XP to existing XP', async () => {
      const now = new Date()
      await UserProfile.create({
        _id: generateId(),
        userId: mockUserId,
        goals: [],
        timezone: 'UTC',
        totalXp: 50,
        level: 1,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      await onboardingRouter.complete.handler({
        context: authenticatedContext,
        input: {
          goals: ['fitness'],
          timezone: 'UTC',
        },
      })

      const profile = await UserProfile.findOne({ userId: mockUserId })
      expect(profile?.totalXp).toBe(50 + XP_REWARDS.ONBOARDING)
    })

    it('should update level based on total XP', async () => {
      const now = new Date()
      await UserProfile.create({
        _id: generateId(),
        userId: mockUserId,
        goals: [],
        timezone: 'UTC',
        totalXp: 250,
        level: 2,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      await onboardingRouter.complete.handler({
        context: authenticatedContext,
        input: {
          goals: ['fitness'],
          timezone: 'UTC',
        },
      })

      const profile = await UserProfile.findOne({ userId: mockUserId })
      expect(profile?.totalXp).toBe(250 + XP_REWARDS.ONBOARDING)
      // Level should be recalculated based on new total
      expect(profile?.level).toBeGreaterThanOrEqual(2)
    })
  })
})
