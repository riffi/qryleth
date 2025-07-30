import React, { useState } from 'react'
import { Tabs, Box } from '@mantine/core'
import { PrimitiveManager } from '../PrimitiveManager/PrimitiveManager.tsx'
import { MaterialManager } from '../MaterialManager/MaterialManager.tsx'

/**
 * Панель управления объектом с вкладками "Примитивы" и "Материалы".
 * Позволяет переключаться между списком примитивов и менеджером материалов.
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
        <MaterialManager />
      </Tabs.Panel>
    </Tabs>
  )
}
