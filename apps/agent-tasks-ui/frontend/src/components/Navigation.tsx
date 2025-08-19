/**
 * Компонент навигации приложения.
 *
 * Переходы выполняются через React Router (ссылки),
 * активный пункт подсвечивается через проп `activeKey`.
 */
import { NavLink as MantineNavLink, Stack, rem } from '@mantine/core'
import { IconChecklist, IconBulb, IconDashboard } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

interface NavigationProps {
  /** Текущий активный раздел для подсветки */
  activeKey?: string
}

export function Navigation({ activeKey }: NavigationProps) {
  const navItems = [
    {
      key: 'dashboard',
      to: '/',
      label: 'Обзор',
      icon: IconDashboard,
      description: 'Общая информация и статистика'
    },
    {
      key: 'tasks',
      to: '/tasks',
      label: 'Задачи',
      icon: IconChecklist,
      description: 'Список всех агентских задач'
    },
    {
      key: 'epics',
      to: '/epics',
      label: 'Эпики',
      icon: IconBulb,
      description: 'Список эпиков и связанных задач'
    }
  ]

  return (
    <Stack gap="xs">
      {navItems.map((item) => (
        <MantineNavLink
          key={item.key}
          component={Link}
          to={item.to}
          active={activeKey === item.key}
          label={item.label}
          description={item.description}
          leftSection={<item.icon style={{ width: rem(16), height: rem(16) }} />}
          variant="subtle"
        />
      ))}
    </Stack>
  )
}
