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
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // Three.js и экосистема R3F
          if (
            id.includes('three') ||
            id.includes('three-stdlib') ||
            id.includes('@react-three/fiber') ||
            id.includes('@react-three/drei') ||
            id.includes('@react-three/postprocessing') ||
            id.includes('postprocessing')
          ) {
            return 'chunk-three'
          }
          // Mantine UI + иконки
          if (
            id.includes('@mantine/') ||
            id.includes('@tabler/icons-react')
          ) {
            return 'chunk-mantine'
          }
          // LangChain и LLM-интеграция
          if (
            id.includes('@langchain/') ||
            id.includes('openai')
          ) {
            return 'chunk-langchain'
          }
          // CodeMirror
          if (
            id.includes('@uiw/react-codemirror') ||
            id.includes('@codemirror/')
          ) {
            return 'chunk-codemirror'
          }
          // Dexie (IndexedDB)
          if (id.includes('dexie')) {
            return 'chunk-dexie'
          }
          // Базовые React-зависимости
          if (id.includes('react')) {
            return 'chunk-react'
          }
          // Остальные сторонние библиотеки
          return 'vendor'
        },
      },
    },
  },
})
