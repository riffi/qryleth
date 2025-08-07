/**
 * Основной файл Express сервера для Agent Tasks UI
 * Предоставляет REST API для управления агентскими задачами
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import tasksRouter from './routes/tasks'
import epicsRouter from './routes/epics'
import managerRouter from './routes/manager'

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

// API роуты
app.use('/api/tasks', tasksRouter)
app.use('/api/epics', epicsRouter)
app.use('/api/manager', managerRouter)

// Обработка 404 для API роутов
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint не найден',
    path: req.path
  })
})

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Agent Tasks UI Backend запущен на порту ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  console.log(`📋 API endpoints:`)
  console.log(`   GET /api/tasks - получить все задачи`)
  console.log(`   GET /api/tasks/:id - получить задачу по ID`)
  console.log(`   GET /api/epics - получить все эпики`)
  console.log(`   GET /api/epics/:id - получить эпик по ID`)
  console.log(`   GET /api/epics/:id/tasks - получить задачи эпика`)
  console.log(`   GET /api/manager - получить состояние менеджера`)
})