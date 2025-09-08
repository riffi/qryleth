import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    /**
     * В монорепозитории возможна ситуация с дублированием копий react/react-dom
     * (например, при хостинге зависимостей на верхнем уровне и локально в приложении).
     * Dedupe гарантирует, что будет использована одна копия модулей реакт‑стека,
     * что критично для корректной работы @react-three/fiber в прод‑сборке.
     */
    dedupe: ['react', 'react-dom'],
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      // Отключаем кастомное разбиение чанков и доверяем Vite/Rollup
      output: {},
    },
  },
})
