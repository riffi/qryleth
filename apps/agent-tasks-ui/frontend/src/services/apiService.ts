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
  status: 'planned' | 'in-progress' | 'done'
  summary?: string
}

export interface AgentTask {
  id: number
  epic: number | null
  status: 'planned' | 'in-progress' | 'done'
  created: string
  tags: string[]
  title: string
  content: string
  phases: AgentTaskPhase[]
  folderName?: string
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
    activeTasks?: number
  }
}

// API Response типы
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Специальный тип для ответа /api/tasks с пагинацией
interface TasksApiResponse {
  success: boolean
  data: AgentTask[]
  pagination: PaginationInfo
  filters: {
    search: string | null
    tags: string | null
    status: string | null
    epic: string | null
  }
  error?: string
  message?: string
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

export interface TasksResponse {
  data: AgentTask[]
  pagination: PaginationInfo
  filters: {
    search: string | null
    tags: string | null
    status: string | null
    epic: string | null
  }
}

export interface TaskFilters {
  search?: string
  tags?: string[]
  status?: string
  epic?: string
  showCompleted?: boolean
  page?: number
  limit?: number
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
 * Получить задачи с фильтрами и пагинацией
 */
export const getTasksWithFilters = async (filters: TaskFilters): Promise<TasksResponse> => {
  const params = new URLSearchParams()

  if (filters.search) params.append('search', filters.search)
  if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','))
  
  // Логика статуса: если не выбран статус и не показываем выполненные, то только активные
  if (filters.status) {
    params.append('status', filters.status)
  } else if (!filters.showCompleted) {
    // По умолчанию показываем только активные задачи
    params.append('status', 'planned,in-progress')
  }
  
  if (filters.epic) params.append('epic', filters.epic)
  if (filters.page) params.append('page', filters.page.toString())
  if (filters.limit) params.append('limit', filters.limit.toString())

  const response = await api.get<TasksApiResponse>(`/tasks?${params.toString()}`)
  if (!response.data.success) {
    throw new Error(response.data.error || 'Ошибка загрузки задач')
  }
  return {
    data: response.data.data,
    pagination: response.data.pagination,
    filters: response.data.filters
  }
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
 * Получить задачу по ID с детальной информацией о фазах
 */
export const getTaskByIdDetailed = async (id: number): Promise<AgentTask> => {
  const response = await api.get<ApiResponse<AgentTask>>(`/tasks/${id}/detailed`)
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Ошибка загрузки детальной задачи')
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
 * Обновить задачу по ID
 */
export const updateTask = async (
  id: number,
  updates: { title: string; tags: string[]; content: string }
): Promise<AgentTask> => {
  const response = await api.put<ApiResponse<AgentTask>>(`/tasks/${id}`, updates)
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Ошибка обновления задачи')
  }
  return response.data.data
}

/**
 * Создать новую задачу
 */
export const createTask = async (payload: {
  title: string
  tags?: string[]
  content?: string
  epic?: number | null
}): Promise<AgentTask> => {
  const response = await api.post<ApiResponse<AgentTask>>('/tasks', payload)
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Ошибка создания задачи')
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
