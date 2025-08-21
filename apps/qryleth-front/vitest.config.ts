import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

/**
 * Конфигурация Vitest для тестирования приложения qryleth-front
 * Настраивает тестовую среду и алиасы путей для импорта модулей
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})