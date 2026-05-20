import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@schemas': fileURLToPath(new URL('./src/schemas', import.meta.url))
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/schemas/**', 'src/server/**', 'src/mcp/**'],
      exclude: [
        'src/server/events/types.ts',
        '**/index.ts'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    }
  }
})
