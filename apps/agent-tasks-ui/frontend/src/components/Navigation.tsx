/**
 * Компонент навигации приложения
 */
import { NavLink, Stack, rem } from '@mantine/core'
import { IconChecklist, IconBulb, IconDashboard } from '@tabler/icons-react'

interface NavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const navItems = [
    {
      key: 'dashboard',
      label: 'Обзор',
      icon: IconDashboard,
      description: 'Общая информация и статистика'
    },
    {
      key: 'tasks',
      label: 'Задачи', 
      icon: IconChecklist,
      description: 'Список всех агентских задач'
    },
    {
      key: 'epics',
      label: 'Эпики',
      icon: IconBulb,
      description: 'Список эпиков и связанных задач'
    }

  ]

  return (
    <Stack gap="xs">
      {navItems.map((item) => (
        <NavLink
          key={item.key}
          active={activeTab === item.key}
          label={item.label}
          description={item.description}
          leftSection={<item.icon style={{ width: rem(16), height: rem(16) }} />}
          onClick={() => onTabChange(item.key)}
          variant="subtle"
        />
      ))}
    </Stack>
  )
}