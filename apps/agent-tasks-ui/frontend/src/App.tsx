/**
 * Главный компонент приложения Agent Tasks UI
 */
import { useState, useEffect } from 'react'
import { AppShell, Title, Container, Stack } from '@mantine/core'
import { Navigation } from './components/Navigation'
import { Dashboard } from './components/Dashboard'
import { EpicList } from './components/EpicList'
import { TasksPage } from './components/TasksPage'
import {
  getAllTasks, 
  getAllEpics, 
  getManagerState,
  AgentTask,
  Epic,
  ManagerState 
} from './services/apiService'

function App() {
  // Состояние приложения
  const [activeTab, setActiveTab] = useState('dashboard')
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [epics, setEpics] = useState<Epic[]>([])
  const [managerState, setManagerState] = useState<ManagerState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Загрузка данных при монтировании компонента
   */
  useEffect(() => {
    loadData()
  }, [])

  /**
   * Загрузка всех данных из API
   */
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


  /**
   * Обработчик клика по эпику
   */
  const handleEpicClick = (epic: Epic) => {
    console.log('Clicked epic:', epic)
    // TODO: Реализовать переход к деталям эпика
  }

  /**
   * Рендер содержимого в зависимости от активной вкладки
   */
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            managerState={managerState}
            tasks={tasks}
            epics={epics}
            loading={loading}
            error={error}
          />
        )
      case 'tasks':
        return (
          <TasksPage />
        )
      case 'epics':
        return (
          <EpicList
            epics={epics}
            loading={loading}
            error={error}
            onEpicClick={handleEpicClick}
          />
        )
      default:
        return null
    }
  }

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
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      </AppShell.Navbar>

      {/* Основное содержимое */}
      <AppShell.Main>
        <Container size="xl">
          <Stack gap="md">
            {renderContent()}
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

export default App