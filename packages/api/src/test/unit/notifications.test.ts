import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PushSubscription, Reminder } from '@we-grow/db/models/index'
import { generateId } from '@we-grow/db/utils/id'

import { createTestContext, createMockSession } from '../utils/create-test-context'
import { notificationsRouter } from '../../routers/notifications'

// Mock the env module
vi.mock('@we-grow/env/server', () => ({
  env: {
    VAPID_PUBLIC_KEY: 'test-vapid-public-key',
  },
}))

describe('Notifications Router', () => {
  const mockUserId = generateId()
  const mockSession = createMockSession({
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
  })
  const authenticatedContext = createTestContext(mockSession.user)

  beforeEach(async () => {
    await PushSubscription.deleteMany({})
    await Reminder.deleteMany({})
  })

  describe('subscribe', () => {
    it('should create new push subscription', async () => {
      const input = {
        endpoint: 'https://example.com/push/endpoint',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key',
        },
      }

      const result = await notificationsRouter.subscribe.handler({
        context: authenticatedContext,
        input,
      })

      expect(result.success).toBe(true)

      const subscription = await PushSubscription.findOne({ userId: mockUserId })
      expect(subscription).toBeDefined()
      expect(subscription?.endpoint).toBe(input.endpoint)
      expect(subscription?.keys).toEqual(input.keys)
    })

    it('should update existing subscription with same endpoint', async () => {
      const now = new Date()
      const endpoint = 'https://example.com/push/endpoint'

      await PushSubscription.create({
        _id: generateId(),
        userId: 'other-user-id',
        endpoint,
        keys: { p256dh: 'old-key', auth: 'old-auth' },
        createdAt: now,
        updatedAt: now,
      })

      const input = {
        endpoint,
        keys: {
          p256dh: 'new-p256dh-key',
          auth: 'new-auth-key',
        },
      }

      const result = await notificationsRouter.subscribe.handler({
        context: authenticatedContext,
        input,
      })

      expect(result.success).toBe(true)

      const subscription = await PushSubscription.findOne({ endpoint })
      expect(subscription?.userId).toBe(mockUserId)
      expect(subscription?.keys.p256dh).toBe('new-p256dh-key')

      // Should still have only one subscription
      const count = await PushSubscription.countDocuments({ endpoint })
      expect(count).toBe(1)
    })

    it('should reject invalid endpoint URL', async () => {
      await expect(
        notificationsRouter.subscribe.handler({
          context: authenticatedContext,
          input: {
            endpoint: 'not-a-valid-url',
            keys: {
              p256dh: 'test-key',
              auth: 'test-auth',
            },
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('unsubscribe', () => {
    it('should remove push subscription', async () => {
      const now = new Date()
      const endpoint = 'https://example.com/push/endpoint'

      await PushSubscription.create({
        _id: generateId(),
        userId: mockUserId,
        endpoint,
        keys: { p256dh: 'test-key', auth: 'test-auth' },
        createdAt: now,
        updatedAt: now,
      })

      const result = await notificationsRouter.unsubscribe.handler({
        context: authenticatedContext,
        input: { endpoint },
      })

      expect(result.success).toBe(true)

      const subscription = await PushSubscription.findOne({
        endpoint,
        userId: mockUserId,
      })
      expect(subscription).toBeNull()
    })

    it('should only remove subscription for current user', async () => {
      const otherUserId = generateId()
      const endpoint = 'https://example.com/push/endpoint'
      const now = new Date()

      await PushSubscription.create({
        _id: generateId(),
        userId: otherUserId,
        endpoint,
        keys: { p256dh: 'test-key', auth: 'test-auth' },
        createdAt: now,
        updatedAt: now,
      })

      await notificationsRouter.unsubscribe.handler({
        context: authenticatedContext,
        input: { endpoint },
      })

      // Other user's subscription should still exist
      const subscription = await PushSubscription.findOne({ endpoint })
      expect(subscription).toBeDefined()
      expect(subscription?.userId).toBe(otherUserId)
    })

    it('should return success even if subscription does not exist', async () => {
      const result = await notificationsRouter.unsubscribe.handler({
        context: authenticatedContext,
        input: { endpoint: 'https://example.com/nonexistent' },
      })

      expect(result.success).toBe(true)
    })
  })

  describe('getVapidPublicKey', () => {
    it('should return VAPID public key', async () => {
      const result = await notificationsRouter.getVapidPublicKey.handler({
        context: authenticatedContext,
      })

      expect(result.vapidPublicKey).toBe('test-vapid-public-key')
    })
  })

  describe('listReminders', () => {
    it('should return empty array when user has no reminders', async () => {
      const result = await notificationsRouter.listReminders.handler({
        context: authenticatedContext,
      })

      expect(result).toEqual([])
    })

    it('should return user reminders sorted by time', async () => {
      const now = new Date()
      const time1 = '08:00'
      const time2 = '12:00'
      const time3 = '18:00'

      await Reminder.create({
        _id: generateId(),
        userId: mockUserId,
        habitId: 'habit-1',
        todoId: null,
        time: time2,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

      await Reminder.create({
        _id: generateId(),
        userId: mockUserId,
        habitId: 'habit-2',
        todoId: null,
        time: time1,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

      await Reminder.create({
        _id: generateId(),
        userId: mockUserId,
        habitId: 'habit-3',
        todoId: null,
        time: time3,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

      const result = await notificationsRouter.listReminders.handler({
        context: authenticatedContext,
      })

      expect(result).toHaveLength(3)
      expect(result[0]?.time).toBe(time1)
      expect(result[1]?.time).toBe(time2)
      expect(result[2]?.time).toBe(time3)
    })

    it('should only return reminders for current user', async () => {
      const otherUserId = generateId()
      const now = new Date()

      await Reminder.create({
        _id: generateId(),
        userId: mockUserId,
        habitId: 'habit-1',
        todoId: null,
        time: '08:00',
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

      await Reminder.create({
        _id: generateId(),
        userId: otherUserId,
        habitId: 'habit-2',
        todoId: null,
        time: '09:00',
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

      const result = await notificationsRouter.listReminders.handler({
        context: authenticatedContext,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.habitId).toBe('habit-1')
    })
  })

  describe('createReminder', () => {
    it('should create reminder for habit', async () => {
      const result = await notificationsRouter.createReminder.handler({
        context: authenticatedContext,
        input: {
          habitId: 'habit-123',
          time: '08:00',
        },
      })

      expect(result).toBeDefined()
      expect(result.habitId).toBe('habit-123')
      expect(result.todoId).toBeNull()
      expect(result.time).toBe('08:00')
      expect(result.enabled).toBe(true)

      const reminder = await Reminder.findOne({ _id: result._id })
      expect(reminder?.userId).toBe(mockUserId)
    })

    it('should create reminder for todo', async () => {
      const result = await notificationsRouter.createReminder.handler({
        context: authenticatedContext,
        input: {
          todoId: 'todo-123',
          time: '14:30',
        },
      })

      expect(result.todoId).toBe('todo-123')
      expect(result.habitId).toBeNull()
    })

    it('should create disabled reminder when enabled is false', async () => {
      const result = await notificationsRouter.createReminder.handler({
        context: authenticatedContext,
        input: {
          habitId: 'habit-123',
          time: '08:00',
          enabled: false,
        },
      })

      expect(result.enabled).toBe(false)
    })

    it('should reject invalid time format', async () => {
      await expect(
        notificationsRouter.createReminder.handler({
          context: authenticatedContext,
          input: {
            habitId: 'habit-123',
            time: 'invalid',
          },
        })
      ).rejects.toThrow()
    })

    it('should reject time with invalid format', async () => {
      await expect(
        notificationsRouter.createReminder.handler({
          context: authenticatedContext,
          input: {
            habitId: 'habit-123',
            time: '8:00',
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('updateReminder', () => {
    it('should update reminder time', async () => {
      const reminderId = generateId()
      const now = new Date()

      await Reminder.create({
        _id: reminderId,
        userId: mockUserId,
        habitId: 'habit-1',
        todoId: null,
        time: '08:00',
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

      const result = await notificationsRouter.updateReminder.handler({
        context: authenticatedContext,
        input: {
          reminderId,
          time: '09:30',
        },
      })

      expect(result?.time).toBe('09:30')

      const reminder = await Reminder.findOne({ _id: reminderId })
      expect(reminder?.time).toBe('09:30')
    })

    it('should update reminder enabled status', async () => {
      const reminderId = generateId()
      const now = new Date()

      await Reminder.create({
        _id: reminderId,
        userId: mockUserId,
        habitId: 'habit-1',
        todoId: null,
        time: '08:00',
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

      const result = await notificationsRouter.updateReminder.handler({
        context: authenticatedContext,
        input: {
          reminderId,
          enabled: false,
        },
      })

      expect(result?.enabled).toBe(false)
    })

    it('should update multiple fields', async () => {
      const reminderId = generateId()
      const now = new Date()

      await Reminder.create({
        _id: reminderId,
        userId: mockUserId,
        habitId: 'habit-1',
        todoId: null,
        time: '08:00',
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

      const result = await notificationsRouter.updateReminder.handler({
        context: authenticatedContext,
        input: {
          reminderId,
          time: '10:00',
          enabled: false,
        },
      })

      expect(result?.time).toBe('10:00')
      expect(result?.enabled).toBe(false)
    })

    it('should not update reminder owned by different user', async () => {
      const otherUserId = generateId()
      const reminderId = generateId()
      const now = new Date()

      await Reminder.create({
        _id: reminderId,
        userId: otherUserId,
        habitId: 'habit-1',
        todoId: null,
        time: '08:00',
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

      const result = await notificationsRouter.updateReminder.handler({
        context: authenticatedContext,
        input: {
          reminderId,
          time: '09:00',
        },
      })

      expect(result).toBeNull()

      const reminder = await Reminder.findOne({ _id: reminderId })
      expect(reminder?.time).toBe('08:00')
    })
  })

  describe('deleteReminder', () => {
    it('should delete reminder', async () => {
      const reminderId = generateId()
      const now = new Date()

      await Reminder.create({
        _id: reminderId,
        userId: mockUserId,
        habitId: 'habit-1',
        todoId: null,
        time: '08:00',
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

      const result = await notificationsRouter.deleteReminder.handler({
        context: authenticatedContext,
        input: { reminderId },
      })

      expect(result.success).toBe(true)

      const reminder = await Reminder.findOne({ _id: reminderId })
      expect(reminder).toBeNull()
    })

    it('should return success even if reminder does not exist', async () => {
      const result = await notificationsRouter.deleteReminder.handler({
        context: authenticatedContext,
        input: { reminderId: generateId() },
      })

      expect(result.success).toBe(true)
    })

    it('should not delete reminder owned by different user', async () => {
      const otherUserId = generateId()
      const reminderId = generateId()
      const now = new Date()

      await Reminder.create({
        _id: reminderId,
        userId: otherUserId,
        habitId: 'habit-1',
        todoId: null,
        time: '08:00',
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

      await notificationsRouter.deleteReminder.handler({
        context: authenticatedContext,
        input: { reminderId },
      })

      // Reminder should still exist
      const reminder = await Reminder.findOne({ _id: reminderId })
      expect(reminder).toBeDefined()
    })
  })
})
