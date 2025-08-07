/**
 * API роуты для работы с эпиками
 */

import { Router } from 'express'
import { getAllEpics, getEpicTasks } from '../services/fileSystemService'

const router = Router()

/**
 * GET /api/epics
 * Получить список всех эпиков
 */
router.get('/', async (req, res) => {
  try {
    const epics = await getAllEpics()
    res.json({
      success: true,
      data: epics,
      count: epics.length
    })
  } catch (error) {
    console.error('Ошибка получения списка эпиков:', error)
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении списка эпиков',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    })
  }
})

/**
 * GET /api/epics/:id
 * Получить конкретный эпик по ID
 */
router.get('/:id', async (req, res) => {
  try {
    const epicId = parseInt(req.params.id, 10)
    
    if (isNaN(epicId)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный ID эпика'
      })
    }
    
    const epics = await getAllEpics()
    const epic = epics.find(e => e.id === epicId)
    
    if (!epic) {
      return res.status(404).json({
        success: false,
        error: 'Эпик не найден'
      })
    }
    
    res.json({
      success: true,
      data: epic
    })
  } catch (error) {
    console.error(`Ошибка получения эпика ${req.params.id}:`, error)
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении эпика',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    })
  }
})

/**
 * GET /api/epics/:id/tasks
 * Получить все задачи конкретного эпика
 */
router.get('/:id/tasks', async (req, res) => {
  try {
    const epicId = parseInt(req.params.id, 10)
    
    if (isNaN(epicId)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный ID эпика'
      })
    }
    
    const tasks = await getEpicTasks(epicId)
    
    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    })
  } catch (error) {
    console.error(`Ошибка получения задач эпика ${req.params.id}:`, error)
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении задач эпика',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    })
  }
})

export default router