import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig as defineViteConfig } from 'vite'
// @ts-expect-error - vitest/config types may not be available in all environments
import { defineConfig } from 'vitest/config'
// @ts-expect-error - vite-tsconfig-paths types may not be available in all environments
import tsconfigPaths from 'vite-tsconfig-paths'
import vue from '@vitejs/plugin-vue'

export default mergeConfig(
  defineViteConfig({
    plugins: [
      tsconfigPaths({
        projects: ['./tsconfig.json'],
      }),
      vue(),
    ],
    resolve: {
      alias: {
        'src': fileURLToPath(new URL('./src', import.meta.url)),
        'components': fileURLToPath(new URL('./src/components', import.meta.url)),
        'layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
        'pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
        'assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
        'boot': fileURLToPath(new URL('./src/boot', import.meta.url)),
      },
    },
  }),
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'tests/',
          'src/**/*.d.ts',
          'src/**/*.config.*',
          'src/**/*.spec.ts',
          'src/**/*.test.ts',
        ],
      },
    },
  })
)

