import React, { createContext, useContext, useState, ReactNode } from 'react'

interface FpsContextType {
  fps: number
  setFps: (fps: number) => void
}

const FpsContext = createContext<FpsContextType | undefined>(undefined)

interface FpsProviderProps {
  children: ReactNode
}

/**
 * Провайдер контекста для передачи FPS из Canvas наружу.
 * Позволяет компонентам внутри Canvas обновлять значение FPS,
 * а компонентам вне Canvas - отображать его.
 */
export const FpsProvider: React.FC<FpsProviderProps> = ({ children }) => {
  const [fps, setFps] = useState<number>(0)

  return (
    <FpsContext.Provider value={{ fps, setFps }}>
      {children}
    </FpsContext.Provider>
  )
}

/**
 * Хук для использования FPS контекста.
 * Позволяет получить текущий FPS и функцию для его обновления.
 */
export const useFpsContext = (): FpsContextType => {
  const context = useContext(FpsContext)
  if (!context) {
    throw new Error('useFpsContext must be used within a FpsProvider')
  }
  return context
}