import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFpsContext } from '../contexts/FpsContext'

/**
 * Хук для подсчета FPS (кадры в секунду) и обновления контекста.
 * Использует useFrame для подсчета кадров и обновления значения каждые 500ms.
 * Обновляет FPS в контексте для отображения вне Canvas.
 */
export const useFpsCounter = (): void => {
  const { setFpsStats } = useFpsContext()
  const frameCountRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(performance.now())

  useFrame((state) => {
    frameCountRef.current++
    const currentTime = performance.now()
    const deltaTime = currentTime - lastTimeRef.current

    // Обновляем FPS каждые 500ms для плавного отображения
    if (deltaTime >= 500) {
      const currentFps = Math.round((frameCountRef.current * 1000) / deltaTime)
      const avgFrameMs = deltaTime / Math.max(1, frameCountRef.current)
      // Считываем рендер‑метрики из WebGLRenderer.info
      try {
        const info = (state.gl && (state.gl as any).info) || undefined
        const stats = info ? {
          drawCalls: info.render?.calls ?? 0,
          programs: Array.isArray(info.programs) ? info.programs.length : (info.programs ?? 0),
          triangles: info.render?.triangles ?? 0,
          textures: info.memory?.textures ?? 0,
          geometries: info.memory?.geometries ?? 0,
          memory: { geometries: info.memory?.geometries ?? 0, textures: info.memory?.textures ?? 0 },
        } : { drawCalls: 0, programs: 0, triangles: 0, textures: 0, geometries: 0, memory: { geometries: 0, textures: 0 } }
        setFpsStats({ fps: currentFps, frameMs: avgFrameMs, stats })
      } catch {
        setFpsStats({ fps: currentFps, frameMs: avgFrameMs, stats: { drawCalls: 0, programs: 0, triangles: 0, textures: 0, geometries: 0, memory: { geometries: 0, textures: 0 } } })
      }
      frameCountRef.current = 0
      lastTimeRef.current = currentTime
    }
  })
}
