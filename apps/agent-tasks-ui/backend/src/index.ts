/**
 * Основной файл Express сервера для Agent Tasks UI
 * Предоставляет REST API для управления агентскими задачами
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

const app = express()
const PORT = process.env.PORT || 3002

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Базовый роут для проверки работоспособности
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Agent Tasks UI Backend'
  })
})

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Agent Tasks UI Backend запущен на порту ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
})