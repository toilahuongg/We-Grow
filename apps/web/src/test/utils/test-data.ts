/**
 * Test data factories for component tests
 */

export interface MockHabit {
  id: string
  title: string
  description: string | null
  frequency: 'daily' | 'weekly' | 'specific_days'
  specificDays: number[] | null
  targetCount: number
  createdAt: string
  updatedAt: string
  completedToday?: boolean
  currentStreak?: number
}

export interface MockTodo {
  id: string
  title: string
  description: string | null
  priority: 'normal' | 'important' | 'urgent'
  dueDate: string | null
  completed: boolean
  completedAt: string | null
  xpEarned: number
  createdAt: string
  updatedAt: string
}

export interface MockGroup {
  id: string
  name: string
  description: string | null
  maxMembers: number
  memberCount: number
  createdAt: string
  updatedAt: string
  role?: 'owner' | 'admin' | 'member'
}

export interface MockGroupMember {
  id: string
  userId: string
  userName: string
  userEmail: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
  totalXp: number
  level: number
}

export interface MockLeaderboardEntry {
  userId: string
  userName: string
  userImage: string | null
  totalXp: number
  level: number
  rank: number
}

/**
 * Create a mock habit
 */
export function createMockHabit(overrides: Partial<MockHabit> = {}): MockHabit {
  return {
    id: '1',
    title: 'Exercise',
    description: 'Daily workout',
    frequency: 'daily',
    specificDays: null,
    targetCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedToday: false,
    currentStreak: 5,
    ...overrides,
  }
}

/**
 * Create mock habits
 */
export function createMockHabits(count: number): MockHabit[] {
  return Array.from({ length: count }, (_, i) =>
    createMockHabit({
      id: String(i + 1),
      title: `Habit ${i + 1}`,
    })
  )
}

/**
 * Create a mock todo
 */
export function createMockTodo(overrides: Partial<MockTodo> = {}): MockTodo {
  return {
    id: '1',
    title: 'Buy groceries',
    description: null,
    priority: 'normal',
    dueDate: null,
    completed: false,
    completedAt: null,
    xpEarned: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create mock todos
 */
export function createMockTodos(count: number): MockTodo[] {
  return Array.from({ length: count }, (_, i) =>
    createMockTodo({
      id: String(i + 1),
      title: `Todo ${i + 1}`,
    })
  )
}

/**
 * Create a mock group
 */
export function createMockGroup(overrides: Partial<MockGroup> = {}): MockGroup {
  return {
    id: '1',
    name: 'Fitness Group',
    description: 'A group for fitness enthusiasts',
    maxMembers: 10,
    memberCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    role: 'owner',
    ...overrides,
  }
}

/**
 * Create mock groups
 */
export function createMockGroups(count: number): MockGroup[] {
  return Array.from({ length: count }, (_, i) =>
    createMockGroup({
      id: String(i + 1),
      name: `Group ${i + 1}`,
    })
  )
}

/**
 * Create a mock group member
 */
export function createMockGroupMember(
  overrides: Partial<MockGroupMember> = {}
): MockGroupMember {
  return {
    id: '1',
    userId: 'user-1',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    role: 'member',
    joinedAt: new Date().toISOString(),
    totalXp: 500,
    level: 3,
    ...overrides,
  }
}

/**
 * Create mock group members
 */
export function createMockGroupMembers(count: number): MockGroupMember[] {
  return Array.from({ length: count }, (_, i) =>
    createMockGroupMember({
      id: String(i + 1),
      userId: `user-${i + 1}`,
      userName: `User ${i + 1}`,
      userEmail: `user${i + 1}@example.com`,
    })
  )
}

/**
 * Create a mock leaderboard entry
 */
export function createMockLeaderboardEntry(
  overrides: Partial<MockLeaderboardEntry> = {}
): MockLeaderboardEntry {
  return {
    userId: 'user-1',
    userName: 'John Doe',
    userImage: null,
    totalXp: 1000,
    level: 5,
    rank: 1,
    ...overrides,
  }
}

/**
 * Create mock leaderboard entries
 */
export function createMockLeaderboardEntries(
  count: number
): MockLeaderboardEntry[] {
  return Array.from({ length: count }, (_, i) =>
    createMockLeaderboardEntry({
      userId: `user-${i + 1}`,
      userName: `User ${i + 1}`,
      totalXp: 1000 - i * 100,
      level: 5 - i,
      rank: i + 1,
    })
  )
}

/**
 * Create mock XP data
 */
export function createMockXpData() {
  return {
    totalXp: 500,
    level: 3,
    currentLevelXp: 300,
    nextLevelXp: 600,
    progressXp: 200,
  }
}

/**
 * Create mock streak data
 */
export function createMockStreakData() {
  return {
    currentStreak: 7,
    longestStreak: 30,
  }
}

/**
 * Create mock onboarding status
 */
export function createMockOnboardingStatus(completed = false) {
  return {
    completed,
  }
}
