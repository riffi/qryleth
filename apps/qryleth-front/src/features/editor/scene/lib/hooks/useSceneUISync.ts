import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { useSceneObjectsOptimized, useSceneObjectInstancesOptimized, useSelectionState } from '@/features/editor/scene/model/optimizedSelectors'
import { useUISync, useRealTimeSync } from '@/shared/lib/hooks/useUISync'

/**
 * Хук-обёртка для подключения синхронизации UI и сцены в рамках фичи scene.
 * Использует store сцены и передаёт данные в общий механизм useUISync.
 */
export const useSceneUISync = (): void => {
  const objects = useSceneObjectsOptimized()
  const objectInstances = useSceneObjectInstancesOptimized()
  const { selectedObject, hoveredObject } = useSelectionState()

  const actions = useSceneStore.getState()

  useUISync({
    objects,
    objectInstances,
    selectedObject,
    hoveredObject,
    actions: {
      selectObject: actions.selectObject,
      clearSelection: actions.clearSelection,
      setHoveredObject: actions.setHoveredObject,
      clearHover: actions.clearHover,
      markSceneAsModified: actions.markSceneAsModified
    }
  })
}

/**
 * Хук для трансляции всех изменений store сцены в UI в реальном времени.
 */
export const useSceneRealTimeSync = (): void => {
  useRealTimeSync(useSceneStore)
}

