/**
 * API роуты для работы с агентскими задачами
 */

import { Router } from 'express'
import { getAllTasks, getTaskById } from '../services/fileSystemService.js'

const router = Router()

/**
 * GET /api/tasks
 * Получить список всех задач с поддержкой фильтрации и поиска
 * Query параметры:
 * - search: поиск по названию и контенту
 * - tags: фильтр по тегам (через запятую)
 * - status: фильтр по статусу
 * - epic: фильтр по эпику
 * - page: номер страницы для пагинации
 * - limit: количество результатов на странице
 */
router.get('/', async (req, res) => {
  try {
    // Получаем параметры запроса
    const {
      search,
      tags,
      status,
      epic,
      page = 1,
      limit = 10
    } = req.query

    let tasks = await getAllTasks()

    // Поиск по названию и контенту
    if (search && typeof search === 'string') {
      const searchTerm = search.toLowerCase()
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm) ||
        task.content.toLowerCase().includes(searchTerm)
      )
    }

    // Фильтр по тегам
    if (tags && typeof tags === 'string') {
      const tagsList = tags.split(',').map(tag => tag.trim().toLowerCase())
      tasks = tasks.filter(task => 
        tagsList.some(tag => 
          task.tags.some(taskTag => taskTag.toLowerCase().includes(tag))
        )
      )
    }

    // Фильтр по статусу
    if (status && typeof status === 'string') {
      tasks = tasks.filter(task => task.status === status)
    }

    // Фильтр по эпику
    if (epic) {
      const epicFilter = epic === 'null' ? null : epic
      tasks = tasks.filter(task => task.epic === epicFilter)
    }

    // Пагинация
    const pageNum = Math.max(1, parseInt(page as string) || 1)
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10))
    const startIndex = (pageNum - 1) * limitNum
    const endIndex = startIndex + limitNum
    const paginatedTasks = tasks.slice(startIndex, endIndex)

    res.json({
      success: true,
      data: paginatedTasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: tasks.length,
        pages: Math.ceil(tasks.length / limitNum)
      },
      filters: {
        search: search || null,
        tags: tags || null,
        status: status || null,
        epic: epic || null
      }
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