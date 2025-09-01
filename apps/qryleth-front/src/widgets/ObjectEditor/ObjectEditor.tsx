import React, { useMemo } from 'react'
import type { GfxObject } from '@/entities/object'
import { ObjectEditorR3F } from '@/features/editor/object'
import { useGlobalPanelState } from '@/features/editor/object/hooks'

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

  // Примечание по onChange/onRequestSave:
  // На первой фазе внедряем только API. Реальная привязка к сторам и событиям сохранения
  // будет реализована на следующих фазах (при унификации layout-стора и тулбаров).

  return (
    <ObjectEditorR3F
      objectData={objectData}
      externalPanelState={panelStateBridge}
      modalMode={mode === 'embedded'}
    />
  )
}

export default ObjectEditor
