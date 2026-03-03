import type { AppRouterClient } from '@we-grow/api/routers/index'
import { vi } from 'vitest'

import type { ORPCClient } from '@orpc/client'

/**
 * Mock API response types
 */
export interface MockApiResponse<T> {
  data?: T
  error?: { code: string; message: string }
}

/**
 * Create a mock oRPC client with predefined responses
 */
export function createMockApiClient(
  mocks: Partial<Record<keyof AppRouterClient, unknown>> = {}
) {
  const mockClient = vi.fn() as unknown as AppRouterClient

  // Setup mock handlers for each route
  for (const [key, value] of Object.entries(mocks)) {
    mockClient[key] = value
  }

  // Default mock handlers
  const defaultMocks = {
    // Habits
    habits: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: '1', title: 'Test Habit' }),
      update: vi.fn().mockResolvedValue({ id: '1', title: 'Updated Habit' }),
      delete: vi.fn().mockResolvedValue({ success: true }),
      complete: vi.fn().mockResolvedValue({ xpEarned: 10 }),
      uncomplete: vi.fn().mockResolvedValue({ success: true }),
    },
    // Todos
    todos: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: '1', title: 'Test Todo' }),
      update: vi.fn().mockResolvedValue({ id: '1', title: 'Updated Todo' }),
      delete: vi.fn().mockResolvedValue({ success: true }),
      toggleComplete: vi.fn().mockResolvedValue({ xpEarned: 10 }),
    },
    // Groups
    groups: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: '1', name: 'Test Group' }),
      update: vi.fn().mockResolvedValue({ id: '1', name: 'Updated Group' }),
      delete: vi.fn().mockResolvedValue({ success: true }),
      join: vi.fn().mockResolvedValue({ success: true }),
      leave: vi.fn().mockResolvedValue({ success: true }),
      addMember: vi.fn().mockResolvedValue({ success: true }),
      removeMember: vi.fn().mockResolvedValue({ success: true }),
      updateMemberRole: vi.fn().mockResolvedValue({ success: true }),
      addHabit: vi.fn().mockResolvedValue({ success: true }),
      removeHabit: vi.fn().mockResolvedValue({ success: true }),
    },
    // Gamification
    gamification: {
      getXp: vi.fn().mockResolvedValue({ totalXp: 0, level: 1 }),
      getLeaderboard: vi.fn().mockResolvedValue([]),
      getStreak: vi.fn().mockResolvedValue({ currentStreak: 0, longestStreak: 0 }),
    },
    // Notifications
    notifications: {
      subscribe: vi.fn().mockResolvedValue({ success: true }),
      unsubscribe: vi.fn().mockResolvedValue({ success: true }),
      test: vi.fn().mockResolvedValue({ success: true }),
    },
    // Onboarding
    onboarding: {
      getStatus: vi.fn().mockResolvedValue({ completed: false }),
      complete: vi.fn().mockResolvedValue({ success: true, xpEarned: 10 }),
    },
  }

  return { ...defaultMocks, ...mocks } as AppRouterClient
}

/**
 * Create mock API handlers for testing error states
 */
export function createMockApiErrorHandlers() {
  return {
    habits: {
      list: vi.fn().mockRejectedValue(new Error('Failed to fetch habits')),
      get: vi.fn().mockRejectedValue(new Error('Habit not found')),
      create: vi.fn().mockRejectedValue(new Error('Failed to create habit')),
      update: vi.fn().mockRejectedValue(new Error('Failed to update habit')),
      delete: vi.fn().mockRejectedValue(new Error('Failed to delete habit')),
      complete: vi.fn().mockRejectedValue(new Error('Failed to complete habit')),
      uncomplete: vi.fn().mockRejectedValue(new Error('Failed to uncomplete habit')),
    },
    todos: {
      list: vi.fn().mockRejectedValue(new Error('Failed to fetch todos')),
      get: vi.fn().mockRejectedValue(new Error('Todo not found')),
      create: vi.fn().mockRejectedValue(new Error('Failed to create todo')),
      update: vi.fn().mockRejectedValue(new Error('Failed to update todo')),
      delete: vi.fn().mockRejectedValue(new Error('Failed to delete todo')),
      toggleComplete: vi.fn().mockRejectedValue(new Error('Failed to toggle todo')),
    },
    groups: {
      list: vi.fn().mockRejectedValue(new Error('Failed to fetch groups')),
      get: vi.fn().mockRejectedValue(new Error('Group not found')),
      create: vi.fn().mockRejectedValue(new Error('Failed to create group')),
      update: vi.fn().mockRejectedValue(new Error('Failed to update group')),
      delete: vi.fn().mockRejectedValue(new Error('Failed to delete group')),
      join: vi.fn().mockRejectedValue(new Error('Failed to join group')),
      leave: vi.fn().mockRejectedValue(new Error('Failed to leave group')),
      addMember: vi.fn().mockRejectedValue(new Error('Failed to add member')),
      removeMember: vi.fn().mockRejectedValue(new Error('Failed to remove member')),
      updateMemberRole: vi.fn().mockRejectedValue(
        new Error('Failed to update member role')
      ),
      addHabit: vi.fn().mockRejectedValue(new Error('Failed to add habit')),
      removeHabit: vi.fn().mockRejectedValue(new Error('Failed to remove habit')),
    },
    gamification: {
      getXp: vi.fn().mockRejectedValue(new Error('Failed to fetch XP')),
      getLeaderboard: vi.fn().mockRejectedValue(new Error('Failed to fetch leaderboard')),
      getStreak: vi.fn().mockRejectedValue(new Error('Failed to fetch streak')),
    },
    notifications: {
      subscribe: vi.fn().mockRejectedValue(new Error('Failed to subscribe')),
      unsubscribe: vi.fn().mockRejectedValue(new Error('Failed to unsubscribe')),
      test: vi.fn().mockRejectedValue(new Error('Failed to send test notification')),
    },
    onboarding: {
      getStatus: vi.fn().mockRejectedValue(new Error('Failed to fetch onboarding status')),
      complete: vi.fn().mockRejectedValue(new Error('Failed to complete onboarding')),
    },
  }
}

/**
 * Mock authenticated session
 */
export function createMockSession() {
  return {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: 'test-session-id',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      token: 'test-session-token',
      userId: 'test-user-id',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }
}

/**
 * Mock anonymous session
 */
export function createAnonymousSession() {
  return null
}
