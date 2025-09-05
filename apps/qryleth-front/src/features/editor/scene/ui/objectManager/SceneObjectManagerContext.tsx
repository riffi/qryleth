import React, { createContext, useContext, useMemo } from 'react'
import type { SceneObjectManagerContextValue } from './types.ts'

/**
 * Контекст менеджера объектов сцены.
 * Предоставляет доступ к общим данным без передачи через пропсы.
 */
export const SceneObjectManagerContext =
    createContext<SceneObjectManagerContextValue | null>(null)

/**
 * Хук для получения контекста SceneObjectManager.
 * Выбрасывает ошибку, если контекст не инициализирован.
 */
export const useSceneObjectManager = (): SceneObjectManagerContextValue => {
    const ctx = useContext(SceneObjectManagerContext)
    if (!ctx) {
        throw new Error('SceneObjectManagerContext не инициализирован')
    }
    return ctx
}

/**
 * Провайдер контекста менеджера объектов сцены.
 * Принимает значение контекста и делает его доступным детям.
 */
export const SceneObjectManagerProvider: React.FC<
  React.PropsWithChildren<{ value: SceneObjectManagerContextValue }>
> = ({ children, value }) => {
  /**
   * Мемоизируем значение контекста для предотвращения каскадных перерендеров
   * всех потребителей при неизменных данных. Контекст будет обновляться
   * только при изменении ссылки на объект `value`, который формируется выше по дереву
   * (в SceneObjectManager) через useMemo/useCallback.
   */
  const memoValue = useMemo(() => value, [value])

  return (
    <SceneObjectManagerContext.Provider value={memoValue}>
      {children}
    </SceneObjectManagerContext.Provider>
  )
}
