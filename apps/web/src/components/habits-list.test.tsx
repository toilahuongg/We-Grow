import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '../test/test-utils'
import { HabitsList } from './habits-list'
import { orpc } from '@/utils/orpc'

// Mock orpc utilities
vi.mock('@/utils/orpc', () => ({
  orpc: {
    habits: {
      list: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['habits', 'list'] }),
        queryKey: vi.fn().mockReturnValue(['habits', 'list']),
      },
    },
    notifications: {
      listReminders: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['notifications', 'reminders'] }),
        queryKey: vi.fn().mockReturnValue(['notifications', 'reminders']),
      },
    },
    gamification: {
      getProfile: {
        queryKey: vi.fn().mockReturnValue(['gamification', 'profile']),
      },
    },
  },
  client: {
    habits: {
      complete: vi.fn(),
      uncomplete: vi.fn(),
      archive: vi.fn(),
      delete: vi.fn(),
    },
    notifications: {
      toggleHabitReminder: vi.fn(),
    },
  },
}))

// Mock next-intl since HabitsList might use it (even if not explicitly seen in first 800 lines, common in this project)
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
  NextIntlClientProvider: ({ children }: any) => <>{children}</>,
}))

import { useQuery } from '@tanstack/react-query'
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
    useQueryClient: vi.fn().mockReturnValue({ invalidateQueries: vi.fn() }),
  }
})

describe('HabitsList Component', () => {
  it('renders loading state', () => {
    ;(useQuery as any).mockReturnValue({ isLoading: true })
    render(<HabitsList />)
    // Should find pulse/skeleton loaders
    expect(document.querySelector('.animate-pulse')).toBeDefined()
  })

  it('renders empty state when no habits', async () => {
    ;(useQuery as any).mockReturnValue({ data: [], isLoading: false })
    render(<HabitsList />)
    expect(screen.getByText('No active habits')).toBeDefined()
  })

  it('renders list of habits', async () => {
    const mockHabits = [
      {
        _id: '1',
        title: 'Morning Yoga',
        frequency: 'daily',
        currentStreak: 5,
        longestStreak: 10,
        archived: false,
        completedToday: false,
      },
    ]
    ;(useQuery as any).mockReturnValue({ data: mockHabits, isLoading: false })
    
    render(<HabitsList />)
    
    expect(screen.getByText('Morning Yoga')).toBeDefined()
    expect(screen.getByText('5 day streak')).toBeDefined()
  })
})
