/**
 * API роуты для работы с агентскими задачами
 */

import { Router } from 'express'
import { getAllTasks, getTaskById } from '../services/fileSystemService'

const router = Router()

/**
 * GET /api/tasks
 * Получить список всех задач
 */
router.get('/', async (req, res) => {
  try {
    const tasks = await getAllTasks()
    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    })
  } catch (error) {
    console.error('Ошибка получения списка задач:', error)
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении списка задач',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    })
  }
})

/**
 * GET /api/tasks/:id
 * Получить конкретную задачу по ID
 */
router.get('/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10)
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный ID задачи'
      })
    }
    
    const task = await getTaskById(taskId)
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Задача не найдена'
      })
    }
    
    res.json({
      success: true,
      data: task
    })
  } catch (error) {
    console.error(`Ошибка получения задачи ${req.params.id}:`, error)
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении задачи',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    })
  }
})

export default router