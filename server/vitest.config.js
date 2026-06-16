import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.js', 'routes/**/*.test.js', 'services/**/*.test.js', 'db/**/*.test.js', 'middleware/**/*.test.js'],
    env: {
      JWT_SECRET: 'vitest-jwt-secret-for-testing',
      LIFEOS_DB_PATH: ':memory:',
    },
  },
})
