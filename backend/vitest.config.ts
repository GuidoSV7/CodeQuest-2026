import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    environment: 'node',
    fileParallelism: false,
    poolOptions: {
      threads: { singleThread: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
      '@test': path.resolve(rootDir, './test'),
    },
  },
})
