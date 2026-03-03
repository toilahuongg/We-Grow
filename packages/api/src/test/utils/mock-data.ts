import { generateId } from '@we-grow/db/utils'

export interface MockUser {
  _id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface MockHabit {
  _id: string
  userId: string
  title: string
  description?: string | null
  frequency: 'daily' | 'weekly' | 'specific_days'
  specificDays?: number[] | null
  targetCount: number
  createdAt: Date
  updatedAt: Date
}

export interface MockHabitCompletion {
  _id: string
  habitId: string
  userId: string
  completedAt: Date
  xpEarned: number
  streakBonus: number
  createdAt: Date
  updatedAt: Date
}

export interface MockTodo {
  _id: string
  userId: string
  title: string
  description?: string | null
  priority: 'normal' | 'important' | 'urgent'
  dueDate?: Date | null
  completed: boolean
  completedAt?: Date | null
  xpEarned: number
  createdAt: Date
  updatedAt: Date
}

export interface MockGroup {
  _id: string
  name: string
  description?: string | null
  maxMembers: number
  createdAt: Date
  updatedAt: Date
}

export interface MockGroupMember {
  _id: string
  groupId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface MockGroupHabit {
  _id: string
  groupId: string
  habitId: string
  assignedBy: string
  assignedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface MockXpTransaction {
  _id: string
  userId: string
  amount: number
  source: string
  sourceId?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface MockUserProfile {
  _id: string
  userId: string
  totalXp: number
  level: number
  currentStreak: number
  longestStreak: number
  lastActiveDate: Date | null
  onboardingCompleted: boolean
  createdAt: Date
  updatedAt: Date
}

// User factories
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    _id: generateId(),
    name: 'Test User',
    email: 'test@example.com',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createMockUsers(count: number): MockUser[] {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      name: `Test User ${i + 1}`,
      email: `test${i + 1}@example.com`,
    })
  )
}

// Habit factories
export function createMockHabit(
  userId: string,
  overrides: Partial<MockHabit> = {}
): MockHabit {
  return {
    _id: generateId(),
    userId,
    title: 'Test Habit',
    description: null,
    frequency: 'daily',
    specificDays: null,
    targetCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createMockHabits(
  userId: string,
  count: number
): MockHabit[] {
  return Array.from({ length: count }, (_, i) =>
    createMockHabit(userId, {
      title: `Test Habit ${i + 1}`,
    })
  )
}

// Habit completion factories
export function createMockHabitCompletion(
  habitId: string,
  userId: string,
  completedAt: Date = new Date(),
  overrides: Partial<MockHabitCompletion> = {}
): MockHabitCompletion {
  return {
    _id: generateId(),
    habitId,
    userId,
    completedAt,
    xpEarned: 10,
    streakBonus: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createMockHabitCompletions(
  habitId: string,
  userId: string,
  days: number
): MockHabitCompletion[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (days - 1 - i))
    return createMockHabitCompletion(habitId, userId, date)
  })
}

// Todo factories
export function createMockTodo(
  userId: string,
  overrides: Partial<MockTodo> = {}
): MockTodo {
  return {
    _id: generateId(),
    userId,
    title: 'Test Todo',
    description: null,
    priority: 'normal',
    dueDate: null,
    completed: false,
    completedAt: null,
    xpEarned: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createMockTodos(userId: string, count: number): MockTodo[] {
  return Array.from({ length: count }, (_, i) =>
    createMockTodo(userId, {
      title: `Test Todo ${i + 1}`,
    })
  )
}

// Group factories
export function createMockGroup(overrides: Partial<MockGroup> = {}): MockGroup {
  return {
    _id: generateId(),
    name: 'Test Group',
    description: null,
    maxMembers: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createMockGroupMember(
  groupId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member' = 'member'
): MockGroupMember {
  return {
    _id: generateId(),
    groupId,
    userId,
    role,
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export function createMockGroupHabit(
  groupId: string,
  habitId: string,
  assignedBy: string
): MockGroupHabit {
  return {
    _id: generateId(),
    groupId,
    habitId,
    assignedBy,
    assignedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// XP transaction factories
export function createMockXpTransaction(
  userId: string,
  amount: number,
  source: string
): MockXpTransaction {
  return {
    _id: generateId(),
    userId,
    amount,
    source,
    sourceId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export function createMockUserProfile(
  userId: string,
  overrides: Partial<MockUserProfile> = {}
): MockUserProfile {
  return {
    _id: generateId(),
    userId,
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    onboardingCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}
