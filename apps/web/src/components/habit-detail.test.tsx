import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '../test/test-utils'
import { HabitDetail } from './habit-detail'
import { orpc } from '@/utils/orpc'
import { useQuery } from '@tanstack/react-query'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => 'en',
  NextIntlClientProvider: ({ children }: any) => <>{children}</>,
}))

// Mock orpc utilities
vi.mock('@/utils/orpc', () => ({
  orpc: {
    habits: {
      getById: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['habits', 'getById'] }),
        queryKey: vi.fn().mockReturnValue(['habits', 'getById']),
      },
      getCompletions: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['habits', 'getCompletions'] }),
        queryKey: vi.fn().mockReturnValue(['habits', 'getCompletions']),
      },
    },
    notifications: {
      getReminderByHabitId: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['notifications', 'reminder'] }),
        queryKey: vi.fn().mockReturnValue(['notifications', 'reminder']),
      },
    },
    gamification: {
      getProfile: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['gamification', 'profile'] }),
        queryKey: vi.fn().mockReturnValue(['gamification', 'profile']),
      },
    },
  },
  client: {
    habits: {
      complete: vi.fn(),
      uncomplete: vi.fn(),
      delete: vi.fn(),
      updateNote: vi.fn(),
    },
    notifications: {
      toggleHabitReminder: vi.fn(),
    },
  },
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
    useQueryClient: vi.fn().mockReturnValue({ invalidateQueries: vi.fn() }),
  }
})

describe('HabitDetail Component', () => {
  const mockHabit = {
    _id: 'habit-123',
    title: 'Morning Meditation',
    description: '10 minutes of calm',
    frequency: 'daily',
    currentStreak: 7,
    longestStreak: 14,
    createdAt: new Date().toISOString(),
    completedToday: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useQuery as any).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'habits' && queryKey[1] === 'getById') {
        return { data: mockHabit, isLoading: false }
      }
      if (queryKey[0] === 'habits' && queryKey[1] === 'getCompletions') {
        return { data: [], isLoading: false }
      }
      return { data: null, isLoading: false }
    })
  })

  it('renders habit title and frequency', () => {
    render(<HabitDetail habitId="habit-123" />)
    
    expect(screen.getByText('Morning Meditation')).toBeDefined()
    expect(screen.getAllByText('daily').length).toBeGreaterThan(0)
  })

  it('renders statistics', () => {
    render(<HabitDetail habitId="habit-123" />)
    
    expect(screen.getByText('habitDetail.statistics')).toBeDefined()
    // Streak and other stats might appear multiple times (calendar + stats)
    const sevenElements = screen.getAllByText('7')
    expect(sevenElements.length).toBeGreaterThan(0)
    
    const fourteenElements = screen.getAllByText('14')
    expect(fourteenElements.length).toBeGreaterThan(0)
  })

  it('renders mark complete button when not completed', () => {
    render(<HabitDetail habitId="habit-123" />)
    expect(screen.getByText('habitDetail.markComplete')).toBeDefined()
  })

  it('renders not found state', () => {
    ;(useQuery as any).mockReturnValue({ data: null, isLoading: false })
    render(<HabitDetail habitId="wrong-id" />)
    expect(screen.getByText('habitDetail.habitNotFound')).toBeDefined()
  })
})

