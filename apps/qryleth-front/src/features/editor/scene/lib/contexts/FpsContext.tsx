import React, { createContext, useContext, useState, ReactNode } from 'react'

interface FpsStats {
  drawCalls: number
  programs: number
  triangles: number
  textures: number
  geometries: number
  memory: { geometries: number; textures: number }
}

interface FpsContextType {
  /** Моментальный FPS (последнее усреднённое окно) */
  fps: number
  /** Средний FPS по истории */
  avgFps: number
  /** История значений FPS (для графика) */
  history: number[]
  /** Среднее время кадра (ms) по последнему окну */
  frameMs: number
  /** Рендер‑метрики WebGLRenderer */
  stats: FpsStats
  /** Установить текущий FPS и метрики (из useFpsCounter) */
  setFpsStats: (payload: { fps: number; frameMs: number; stats: FpsStats }) => void
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
  const [history, setHistory] = useState<number[]>([])
  const [frameMs, setFrameMs] = useState<number>(0)
  const [stats, setStats] = useState<FpsStats>({ drawCalls: 0, programs: 0, triangles: 0, textures: 0, geometries: 0, memory: { geometries: 0, textures: 0 } })

  const setFpsStats: FpsContextType['setFpsStats'] = ({ fps, frameMs, stats }) => {
    setFps(fps)
    setFrameMs(frameMs)
    setStats(stats)
    setHistory(prev => {
      const next = [...prev, fps]
      // Ограничиваем длину истории (например, 240 точек ~ 2 минуты при 500мс)
      const MAX = 240
      return next.length > MAX ? next.slice(next.length - MAX) : next
    })
  }

  const avgFps = history.length ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : fps

  return (
    <FpsContext.Provider value={{ fps, avgFps, history, frameMs, stats, setFpsStats }}>
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
