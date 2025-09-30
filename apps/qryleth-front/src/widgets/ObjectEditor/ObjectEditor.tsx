import React, { useMemo } from 'react'
import type { GfxObject } from '@/entities/object'
import { ObjectEditorR3F } from '@/features/editor/object'
import { useGlobalPanelState } from '@/features/editor/object/hooks'
import { ObjectEditorLayout } from './Layout'
import { ObjectChatInterface } from '@/features/editor/object/ui/ChatInterface'
import { LeftToolbar as ObjectLeftToolbar, RightToolbar as ObjectRightToolbar } from '@/features/editor/object/toolbar'
import { useSelectedItemType, useSelectedMaterialUuid } from '@/features/editor/object/model/objectStore'
import { useObjectStore } from '@/features/editor/object/model/objectStore'

export interface ObjectEditorProps {
  /**
   * Режим отображения виджета.
   * - 'page' — полноэкранный режим страницы редактора объекта.
   * - 'embedded' — встроенный режим, когда ObjectEditor используется внутри другого редактора (например, SceneEditor).
   */
  mode?: 'page' | 'embedded'

  /**
   * Данные редактируемого графического объекта. Если не передано — инициализируется пустым объектом.
   */
  objectData?: GfxObject

  /**
   * Колбэк, вызываемый при изменении данных объекта (например, при добавлении примитива или изменении материала).
   * Ожидается, что верхний уровень может использовать его для синхронизации состояния или превью.
   */
  onChange?: (next: GfxObject) => void

  /**
   * Колбэк-запрос на сохранение. Виджет не выполняет сохранение самостоятельно, а сообщает наружу, что пользователь инициировал сохранение.
   */
  onRequestSave?: (current: GfxObject) => void

  /**
   * Внешнее состояние панелей (левая/правая), позволяющее синхронизировать раскладку с контейнером.
   * Если не задано — используется собственное глобальное состояние панелей объекта.
   */
  externalLayoutState?: {
    panelState: any
    togglePanel: (panel: any) => void
    showPanel: (panel: any) => void
    hidePanel?: (panel: any) => void
    hideAllPanels?: () => void
    resetPanels?: () => void
  }
}

/**
 * Виджет ObjectEditor — точка композиции редактора объекта.
 *
 * Задачи компонента:
 * - Инкапсулировать существующий рендерер R3F (`ObjectEditorR3F`) и предоставить стабильный API пропсов.
 * - Прокинуть состояние панелей (слева чат/свойства, справа менеджер) из внешнего контейнера или использовать глобальное состояние по умолчанию.
 * - Учитывать режим работы (`mode`): в embedded-режиме скрывается заголовок/хедер в layout.
 */
