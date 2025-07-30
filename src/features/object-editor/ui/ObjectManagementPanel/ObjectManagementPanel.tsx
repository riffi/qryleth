import React, { useState } from 'react'
import { Tabs, Box } from '@mantine/core'
import { PrimitiveManager } from '../PrimitiveManager/PrimitiveManager.tsx'

/**
 * Панель управления объектом с вкладками "Примитивы" и "Материалы".
 * Вкладка "Материалы" пока содержит только заглушку.
 */
export const ObjectManagementPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'primitives' | 'materials'>('primitives')

  /**
   * Изменение активной вкладки панели управления.
   * @param value идентификатор выбранной вкладки
   */
  const handleTabChange = (value: string | null) => {
    setActiveTab((value as 'primitives' | 'materials') || 'primitives')
  }

  return (
    <Tabs value={activeTab} onChange={handleTabChange}>
      <Tabs.List>
        <Tabs.Tab value="primitives">Примитивы</Tabs.Tab>
        <Tabs.Tab value="materials">Материалы</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="primitives">
        <PrimitiveManager />
      </Tabs.Panel>
      <Tabs.Panel value="materials">
        <Box p="md">Материалы</Box>
      </Tabs.Panel>
    </Tabs>
  )
}
