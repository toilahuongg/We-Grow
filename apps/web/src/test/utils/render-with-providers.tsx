// @ts-nocheck
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

// Mock query client for testing
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  })
}

interface TestProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
}

export function TestProviders({
  children,
  queryClient = createTestQueryClient(),
}: TestProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools />
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: CustomRenderOptions
) {
  const { queryClient, ...renderOptions } = options || {}

  return {
    ...render(ui, {
      wrapper: ({ children }) => (
        <TestProviders queryClient={queryClient}>
          {children}
        </TestProviders>
      ),
      ...renderOptions,
    }),
  }
}

// Re-export everything from Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