export const ObjectEditor: React.FC<ObjectEditorProps> = ({
  mode = 'page',
  objectData,
  onChange,
  onRequestSave,
  externalLayoutState,
}) => {
  // Подбираем источник состояния панелей: внешнее (если передано) или собственное глобальное.
  const internalGlobalPanels = useGlobalPanelState()
  const panelStateBridge = useMemo(() => externalLayoutState ?? internalGlobalPanels, [externalLayoutState, internalGlobalPanels])

  // Доступность действия «Свойства»: показываем только при выборе примитива или материала
  const selectedItemType = useSelectedItemType()
  const selectedMaterialUuid = useSelectedMaterialUuid()
  // Кнопка «Свойства» доступна при выборе примитива, группы (одной или нескольких) или материала
  const showPropertiesAction = selectedItemType === 'primitive' || selectedItemType === 'group' || !!selectedMaterialUuid
  // Тип объекта: используем для условного показа генератора/спрайт‑дебага
  const objectType = useObjectStore(s => s.objectType)
  const isTree = objectType === 'tree'
  const isGrass = objectType === 'grass'
  const lodPreviewEnabled = useObjectStore(s => s.lodPreviewEnabled)

  /**
   * Формирует компонент ObjectChatInterface с привязкой к состоянию панелей и экшенам стора.
   *
   * Назначение:
   * - Привязать видимость чата к левой панели (panelState.leftPanel === 'chat').
   * - Обрабатывать сворачивание/разворачивание чата через state‑bridge (hidePanel/showPanel/togglePanel).
   * - Подключить колбэки к zustand‑стоору ObjectEditor для фактических изменений.
   */
  const chatComponent = (
    <ObjectChatInterface
      isVisible={panelStateBridge.panelState?.leftPanel === 'chat'}
      hideHeader={true}
      onVisibilityChange={(visible) => {
        // Скрываем/показываем чат через bridge; если метода нет — используем toggle.
        if (visible) {
          panelStateBridge.showPanel?.('chat') ?? panelStateBridge.togglePanel?.('chat')
        } else {
          panelStateBridge.hidePanel?.('chat') ?? panelStateBridge.togglePanel?.('chat')
        }
      }}
      mode={mode === 'embedded' ? 'modal' : 'page'}
      onPrimitiveAdded={async (primitive) => {
        /**
         * Добавляет примитив в хранилище ObjectEditor и автоматически
         * переключает левую панель на «Свойства» для моментального редактирования.
         */
        try {
          const { useObjectStore } = await import('@/features/editor/object/model/objectStore')
          useObjectStore.getState().addPrimitive(primitive)
          // Гарантированно показываем панель свойств
          if (panelStateBridge.showPanel) {
            panelStateBridge.showPanel('properties')
          } else if (
            panelStateBridge.togglePanel &&
            panelStateBridge.panelState?.leftPanel !== 'properties'
          ) {
            panelStateBridge.togglePanel('properties')
          }
        } catch (e) {
          console.error('Не удалось добавить примитив из чата:', e)
        }
      }}
      onMaterialCreated={async (material) => {
        /**
         * Создаёт материал в хранилище ObjectEditor и выбирает его, чтобы
         * пользователь сразу видел свойства материала.
         */
        try {
          const { useObjectStore } = await import('@/features/editor/object/model/objectStore')
          const uuid = useObjectStore.getState().addMaterial(material)
          useObjectStore.getState().selectMaterial(uuid)
          panelStateBridge.showPanel?.('properties')
        } catch (e) {
          console.error('Не удалось создать материал из чата:', e)
        }
      }}
      onObjectModified={async (modifications) => {
        /**
         * Применяет дельту изменений к хранилищу ObjectEditor.
         * Поддерживает ключи: primitives, materials, primitiveGroups, primitiveGroupAssignments, lighting.
         * Неизменённые части состояния не трогаются.
         */
        try {
          const { useObjectStore } = await import('@/features/editor/object/model/objectStore')
          const s = useObjectStore.getState()
          const m: any = modifications || {}
          if (Array.isArray(m.primitives)) s.setPrimitives(m.primitives)
          if (Array.isArray(m.materials)) s.setMaterials(m.materials)
          if (m.primitiveGroups) s.setPrimitiveGroups(m.primitiveGroups)
          if (m.primitiveGroupAssignments) s.setPrimitiveGroupAssignments(m.primitiveGroupAssignments)
          if (m.lighting) s.setLighting(m.lighting)
        } catch (e) {
          console.error('Не удалось применить модификации объекта из чата:', e)
        }
      }}
    />
  )

  return (
    <ObjectEditorLayout
      objectData={objectData}
      externalPanelState={panelStateBridge}
      hideHeader={mode === 'embedded'}
      chatComponent={chatComponent}
    >
      {/* Тулбары в стиле SceneEditor: вертикальные слева/справа для управления панелями */}
      <ObjectLeftToolbar
        chatCollapsed={panelStateBridge.panelState?.leftPanel !== 'chat'}
        onToggleChat={() => panelStateBridge.togglePanel?.('chat')}
        propertiesCollapsed={panelStateBridge.panelState?.leftPanel !== 'properties'}
        onToggleProperties={() => panelStateBridge.togglePanel?.('properties')}
        showPropertiesAction={showPropertiesAction}
        spriteDebugCollapsed={panelStateBridge.panelState?.leftPanel !== 'spriteDebug'}
        onToggleSpriteDebug={isTree ? () => panelStateBridge.togglePanel?.('spriteDebug') : undefined}
        lodPreviewEnabled={lodPreviewEnabled}
        onToggleLodPreview={() => useObjectStore.getState().setLodPreviewEnabled(!lodPreviewEnabled)}
      />
      <ObjectRightToolbar
        managerCollapsed={panelStateBridge.panelState?.rightPanel !== 'manager'}
        onToggleManager={() => panelStateBridge.togglePanel?.('manager')}
        generatorCollapsed={isTree ? panelStateBridge.panelState?.rightPanel !== 'treeGenerator' : undefined}
        onToggleGenerator={isTree ? () => panelStateBridge.togglePanel?.('treeGenerator') : undefined}
        grassGeneratorCollapsed={isGrass ? panelStateBridge.panelState?.rightPanel !== 'grassGenerator' : undefined}
        onToggleGrassGenerator={isGrass ? () => panelStateBridge.togglePanel?.('grassGenerator') : undefined}
      />
      <ObjectEditorR3F objectData={objectData} />
    </ObjectEditorLayout>
  )
}

export default ObjectEditor
