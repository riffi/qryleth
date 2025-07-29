import React, { createContext, useContext } from 'react'
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
    React.PropsWithChildren<SceneObjectManagerContextValue>
> = ({ children, ...value }) => (
    <SceneObjectManagerContext.Provider value={value}>
        {children}
    </SceneObjectManagerContext.Provider>
)
