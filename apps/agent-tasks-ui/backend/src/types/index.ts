/**
 * Типы данных для Agent Tasks UI Backend
 */

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