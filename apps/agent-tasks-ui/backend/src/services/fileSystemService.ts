/**
 * Сервис для работы с файловой системой agent-content
 * Обеспечивает чтение и парсинг markdown файлов с YAML метаданными
 */

import { promises as fs } from 'fs'
import * as path from 'path'
import matter from 'gray-matter'
import { AgentTask, Epic, ManagerState, AgentTaskPhase } from '../types/index.js'

/**
 * Базовый путь к папке agent-content от корня проекта
 */
const AGENT_CONTENT_PATH = path.resolve(process.cwd(), '../../../agent-content')

/**
 * Путь к manager-state.json
 */
const MANAGER_STATE_PATH = path.join(AGENT_CONTENT_PATH, 'agent-tasks', 'manager-state.json')

/**
 * Читает и парсит manager-state.json
 */
export async function getManagerState(): Promise<ManagerState> {
  try {
    const content = await fs.readFile(MANAGER_STATE_PATH, 'utf-8')
    return JSON.parse(content) as ManagerState
  } catch (error) {
    throw new Error(`Ошибка чтения manager-state.json: ${error}`)
  }
}

/**
 * Читает и парсит markdown файл с YAML front matter
 */
async function parseMarkdownFile(filePath: string): Promise<{ data: any; content: string }> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const parsed = matter(fileContent)
    return {
      data: parsed.data,
      content: parsed.content.trim()
    }
  } catch (error) {
    throw new Error(`Ошибка чтения файла ${filePath}: ${error}`)
  }
}

/**
 * Получает список всех папок в директории
 */
async function getDirectories(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
  } catch (error) {
    return []
  }
}

/**
 * Читает информацию о фазах задачи из раздела "Список фаз" в AGENT_TASK_SUMMARY.md
 * Это более эффективно для списочного отображения задач, чем чтение всех файлов отчётов фаз
 */
