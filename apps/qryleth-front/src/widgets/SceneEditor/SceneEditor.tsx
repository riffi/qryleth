import React from 'react'
import { SceneEditorR3F } from '@/features/scene'

export interface SceneEditorProps {
  /** UUID сцены для загрузки. Если не передан — создаётся новая сцена. */
  uuid?: string
  /** Флаг создания новой сцены. При true — сцена очищается и получает статус draft. */
  isNew?: boolean
  /** Показывать ли правую панель менеджера объектов. */
  showObjectManager?: boolean
}

/**
 * Виджет SceneEditor — точка композиции редактора сцены.
 *
 * Назначение:
 * - инкапсулировать выбор и сборку фич редактора сцены на уровне widgets (FSD);
 * - предоставлять стабильный публичный компонент для страниц (`pages/*`);
 * - постепенно изолировать логику раскладки/панелей в фиче `scene-layout`.
 *
 * На первом этапе виджет делегирует отрисовку существующему компоненту `SceneEditorR3F`.
 * По мере рефакторинга внутренняя композиция будет перемещаться в виджет.
 */
export const SceneEditor: React.FC<SceneEditorProps> = ({ uuid, isNew, showObjectManager = true }) => {
  return (
    <SceneEditorR3F uuid={uuid} isNew={isNew} showObjectManager={showObjectManager} />
  )
}

export default SceneEditor

