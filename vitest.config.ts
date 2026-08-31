import { defineConfig } from 'vitest/config'
import { sharedConfig } from './vite.config'

export default defineConfig({
  ...sharedConfig,
  test: {
    globals: true,
    setupFiles: ['./test-setup.ts'],
    env: {
      // Pin the timezone to UTC so that `new Date(y, m, d)` always produces UTC
      // midnight regardless of the machine's local timezone. This matches the
      // behaviour callers rely on: dates constructed by the parser are at
      // midnight in whichever timezone the process runs in (in production that is
      // the spreadsheet's timezone; in tests it is UTC).
      TZ: 'UTC',
    },
    coverage: {
      exclude: ['src/fixtures/**', 'src/plugins/**', 'src/stories/**'],
      reporter: ['text', 'json', 'html', 'lcov'],
      provider: 'v8',
    },
  },
})
