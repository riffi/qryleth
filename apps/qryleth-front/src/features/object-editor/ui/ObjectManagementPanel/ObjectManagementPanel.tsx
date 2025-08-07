import React, { useState } from 'react';
import { Tabs, Box } from '@mantine/core';
import { PrimitiveManager } from '../PrimitiveManager/PrimitiveManager.tsx';
import { MaterialManager } from '../MaterialManager/MaterialManager.tsx';
import { LightingControlPanel } from '../LightingControlPanel';

/**
 * Панель управления объектом с вкладками "Примитивы" и "Материалы".
 * Высота панели ограничена высотой вьюпорта, поэтому длинные списки
 * прокручиваются внутри самой панели, а не всей страницы или окна редактора.
 */
export const ObjectManagementPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'primitives' | 'materials' | 'lighting'>('primitives');

  const handleTabChange = (value: string | null) => {
    setActiveTab((value as 'primitives' | 'materials' | 'lighting') || 'primitives');
  };

  return (
      // Контейнер занимает всю высоту вьюпорта и не даёт контенту "вывалиться" наружу
      <Box
          style={{
            width: "100%",
            height: 'calc(100vh - 60px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
      >
        <Tabs
            value={activeTab}
            onChange={handleTabChange}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0  }}
        >
          <Tabs.List>
            <Tabs.Tab value="primitives">Примитивы</Tabs.Tab>
            <Tabs.Tab value="materials">Материалы</Tabs.Tab>
            <Tabs.Tab value="lighting">Освещение</Tabs.Tab>
          </Tabs.List>

          {/* flex:1 + overflow:hidden гарантируют, что содержимое не выходит за рамки панели */}
          <Tabs.Panel
              value="primitives"
              style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0  }}
          >
            <PrimitiveManager />
          </Tabs.Panel>
          <Tabs.Panel
              value="materials"
              style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0  }}
          >
            <MaterialManager />
          </Tabs.Panel>
          <Tabs.Panel
              value="lighting"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minHeight: 0, padding: 'var(--mantine-spacing-sm)'  }}
          >
            <LightingControlPanel />
          </Tabs.Panel>
        </Tabs>
      </Box>
  );
};
