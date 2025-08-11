/**
 * API роуты для работы с агентскими задачами
 */

import { Router } from 'express'
import {getAllTasks, getEpicTasks, getTaskById, getTaskByIdWithDetailedPhases} from '../services/fileSystemService.js'
import pino from 'pino';

const router = Router()
const logger = pino({ level: 'info' });

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

    // Загружаем все задачи один раз, фильтруем в памяти (I/O дешевле чем многократное чтение)
    let tasks = await getAllTasks()

    logger.info(`Всего задач: ${tasks.length}`)

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
      if (typeof epic === 'string') {
        if (epic === 'null') {
          tasks = tasks.filter(task => task.epic === null)
        } else {
          const epicId = parseInt(epic, 10)
          if (!Number.isNaN(epicId)) {
            tasks = tasks.filter(task => task.epic === epicId)
          }
        }
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
 * Получить конкретную задачу по ID с базовой информацией о фазах
 * Для получения детальной информации о фазах используйте /api/tasks/:id/detailed
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

/**
 * GET /api/tasks/:id/detailed
 * Получить конкретную задачу по ID с детальной информацией о фазах (включая полные отчёты фаз)
 */
router.get('/:id/detailed', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10)

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный ID задачи'
      })
    }

    const task = await getTaskByIdWithDetailedPhases(taskId)

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
    console.error(`Ошибка получения детальной задачи ${req.params.id}:`, error)
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении детальной задачи',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    })
  }
})

export default router