async function parseTaskPhasesFromSummary(summaryContent: string): Promise<AgentTaskPhase[]> {
  const phases: AgentTaskPhase[] = []
  
  // Ищем раздел "Список фаз"
  const phasesListMatch = summaryContent.match(/##\s+Список фаз\s*\n([\s\S]*?)(?:\n##\s+Технические требования|\n##\s+[А-Яа-яA-Za-z]|\n---\s*$|$)/i)
  if (!phasesListMatch) {
    return phases
  }

  const phasesSection = phasesListMatch[1]
  
  // Парсим каждую фазу по паттерну: ### (⏳|✅) Фаза N: Заголовок или ## ✅ Фаза N: Заголовок
  const phaseMatches = [...phasesSection.matchAll(/(#{2,3})\s+(⏳|✅)\s*Фаза\s+(\d+(?:\.\d+)?)\s*:\s*([^\n\r-]+)/gi)]
  
  for (const match of phaseMatches) {
    const statusIcon = match[2]
    const phaseNumber = parseFloat(match[3])
    const title = match[4].trim()
    
    // Определяем статус по иконке
    let status: 'planned' | 'in-progress' | 'done' = 'planned'
    if (statusIcon === '✅') {
      status = 'done'
    } else if (statusIcon === '⏳') {
      status = 'planned'
    }
    
    phases.push({
      phaseNumber,
      title: `Фаза ${phaseNumber}: ${title}`,
      status,
      summary: ''
    })
  }

  return phases.sort((a, b) => a.phaseNumber - b.phaseNumber)
}

/**
 * Читает детальную информацию о фазах задачи из файлов отчётов (используется для детального просмотра задачи)
 */
async function readDetailedTaskPhases(taskPath: string): Promise<AgentTaskPhase[]> {
  const phasesPath = path.join(taskPath, 'phases')

  try {
    const phaseFiles = await fs.readdir(phasesPath)
    const phases: AgentTaskPhase[] = []

    for (const fileName of phaseFiles) {
      if (fileName.startsWith('phase_') && fileName.endsWith('_summary.md')) {
        const match = fileName.match(/phase_(\d+(?:\.\d+)?)_summary\.md/)
        if (match) {
          const phaseNumber = parseFloat(match[1])
          const filePath = path.join(phasesPath, fileName)

          try {
            const { data, content } = await parseMarkdownFile(filePath)

            // Заголовок: либо из YAML, либо из первого H1
            const titleFromH1Match = content.match(/^#\s+(.+)$/m)
            const title = (data?.title as string) || (titleFromH1Match ? titleFromH1Match[1].trim() : `Фаза ${phaseNumber}`)

            // Статус строго из YAML; fallback — эвристика по контенту
            let status: 'planned' | 'in-progress' | 'done' = (data?.status as any) || 'planned'
            if (!data?.status) {
              if (content.includes('✅ Выполнено') || content.includes('**Статус**: ✅') || content.match(/\b(ВЫПОЛНЕНО|done)\b/i)) {
                status = 'done'
              } else if (content.includes('⏳ В процессе') || content.includes('**Статус**: ⏳') || content.match(/\b(in-progress|в процессе)\b/i)) {
                status = 'in-progress'
              }
            }

            phases.push({
              phaseNumber,
              title,
              status,
              summary: content
            })
          } catch (error) {
            console.warn(`Не удалось прочитать фазу ${fileName}: ${error}`)
          }
        }
      }
    }

    // Сортируем фазы по номеру
    return phases.sort((a, b) => a.phaseNumber - b.phaseNumber)
  } catch (error) {
    return []
  }
}

/**
 * Читает все задачи из директории tasks
 */
export async function getAllTasks(): Promise<AgentTask[]> {
  const tasksPath = path.join(AGENT_CONTENT_PATH, 'agent-tasks', 'tasks')
  const tasks: AgentTask[] = []

  try {
    const taskDirs = await getDirectories(tasksPath)

    for (const taskDir of taskDirs) {
      const taskPath = path.join(tasksPath, taskDir)
      const summaryPath = path.join(taskPath, 'AGENT_TASK_SUMMARY.md')

      try {
        const { data, content } = await parseMarkdownFile(summaryPath)
        const phases = await parseTaskPhasesFromSummary(content)

        // Извлекаем заголовок
        const title = data.title ?  `Задача ${data.id}. ${data.title.trim()}` : `Задача ${data.id || taskDir}`

        // Эпик: поддерживаем либо относительный путь 'epic: ../epic.md', либо число
        let epicId: number | null = null
        if (typeof data.epic === 'number') {
          epicId = data.epic
        } else if (typeof data.epic === 'string') {
          const epicPathMatch = data.epic.match(/epics\/(\d+)-/)
          if (epicPathMatch) {
            epicId = parseInt(epicPathMatch[1], 10)
          }
        }

        const task: AgentTask = {
          id: data.id || 0,
          epic: epicId,
          status: (data.status as any) || 'planned',
          created: data.created || new Date().toISOString().split('T')[0],
          tags: Array.isArray(data.tags) ? data.tags : [],
          title,
          content,
          phases,
          folderName: taskDir
        }

        tasks.push(task)
      } catch (error) {
        console.warn(`Не удалось прочитать задачу ${taskDir}: ${error}`)
      }
    }
  } catch (error) {
    throw new Error(`Ошибка чтения папки задач: ${error}`)
  }

  // Дополнительно: собираем задачи, находящиеся в эпиках: agent-tasks/epics/*/tasks
  const epicsPath = path.join(AGENT_CONTENT_PATH, 'agent-tasks', 'epics')
  try {
    const epicDirs = await getDirectories(epicsPath)
    for (const epicDir of epicDirs) {
      const epicPath = path.join(epicsPath, epicDir)
      const epicFilePath = path.join(epicPath, 'epic.md')
      try {
        const { data: epicData } = await parseMarkdownFile(epicFilePath)
        const epicIdFromFile = typeof epicData.id === 'number' ? epicData.id : null

        const epicTasksPath = path.join(epicPath, 'tasks')
        const epicTaskDirs = await getDirectories(epicTasksPath)
        for (const taskDir of epicTaskDirs) {
          const taskPath = path.join(epicTasksPath, taskDir)
          const summaryPath = path.join(taskPath, 'AGENT_TASK_SUMMARY.md')
          try {
            const { data: taskData, content } = await parseMarkdownFile(summaryPath)
            const phases = await parseTaskPhasesFromSummary(content)

            const title = taskData.title ?  `Задача ${taskData.id}. ${taskData.title.trim()}` : `Задача ${taskData.id || taskDir}`

            // Определяем ID эпика: приоритет YAML-числу, затем ID эпика из файла, затем парс пути
            let epicId: number | null = null
            if (typeof taskData.epic === 'number') {
              epicId = taskData.epic
            } else if (epicIdFromFile !== null) {
              epicId = epicIdFromFile
            } else if (typeof taskData.epic === 'string') {
              const epicPathMatch = taskData.epic.match(/epics\/(\d+)-/)
              if (epicPathMatch) {
                epicId = parseInt(epicPathMatch[1], 10)
              }
            }

            tasks.push({
              id: taskData.id || 0,
              epic: epicId,
              status: (taskData.status as any) || 'planned',
              created: taskData.created || new Date().toISOString().split('T')[0],
              tags: Array.isArray(taskData.tags) ? taskData.tags : [],
              title,
              content,
              phases,
              folderName: taskDir
            })
          } catch (error) {
            console.warn(`Не удалось прочитать задачу эпика ${taskDir}: ${error}`)
          }
        }
      } catch (error) {
        console.warn(`Не удалось прочитать эпик ${epicDir}: ${error}`)
      }
    }
  } catch (error) {
    console.warn(`Ошибка чтения папки эпиков: ${error}`)
  }

  return tasks.sort((a, b) => a.id - b.id)
}

/**
 * Читает конкретную задачу по ID (с базовой информацией о фазах для списков)
 */
export async function getTaskById(id: number): Promise<AgentTask | null> {
  const tasks = await getAllTasks()
  return tasks.find(task => task.id === id) || null
}

/**
 * Читает конкретную задачу по ID с детальной информацией о фазах (для детального просмотра)
 */
export async function getTaskByIdWithDetailedPhases(id: number): Promise<AgentTask | null> {
  const tasks = await getAllTasks()
  const task = tasks.find(task => task.id === id)
  
  if (!task) {
    return null
  }
  
  // Находим путь к задаче и читаем детальные фазы
  const tasksPath = path.join(AGENT_CONTENT_PATH, 'agent-tasks', 'tasks')
  const epicsPath = path.join(AGENT_CONTENT_PATH, 'agent-tasks', 'epics')
  
  let taskPath: string | null = null
  
  // Ищем в обычных задачах
  const taskDirs = await getDirectories(tasksPath)
  for (const taskDir of taskDirs) {
    const summaryPath = path.join(tasksPath, taskDir, 'AGENT_TASK_SUMMARY.md')
    try {
      const { data } = await parseMarkdownFile(summaryPath)
      if (data.id === id) {
        taskPath = path.join(tasksPath, taskDir)
        break
      }
    } catch (error) {
      continue
    }
  }
  
  // Если не найдена в обычных задачах, ищем в эпиках
  if (!taskPath) {
    const epicDirs = await getDirectories(epicsPath)
    for (const epicDir of epicDirs) {
      const epicTasksPath = path.join(epicsPath, epicDir, 'tasks')
      const epicTaskDirs = await getDirectories(epicTasksPath)
      for (const taskDir of epicTaskDirs) {
        const summaryPath = path.join(epicTasksPath, taskDir, 'AGENT_TASK_SUMMARY.md')
        try {
          const { data } = await parseMarkdownFile(summaryPath)
          if (data.id === id) {
            taskPath = path.join(epicTasksPath, taskDir)
            break
          }
        } catch (error) {
          continue
        }
      }
      if (taskPath) break
    }
  }
  
  if (!taskPath) {
    return task // Возвращаем базовую задачу, если не можем найти файлы
  }
  
  // Читаем детальные фазы
  const detailedPhases = await readDetailedTaskPhases(taskPath)
  
  return {
    ...task,
    phases: detailedPhases
  }
}

/**
 * Читает все эпики из директории epics
 */
export async function getAllEpics(): Promise<Epic[]> {
  const epicsPath = path.join(AGENT_CONTENT_PATH, 'agent-tasks', 'epics')
  const epics: Epic[] = []

  try {
    const epicDirs = await getDirectories(epicsPath)

    for (const epicDir of epicDirs) {
      const epicPath = path.join(epicsPath, epicDir)
      const epicFilePath = path.join(epicPath, 'epic.md')

      try {
        const { data, content } = await parseMarkdownFile(epicFilePath)

        // Извлекаем заголовок из контента
        const titleMatch = content.match(/^#\s+(.+)$/m)
        const title = titleMatch ? titleMatch[1].trim() : `Эпик ${data.id || epicDir}`

        // Читаем задачи эпика
        const tasksPath = path.join(epicPath, 'tasks')
        const epicTaskDirs = await getDirectories(tasksPath)
        const taskIds: number[] = []

        for (const taskDir of epicTaskDirs) {
          const taskSummaryPath = path.join(tasksPath, taskDir, 'AGENT_TASK_SUMMARY.md')
          try {
            const { data: taskData } = await parseMarkdownFile(taskSummaryPath)
            if (taskData.id) {
              taskIds.push(taskData.id)
            }
          } catch (error) {
            console.warn(`Не удалось прочитать задачу эпика ${taskDir}: ${error}`)
          }
        }

        const epic: Epic = {
          id: data.id || 0,
          status: data.status || 'planned',
          created: data.created || new Date().toISOString().split('T')[0],
          tags: Array.isArray(data.tags) ? data.tags : [],
          title,
          content,
          tasks: taskIds.sort()
        }

        epics.push(epic)
      } catch (error) {
        console.warn(`Не удалось прочитать эпик ${epicDir}: ${error}`)
      }
    }
  } catch (error) {
    throw new Error(`Ошибка чтения папки эпиков: ${error}`)
  }

  return epics.sort((a, b) => a.id - b.id)
}

/**
 * Читает задачи эпика из подпапки epics/{epic}/tasks
 */
export async function getEpicTasks(epicId: number): Promise<AgentTask[]> {
  const epicsPath = path.join(AGENT_CONTENT_PATH, 'agent-tasks', 'epics')
  const epicDirs = await getDirectories(epicsPath)

  for (const epicDir of epicDirs) {
    const epicPath = path.join(epicsPath, epicDir)
    const epicFilePath = path.join(epicPath, 'epic.md')

    try {
      const { data } = await parseMarkdownFile(epicFilePath)
      if (data.id === epicId) {
        // Нашли нужный эпик, читаем его задачи
        const tasksPath = path.join(epicPath, 'tasks')
        const epicTasks: AgentTask[] = []

        try {
          const taskDirs = await getDirectories(tasksPath)

          for (const taskDir of taskDirs) {
            const taskPath = path.join(tasksPath, taskDir)
            const summaryPath = path.join(taskPath, 'AGENT_TASK_SUMMARY.md')

            try {
              const { data: taskData, content } = await parseMarkdownFile(summaryPath)
              const phases = await parseTaskPhasesFromSummary(content)

              const titleMatch = content.match(/^#\s+(.+)$/m)
              const title = titleMatch ? titleMatch[1].trim() : `Задача ${taskData.id || taskDir}`

              // Извлечение ID эпика из пути файла epic.md
              let epicTaskId: number | null = null
              if (taskData.epic && typeof taskData.epic === 'string') {
                const epicPathMatch = taskData.epic.match(/epics\/(\d+)-/)
                if (epicPathMatch) {
                  epicTaskId = parseInt(epicPathMatch[1], 10)
                }
              }

              const task: AgentTask = {
                id: taskData.id || 0,
                epic: epicTaskId,
                status: taskData.status || 'planned',
                created: taskData.created || new Date().toISOString().split('T')[0],
                tags: Array.isArray(taskData.tags) ? taskData.tags : [],
                title,
                content,
                phases,
                folderName: taskDir
              }

              epicTasks.push(task)
            } catch (error) {
              console.warn(`Не удалось прочитать задачу эпика ${taskDir}: ${error}`)
            }
          }
        } catch (error) {
          console.warn(`Не удалось прочитать папку задач эпика ${epicId}: ${error}`)
        }

        return epicTasks.sort((a, b) => a.id - b.id)
      }
    } catch (error) {
      console.warn(`Не удалось прочитать эпик ${epicDir}: ${error}`)
    }
  }

  return []
}

/**
 * Обновляет задачу по ID, сохраняя изменения в исходный markdown файл
 * @param id ID задачи для обновления
 * @param updates Объект с обновлениями (title, tags, content)
 * @returns Обновленную задачу или null если задача не найдена
 */
export async function updateTaskById(
  id: number, 
  updates: { title: string; tags: string[]; content: string }
): Promise<AgentTask | null> {
  try {
    // Сначала находим задачу и её файл
    const tasks = await getAllTasks()
    const task = tasks.find(t => t.id === id)
    
    if (!task) {
      return null
    }

    // Определяем путь к файлу задачи
    let taskFilePath: string | null = null
    
    // Ищем в обычных задачах
    const tasksPath = path.join(AGENT_CONTENT_PATH, 'agent-tasks', 'tasks')
    const taskDirs = await getDirectories(tasksPath)
    
    for (const taskDir of taskDirs) {
      const summaryPath = path.join(tasksPath, taskDir, 'AGENT_TASK_SUMMARY.md')
      try {
        const { data } = await parseMarkdownFile(summaryPath)
        if (data.id === id) {
          taskFilePath = summaryPath
          break
        }
      } catch (error) {
        continue
      }
    }
    
    // Если не найдена в обычных задачах, ищем в эпиках
    if (!taskFilePath) {
      const epicsPath = path.join(AGENT_CONTENT_PATH, 'agent-tasks', 'epics')
      const epicDirs = await getDirectories(epicsPath)
      
      for (const epicDir of epicDirs) {
        const epicTasksPath = path.join(epicsPath, epicDir, 'tasks')
        const epicTaskDirs = await getDirectories(epicTasksPath)
        
        for (const taskDir of epicTaskDirs) {
          const summaryPath = path.join(epicTasksPath, taskDir, 'AGENT_TASK_SUMMARY.md')
          try {
            const { data } = await parseMarkdownFile(summaryPath)
            if (data.id === id) {
              taskFilePath = summaryPath
              break
            }
          } catch (error) {
            continue
          }
        }
        if (taskFilePath) break
      }
    }
    
    if (!taskFilePath) {
      throw new Error(`Не удалось найти файл задачи с ID ${id}`)
    }

    // Читаем существующий файл
    const { data: existingData, content: existingContent } = await parseMarkdownFile(taskFilePath)
    
    // Извлекаем чистый заголовок из обновлений (убираем префикс "Задача N.")
    const titleMatch = updates.title.match(/^Задача \d+\.\s*(.+)$/)
    const cleanTitle = titleMatch ? titleMatch[1].trim() : updates.title.trim()
    
    // Формируем обновленные YAML метаданные
    const updatedData = {
      ...existingData,
      title: cleanTitle,
      tags: updates.tags,
      updated: new Date().toISOString().split('T')[0] // Обновляем дату изменения
    }
    
    // Создаем новый контент файла с обновленными YAML метаданными
    const yamlString = Object.entries(updatedData)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return `${key}: []`
          }
          // Правильное форматирование массивов в YAML
          return `${key}: [${value.map(item => typeof item === 'string' ? item : `${item}`).join(', ')}]`
        }
        if (typeof value === 'string') {
          // Экранируем строки с специальными символами
          if (value.includes(':') || value.includes('"') || value.includes('[') || value.includes(']') || value.includes('#')) {
            return `${key}: "${value.replace(/"/g, '\\"')}"`
          }
        }
        if (value === null) {
          return `${key}: null`
        }
        if (typeof value === 'object') {
          // Для объектов phases используем правильное YAML форматирование
          if (key === 'phases' && value && typeof value === 'object') {
            const phaseObj = value as { total?: number; completed?: number }
            return `${key}:\n  total: ${phaseObj.total || 0}\n  completed: ${phaseObj.completed || 0}`
          }
        }
        return `${key}: ${value}`
      })
      .join('\n')
    
    const fullContent = `---\n${yamlString}\n---\n\n${updates.content}`
    
    // Сохраняем обновленный файл с правильной кодировкой
    await fs.writeFile(taskFilePath, fullContent, { encoding: 'utf8' })
    
    // Возвращаем обновленную задачу
    return {
      ...task,
      title: `Задача ${id}. ${cleanTitle}`,
      tags: updates.tags,
      content: updates.content
    }
    
  } catch (error) {
    console.error(`Ошибка обновления задачи ${id}:`, error)
    throw error
  }
}
