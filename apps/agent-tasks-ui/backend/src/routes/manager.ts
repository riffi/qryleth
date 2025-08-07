/**
 * API роуты для работы с manager-state.json
 */

import { Router } from 'express'
import { getManagerState } from '../services/fileSystemService'

const router = Router()

/**
 * GET /api/manager
 * Получить состояние менеджера задач
 */
router.get('/', async (req, res) => {
  try {
    const managerState = await getManagerState()
    res.json({
      success: true,
      data: managerState
    })
  } catch (error) {
    console.error('Ошибка получения состояния менеджера:', error)
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении состояния менеджера',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    })
  }
})

export default router