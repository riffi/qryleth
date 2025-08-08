/**
 * Общие типы данных для Agent Tasks UI
 * Используются как на фронтенде, так и на бэкенде
 */

export interface AgentTask {
  id: number
  epic: number | null
  status: 'planned' | 'in-progress' | 'done'
  created: string
  tags: string[]
  title: string
  content: string
  phases: AgentTaskPhase[]
}

export interface AgentTaskPhase {
  phaseNumber: number
  title: string
  status: 'planned' | 'in-progress' | 'done'
  summary?: string
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
    activeTasks: number
  }
}