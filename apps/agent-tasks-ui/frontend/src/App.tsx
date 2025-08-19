/**
 * Главный компонент приложения Agent Tasks UI
 *
 * В этой версии внедрён маршрутизатор (React Router):
 * - Вся навигация происходит через URL (/, /tasks, /epics, /tasks/:id)
 * - Компонент навигации рендерит ссылки и подсвечивает активный пункт по текущему пути
 * - Списки ведут на детальные страницы, back ведёт на соответствующий маршрут
 */
import { useEffect, useMemo, useState } from 'react'
import { AppShell, Title, Container, Stack } from '@mantine/core'
import { Navigation } from './components/Navigation'
import { Dashboard } from './components/Dashboard'
import { EpicList } from './components/EpicList'
import { TasksPage } from './components/TasksPage'
import { TaskDetailPage } from './pages/TaskDetailPage'
import { NewTaskPage } from './pages/NewTaskPage'
import { EpicDetailPage } from './pages/EpicDetailPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  getAllTasks,
  getAllEpics,
  getManagerState,
  AgentTask,
  Epic,
  ManagerState
} from './services/apiService'

function App() {
  /**
   * Состояние данных верхнего уровня: менеджер, задачи, эпики
   */
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [epics, setEpics] = useState<Epic[]>([])
  const [managerState, setManagerState] = useState<ManagerState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const location = useLocation()

  /**
   * Загрузка всех данных при монтировании
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [tasksData, epicsData, managerData] = await Promise.all([
          getAllTasks(),
          getAllEpics(),
          getManagerState()
        ])

        setTasks(tasksData)
        setEpics(epicsData)
        setManagerState(managerData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  /**
   * Обработчик клика по задаче — ведёт на страницу задачи
   */
  const handleTaskClick = (task: AgentTask) => {
    navigate(`/tasks/${task.id}`)
  }

  /**
   * Обработчик клика по эпику — пока просто лог, при необходимости сделаем /epics/:id
   */
  const handleEpicClick = (epic: Epic) => {
    navigate(`/epics/${epic.id}`)
  }

  /**
   * Активный пункт меню по текущему URL
   */
  const activeTab = useMemo(() => {
    const p = location.pathname
    if (p === '/' || p.startsWith('/dashboard')) return 'dashboard'
    if (p.startsWith('/tasks')) return 'tasks'
    if (p.startsWith('/epics')) return 'epics'
    return 'dashboard'
  }, [location.pathname])

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm' }}
      padding="md"
    >
      {/* Заголовок */}
      <AppShell.Header>
        <Title order={2} p="md">Agent Tasks UI</Title>
      </AppShell.Header>

      {/* Навигация */}
      <AppShell.Navbar p="md">
        <Navigation activeKey={activeTab} />
      </AppShell.Navbar>

      {/* Основное содержимое через маршруты */}
      <AppShell.Main>
        <Container size="xl">
          <Stack gap="md">
            <Routes>
              <Route
                path="/"
                element={
                  <Dashboard
                    managerState={managerState}
                    tasks={tasks}
                    epics={epics}
                    loading={loading}
                    error={error}
                    onTaskClick={handleTaskClick}
                  />
                }
              />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/tasks/new" element={<NewTaskPage />} />
              <Route path="/epics" element={
                <EpicList
                  epics={epics}
                  loading={loading}
                  error={error}
                  onEpicClick={handleEpicClick}
                />
              } />
              <Route path="/epics/:id" element={<EpicDetailPage />} />
              <Route path="/tasks/:id" element={<TaskDetailPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

export default App
