/**
 * Сервис для работы с API агентских задач
 */
import axios from 'axios'

// Базовая конфигурация axios
const api = axios.create({
  baseURL: 'http://localhost:3002/api',
  timeout: 10000,
})

// Типы данных (дублируем из backend)
export interface AgentTaskPhase {
  phaseNumber: number
  title: string
  status: 'pending' | 'in-progress' | 'completed'
  summary?: string
}

export interface AgentTask {
  id: number
  epic: string | null
  status: 'planned' | 'in-progress' | 'done'
  created: string
  tags: string[]
  title: string
  content: string
  phases: AgentTaskPhase[]
}

export interface Epic {
  id: number
  status: 'planned' | 'in-progress' | 'done'
  created: string
  tags: string[]
  title: string
  content: string
  tasks: number[]
}

export interface ManagerState {
  nextTaskId: number
  version: string
  lastModified: string
  metadata: {
    totalItems: number
    completedTasks: number
    activeEpics: number
  }
}

// API Response типы
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Получить список всех задач
 */
export const getAllTasks = async (): Promise<AgentTask[]> => {
  const response = await api.get<ApiResponse<AgentTask[]>>('/tasks')
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Ошибка загрузки задач')
  }
  return response.data.data
}

/**
 * Получить задачу по ID
 */
export const getTaskById = async (id: number): Promise<AgentTask> => {
  const response = await api.get<ApiResponse<AgentTask>>(`/tasks/${id}`)
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Ошибка загрузки задачи')
  }
  return response.data.data
}

/**
 * Получить список всех эпиков
 */
export const getAllEpics = async (): Promise<Epic[]> => {
  const response = await api.get<ApiResponse<Epic[]>>('/epics')
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Ошибка загрузки эпиков')
  }
  return response.data.data
}

/**
 * Получить эпик по ID
 */
export const getEpicById = async (id: number): Promise<Epic> => {
  const response = await api.get<ApiResponse<Epic>>(`/epics/${id}`)
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Ошибка загрузки эпика')
  }
  return response.data.data
}

/**
 * Получить задачи эпика
 */
export const getEpicTasks = async (epicId: number): Promise<AgentTask[]> => {
  const response = await api.get<ApiResponse<AgentTask[]>>(`/epics/${epicId}/tasks`)
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Ошибка загрузки задач эпика')
  }
  return response.data.data
}

/**
 * Получить состояние менеджера
 */
export const getManagerState = async (): Promise<ManagerState> => {
  const response = await api.get<ApiResponse<ManagerState>>('/manager')
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Ошибка загрузки состояния менеджера')
  }
  return response.data.data
}

/**
 * Проверка работоспособности API
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health')
    return response.status === 200
  } catch {
    return false
  }
}