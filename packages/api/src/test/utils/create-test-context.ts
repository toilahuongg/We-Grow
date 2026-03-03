import type { Context } from '../../context'

import type { Session } from '@we-grow/auth'

export interface TestUser {
  id: string
  name: string
  email: string
  image?: string | null
}

export function createMockSession(user: TestUser): Session {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 days
  return {
    user: {
      ...user,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: 'test-session-id',
      expiresAt,
      token: 'test-session-token',
      userId: user.id,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }
}

export function createTestContext(user?: TestUser): Context {
  if (user) {
    return {
      session: createMockSession(user),
    }
  }
  return {
    session: null,
  }
}

export function createAuthenticatedContext(): Context {
  return createTestContext({
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
  })
}

export function createAnonymousContext(): Context {
  return createTestContext()
}
