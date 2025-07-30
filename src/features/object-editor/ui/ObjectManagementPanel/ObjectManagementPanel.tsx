import React, { useState } from 'react';
import { Tabs, Box } from '@mantine/core';
import { PrimitiveManager } from '../PrimitiveManager/PrimitiveManager.tsx';
import { MaterialManager } from '../MaterialManager/MaterialManager.tsx';

/**
 * Панель управления объектом с вкладками "Примитивы" и "Материалы".
 * Высота панели ограничена высотой вьюпорта, поэтому длинные списки
 * прокручиваются внутри самой панели, а не всей страницы или окна редактора.
 */
export const ObjectManagementPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'primitives' | 'materials'>('primitives');

  const handleTabChange = (value: string | null) => {
    setActiveTab((value as 'primitives' | 'materials') || 'primitives');
  };

  return (
      // Контейнер занимает всю высоту вьюпорта и не даёт контенту "вывалиться" наружу
      <Box
          style={{
            width: 280,
            height: 'calc(100vh-60px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
      >
        <Tabs
            value={activeTab}
            onChange={handleTabChange}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          <Tabs.List>
            <Tabs.Tab value="primitives">Примитивы</Tabs.Tab>
            <Tabs.Tab value="materials">Материалы</Tabs.Tab>
          </Tabs.List>

          {/* flex:1 + overflow:hidden гарантируют, что содержимое не выходит за рамки панели */}
          <Tabs.Panel
              value="primitives"
              style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
          >
            <PrimitiveManager />
          </Tabs.Panel>
          <Tabs.Panel
              value="materials"
              style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
          >
            <MaterialManager />
          </Tabs.Panel>
        </Tabs>
      </Box>
  );
};
