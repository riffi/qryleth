/**
 * API роуты для работы с агентскими задачами
 */

import { Router } from 'express'
import {createTask, getAllTasks, getEpicTasks, getTaskById, getTaskByIdWithDetailedPhases, updateTaskById} from '../services/fileSystemService.js'
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

      // Фильтр по статусу (поддерживаем множественные статусы через запятую)
      if (status && typeof status === 'string') {
        const statusList = status.split(',').map(s => s.trim())
        tasks = tasks.filter(task => statusList.includes(task.status))
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

/**
 * POST /api/tasks
 * Создать новую задачу
 * Тело запроса должно содержать:
 * - title: название задачи (строка от 3 символов)
 * - tags?: массив тегов (массив строк, опционально)
 * - content?: markdown содержимое без YAML шапки (опционально; если не передано — будет сгенерирован шаблон)
 * - epic?: номер эпика (число) или null, если задача вне эпика
 */
router.post('/', async (req, res) => {
  try {
    const { title, tags = [], content = '', epic = null } = req.body

    // Валидация входных данных
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Название задачи должно быть строкой от 3 символов'
      })
    }

    if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string')) {
      return res.status(400).json({
        success: false,
        error: 'Теги должны быть массивом строк'
      })
    }

    let epicId: number | null = null
    if (epic !== null && epic !== undefined) {
      if (typeof epic === 'number') {
        epicId = epic
      } else if (typeof epic === 'string' && epic.trim().length > 0) {
        const parsed = parseInt(epic, 10)
        if (!Number.isNaN(parsed)) epicId = parsed
      }
    }

    // Создаём задачу в файловой системе
    const newTask = await createTask({
      title: title.trim(),
      tags: tags.map((t: string) => t.trim()).filter(Boolean),
      content: typeof content === 'string' ? content : '',
      epic: epicId
    })

    res.status(201).json({
      success: true,
      data: newTask,
      message: 'Задача успешно создана'
    })
  } catch (error) {
    console.error('Ошибка создания задачи:', error)
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании задачи',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    })
  }
})

/**
 * PUT /api/tasks/:id
 * Обновить задачу по ID
 * Тело запроса должно содержать:
 * - title: новое название задачи
 * - tags: массив тегов  
 * - content: обновленное markdown содержимое (без YAML шапки)
 */
router.put('/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10)

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный ID задачи'
      })
    }

    const { title, tags, content } = req.body

    // Валидация входных данных
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Название задачи должно быть строкой от 3 символов'
      })
    }

    if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string')) {
      return res.status(400).json({
        success: false,
        error: 'Теги должны быть массивом строк'
      })
    }

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Содержимое задачи должно быть строкой от 10 символов'
      })
    }

    // Проверяем что задача существует
    const existingTask = await getTaskById(taskId)
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        error: 'Задача не найдена'
      })
    }

    // Обновляем задачу
    const updatedTask = await updateTaskById(taskId, {
      title: title.trim(),
      tags: tags.map((tag: string) => tag.trim()),
      content: content.trim()
    })

    if (!updatedTask) {
      return res.status(500).json({
        success: false,
        error: 'Не удалось обновить задачу'
      })
    }

    logger.info(`Задача ${taskId} успешно обновлена`)

    res.json({
      success: true,
      data: updatedTask,
      message: 'Задача успешно обновлена'
    })
  } catch (error) {
    console.error(`Ошибка обновления задачи ${req.params.id}:`, error)
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении задачи',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    })
  }
})

export default router
