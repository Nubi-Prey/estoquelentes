import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared')
    }
  },
  test: {
    // Fast Node environment by default (pure functions, main-process db logic).
    // Component tests opt into jsdom per-file via `// @vitest-environment jsdom`.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts']
  }
})
