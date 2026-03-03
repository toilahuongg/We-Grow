import { describe, it, expect, beforeEach } from 'vitest'
import { Todo, UserProfile, XpTransaction } from '@we-grow/db/models/index'
import { generateId } from '@we-grow/db/utils/id'

import { createTestContext, createMockSession } from '../utils/create-test-context'
import { todosRouter } from '../../routers/todos'
import { XP_REWARDS } from '../../lib/xp'

describe('Todos Router', () => {
  const mockUserId = generateId()
  const mockSession = createMockSession({
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
  })
  const authenticatedContext = createTestContext(mockSession.user)

  beforeEach(async () => {
    await Todo.deleteMany({})
    await UserProfile.deleteMany({})
    await XpTransaction.deleteMany({})
  })

  describe('list', () => {
    it('should return empty array when user has no todos', async () => {
      const result = await todosRouter.list.handler({
        context: authenticatedContext,
      })

      expect(result).toEqual([])
    })

    it('should return all todos when no filters provided', async () => {
      const now = new Date()

      await Todo.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'Completed Todo',
        description: '',
        priority: 'normal',
        completed: true,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      })

      await Todo.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'Pending Todo',
        description: '',
        priority: 'normal',
        completed: false,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      })

      const result = await todosRouter.list.handler({
        context: authenticatedContext,
      })

      expect(result).toHaveLength(2)
    })

    it('should filter by completed status', async () => {
      const now = new Date()

      await Todo.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'Completed Todo',
        description: '',
        priority: 'normal',
        completed: true,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      })

      await Todo.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'Pending Todo',
        description: '',
        priority: 'normal',
        completed: false,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      })

      const completedResult = await todosRouter.list.handler({
        context: authenticatedContext,
        input: { completed: true },
      })

      expect(completedResult).toHaveLength(1)
      expect(completedResult[0]?.title).toBe('Completed Todo')

      const pendingResult = await todosRouter.list.handler({
        context: authenticatedContext,
        input: { completed: false },
      })

      expect(pendingResult).toHaveLength(1)
      expect(pendingResult[0]?.title).toBe('Pending Todo')
    })

    it('should filter by priority', async () => {
      const now = new Date()

      await Todo.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'Normal Todo',
        description: '',
        priority: 'normal',
        completed: false,
        createdAt: now,
        updatedAt: now,
      })

      await Todo.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'Important Todo',
        description: '',
        priority: 'important',
        completed: false,
        createdAt: now,
        updatedAt: now,
      })

      await Todo.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'Urgent Todo',
        description: '',
        priority: 'urgent',
        completed: false,
        createdAt: now,
        updatedAt: now,
      })

      const importantResult = await todosRouter.list.handler({
        context: authenticatedContext,
        input: { priority: 'important' },
      })

      expect(importantResult).toHaveLength(1)
      expect(importantResult[0]?.title).toBe('Important Todo')
    })

    it('should only return todos for current user', async () => {
      const otherUserId = generateId()
      const now = new Date()

      await Todo.create({
        _id: generateId(),
        userId: mockUserId,
        title: 'My Todo',
        description: '',
        priority: 'normal',
        completed: false,
        createdAt: now,
        updatedAt: now,
      })

      await Todo.create({
        _id: generateId(),
        userId: otherUserId,
        title: 'Other Todo',
        description: '',
        priority: 'normal',
        completed: false,
        createdAt: now,
        updatedAt: now,
      })

      const result = await todosRouter.list.handler({
        context: authenticatedContext,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.title).toBe('My Todo')
    })

    it('should return todos sorted by createdAt descending', async () => {
      const now = new Date()
      const olderDate = new Date(now.getTime() - 10000)

      const newerTodoId = generateId()
      await Todo.create({
        _id: newerTodoId,
        userId: mockUserId,
        title: 'Newer Todo',
        description: '',
        priority: 'normal',
        completed: false,
        createdAt: now,
        updatedAt: now,
      })

      const olderTodoId = generateId()
      await Todo.create({
        _id: olderTodoId,
        userId: mockUserId,
        title: 'Older Todo',
        description: '',
        priority: 'normal',
        completed: false,
        createdAt: olderDate,
        updatedAt: olderDate,
      })

      const result = await todosRouter.list.handler({
        context: authenticatedContext,
      })

      expect(result[0]?._id).toBe(newerTodoId)
      expect(result[1]?._id).toBe(olderTodoId)
    })
  })

  describe('create', () => {
    it('should create a todo with normal priority', async () => {
      const result = await todosRouter.create.handler({
        context: authenticatedContext,
        input: {
          title: 'Buy groceries',
          description: 'Milk, eggs, bread',
        },
      })

      expect(result).toBeDefined()
      expect(result.title).toBe('Buy groceries')
      expect(result.description).toBe('Milk, eggs, bread')
      expect(result.priority).toBe('normal')
      expect(result.completed).toBe(false)

      const todoInDb = await Todo.findOne({ _id: result._id })
      expect(todoInDb).toBeDefined()
      expect(todoInDb?.userId).toBe(mockUserId)
    })

    it('should create a todo with important priority', async () => {
      const result = await todosRouter.create.handler({
        context: authenticatedContext,
        input: {
          title: 'Important task',
          priority: 'important',
        },
      })

      expect(result.priority).toBe('important')
    })

    it('should create a todo with urgent priority', async () => {
      const result = await todosRouter.create.handler({
        context: authenticatedContext,
        input: {
          title: 'Urgent task',
          priority: 'urgent',
        },
      })

      expect(result.priority).toBe('urgent')
    })

    it('should reject todo with empty title', async () => {
      await expect(
        todosRouter.create.handler({
          context: authenticatedContext,
          input: {
            title: '',
          },
        })
      ).rejects.toThrow()
    })

    it('should handle empty description', async () => {
      const result = await todosRouter.create.handler({
        context: authenticatedContext,
        input: {
          title: 'Test Todo',
          description: '',
        },
      })

      expect(result.description).toBe('')
    })
  })

  describe('update', () => {
    it('should update todo title', async () => {
      const todoId = generateId()
      const now = new Date()

      await Todo.create({
        _id: todoId,
        userId: mockUserId,
        title: 'Old Title',
        description: '',
        priority: 'normal',
        completed: false,
        createdAt: now,
        updatedAt: now,
      })

      const result = await todosRouter.update.handler({
        context: authenticatedContext,
        input: {
          todoId,
          title: 'New Title',
        },
      })

      expect(result?.title).toBe('New Title')

      const todoInDb = await Todo.findOne({ _id: todoId })
      expect(todoInDb?.title).toBe('New Title')
    })

    it('should not update todo owned by different user', async () => {
      const otherUserId = generateId()
      const todoId = generateId()
      const now = new Date()

      await Todo.create({
        _id: todoId,
        userId: otherUserId,
        title: 'Other Todo',
        description: '',
        priority: 'normal',
        completed: false,
        createdAt: now,
        updatedAt: now,
      })

      const result = await todosRouter.update.handler({
        context: authenticatedContext,
        input: {
          todoId,
          title: 'Updated Title',
        },
      })

      expect(result).toBeNull()
    })

    it('should update multiple fields at once', async () => {
      const todoId = generateId()
      const now = new Date()

      await Todo.create({
        _id: todoId,
        userId: mockUserId,
        title: 'Old Title',
        description: 'Old Description',
        priority: 'normal',
        completed: false,
        createdAt: now,
        updatedAt: now,
      })

      const result = await todosRouter.update.handler({
        context: authenticatedContext,
        input: {
          todoId,
          title: 'New Title',
          description: 'New Description',
          priority: 'urgent',
        },
      })

      expect(result?.title).toBe('New Title')
      expect(result?.description).toBe('New Description')
      expect(result?.priority).toBe('urgent')
    })

    it('should not update completed status through update', async () => {
      const todoId = generateId()
      const now = new Date()

      await Todo.create({
        _id: todoId,
        userId: mockUserId,
        title: 'Test Todo',
        description: '',
        priority: 'normal',
        completed: false,
        createdAt: now,
        updatedAt: now,
      })

      const result = await todosRouter.update.handler({
        context: authenticatedContext,
        input: {
          todoId,
          title: 'Updated Title',
        },
      })

      expect(result?.completed).toBe(false)
    })
  })

  describe('delete', () => {
    it('should delete a todo', async () => {
      const todoId = generateId()
      const now = new Date()

      await Todo.create({
        _id: todoId,
        userId: mockUserId,
        title: 'Test Todo',
        description: '',
        priority: 'normal',
        completed: false,
        createdAt: now,
        updatedAt: now,
      })

      const result = await todosRouter.delete.handler({
        context: authenticatedContext,
        input: { todoId },
      })

      expect(result.success).toBe(true)

      const todoInDb = await Todo.findOne({ _id: todoId })
      expect(todoInDb).toBeNull()
    })

    it('should return success even for non-existent todo', async () => {
      const result = await todosRouter.delete.handler({
        context: authenticatedContext,
        input: { todoId: generateId() },
      })

      expect(result.success).toBe(true)
    })

    it('should not delete todo owned by different user', async () => {
      const otherUserId = generateId()
      const todoId = generateId()
      const now = new Date()

      await Todo.create({
        _id: todoId,
        userId: otherUserId,
        title: 'Other Todo',
        description: '',
        priority: 'normal',
        completed: false,
        createdAt: now,
        updatedAt: now,
      })

      await todosRouter.delete.handler({
        context: authenticatedContext,
        input: { todoId },
      })

      const todoInDb = await Todo.findOne({ _id: todoId })
      expect(todoInDb).toBeDefined()
    })
  })

  describe('complete', () => {
    it('should complete a normal priority todo and award XP', async () => {
      const todoId = generateId()
      const now = new Date()

      await Todo.create({
        _id: todoId,
        userId: mockUserId,
        title: 'Normal Todo',
        description: '',
        priority: 'normal',
        completed: false,
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

      const result = await todosRouter.complete.handler({
        context: authenticatedContext,
        input: { todoId },
      })

      expect(result.success).toBe(true)
      expect(result.alreadyCompleted).toBe(false)
      expect(result.xpAwarded).toBe(XP_REWARDS.TODO_NORMAL)

      const todoInDb = await Todo.findOne({ _id: todoId })
      expect(todoInDb?.completed).toBe(true)
      expect(todoInDb?.completedAt).toBeDefined()

      const xpTransaction = await XpTransaction.findOne({
        userId: mockUserId,
        source: 'todo_completion',
        sourceId: todoId,
      })
      expect(xpTransaction).toBeDefined()
      expect(xpTransaction?.amount).toBe(XP_REWARDS.TODO_NORMAL)

      const profile = await UserProfile.findOne({ userId: mockUserId })
      expect(profile?.totalXp).toBe(XP_REWARDS.TODO_NORMAL)
    })

    it('should complete an important priority todo and award correct XP', async () => {
      const todoId = generateId()
      const now = new Date()

      await Todo.create({
        _id: todoId,
        userId: mockUserId,
        title: 'Important Todo',
        description: '',
        priority: 'important',
        completed: false,
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

      const result = await todosRouter.complete.handler({
        context: authenticatedContext,
        input: { todoId },
      })

      expect(result.xpAwarded).toBe(XP_REWARDS.TODO_IMPORTANT)
    })

    it('should complete an urgent priority todo and award correct XP', async () => {
      const todoId = generateId()
      const now = new Date()

      await Todo.create({
        _id: todoId,
        userId: mockUserId,
        title: 'Urgent Todo',
        description: '',
        priority: 'urgent',
        completed: false,
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

      const result = await todosRouter.complete.handler({
        context: authenticatedContext,
        input: { todoId },
      })

      expect(result.xpAwarded).toBe(XP_REWARDS.TODO_URGENT)
    })

    it('should return alreadyCompleted for already completed todo', async () => {
      const todoId = generateId()
      const now = new Date()

      await Todo.create({
        _id: todoId,
        userId: mockUserId,
        title: 'Completed Todo',
        description: '',
        priority: 'normal',
        completed: true,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      })

      const result = await todosRouter.complete.handler({
        context: authenticatedContext,
        input: { todoId },
      })

      expect(result.success).toBe(true)
      expect(result.alreadyCompleted).toBe(true)
    })

    it('should throw error for non-existent todo', async () => {
      await expect(
        todosRouter.complete.handler({
          context: authenticatedContext,
          input: { todoId: generateId() },
        })
      ).rejects.toThrow('Todo not found')
    })

    it('should not award XP twice for same todo', async () => {
      const todoId = generateId()
      const now = new Date()

      await Todo.create({
        _id: todoId,
        userId: mockUserId,
        title: 'Test Todo',
        description: '',
        priority: 'normal',
        completed: false,
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

      // First completion
      await todosRouter.complete.handler({
        context: authenticatedContext,
        input: { todoId },
      })

      // Try to complete again
      await todosRouter.complete.handler({
        context: authenticatedContext,
        input: { todoId },
      })

      const transactions = await XpTransaction.find({
        userId: mockUserId,
        sourceId: todoId,
      })

      expect(transactions).toHaveLength(1)

      const profile = await UserProfile.findOne({ userId: mockUserId })
      expect(profile?.totalXp).toBe(XP_REWARDS.TODO_NORMAL)
    })
  })

  describe('uncomplete', () => {
    it('should uncomplete a completed todo', async () => {
      const todoId = generateId()
      const now = new Date()

      await Todo.create({
        _id: todoId,
        userId: mockUserId,
        title: 'Test Todo',
        description: '',
        priority: 'normal',
        completed: true,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      })

      const result = await todosRouter.uncomplete.handler({
        context: authenticatedContext,
        input: { todoId },
      })

      expect(result.success).toBe(true)
      expect(result.wasCompleted).toBe(true)

      const todoInDb = await Todo.findOne({ _id: todoId })
      expect(todoInDb?.completed).toBe(false)
      expect(todoInDb?.completedAt).toBeNull()
    })

    it('should return wasCompleted false for uncompleted todo', async () => {
      const todoId = generateId()
      const now = new Date()

      await Todo.create({
        _id: todoId,
        userId: mockUserId,
        title: 'Test Todo',
        description: '',
        priority: 'normal',
        completed: false,
        createdAt: now,
        updatedAt: now,
      })

      const result = await todosRouter.uncomplete.handler({
        context: authenticatedContext,
        input: { todoId },
      })

      expect(result.success).toBe(true)
      expect(result.wasCompleted).toBe(false)
    })

    it('should return wasCompleted false for non-existent todo', async () => {
      const result = await todosRouter.uncomplete.handler({
        context: authenticatedContext,
        input: { todoId: generateId() },
      })

      expect(result.success).toBe(true)
      expect(result.wasCompleted).toBe(false)
    })

    it('should not modify XP when uncompleting', async () => {
      const todoId = generateId()
      const now = new Date()

      await Todo.create({
        _id: todoId,
        userId: mockUserId,
        title: 'Test Todo',
        description: '',
        priority: 'normal',
        completed: true,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      })

      await UserProfile.create({
        _id: generateId(),
        userId: mockUserId,
        goals: [],
        timezone: 'UTC',
        totalXp: 100,
        level: 2,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      })

      await todosRouter.uncomplete.handler({
        context: authenticatedContext,
        input: { todoId },
      })

      const profile = await UserProfile.findOne({ userId: mockUserId })
      expect(profile?.totalXp).toBe(100)
    })
  })
})
