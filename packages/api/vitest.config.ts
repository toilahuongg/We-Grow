import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['**/*.{test,spec}.ts'],
    setupFiles: ['./src/test/setup.ts'],
    poolOptions: {
      forks: {
        isolate: false,
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
        '**/index.ts',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 20000,
    transformMode: {
      ssr: [/\.[jt]s$/],
    },
  },
  ssr: {
    noExternal: /^(mongoose|mongodb-memory-server|@we-grow)/,
  },
})
