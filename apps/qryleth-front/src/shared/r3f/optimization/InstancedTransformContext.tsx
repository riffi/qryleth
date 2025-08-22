import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

export type InstanceTransform = {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

type OverridesMap = Record<string, InstanceTransform>

interface InstancedTransformContextValue {
  overrides: OverridesMap
  setOverride: (instanceUuid: string, transform: InstanceTransform) => void
  clearOverride: (instanceUuid: string) => void
  clearAll: () => void
}

const InstancedTransformContext = createContext<InstancedTransformContextValue | null>(null)

/**
 * Провайдер локальных переопределений трансформаций для инстансов InstancedMesh.
 * Используется для мгновенного визуального отклика при перетаскивании gizmo,
 * без изменения глобального Zustand store во время перемещения.
 */
export const InstancedTransformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overrides, setOverrides] = useState<OverridesMap>({})

  const setOverride = useCallback((instanceUuid: string, transform: InstanceTransform) => {
    setOverrides(prev => ({ ...prev, [instanceUuid]: transform }))
  }, [])

  const clearOverride = useCallback((instanceUuid: string) => {
    setOverrides(prev => {
      if (!(instanceUuid in prev)) return prev
      const next = { ...prev }
      delete next[instanceUuid]
      return next
    })
  }, [])

  const clearAll = useCallback(() => setOverrides({}), [])

  const value = useMemo(() => ({ overrides, setOverride, clearOverride, clearAll }), [overrides, setOverride, clearOverride, clearAll])

  return (
    <InstancedTransformContext.Provider value={value}>
      {children}
    </InstancedTransformContext.Provider>
  )
}

/**
 * Хук доступа к локальным переопределениям трансформаций инстансов.
 */
export const useInstancedTransformOverrides = (): InstancedTransformContextValue => {
  const ctx = useContext(InstancedTransformContext)
  if (!ctx) throw new Error('useInstancedTransformOverrides must be used within InstancedTransformProvider')
  return ctx
}

