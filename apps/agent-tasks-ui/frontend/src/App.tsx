import { AppShell, Title } from '@mantine/core'

function App() {
  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
    >
      <AppShell.Header>
        <Title order={2} p="md">Agent Tasks UI</Title>
      </AppShell.Header>

      <AppShell.Main>
        <Title order={3}>Добро пожаловать в интерфейс управления агентскими задачами</Title>
      </AppShell.Main>
    </AppShell>
  )
}

export default App