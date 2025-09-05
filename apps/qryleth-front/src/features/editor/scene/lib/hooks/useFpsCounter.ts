import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFpsContext } from '../contexts/FpsContext'

/**
 * Хук для подсчета FPS (кадры в секунду) и обновления контекста.
 * Использует useFrame для подсчета кадров и обновления значения каждые 500ms.
 * Обновляет FPS в контексте для отображения вне Canvas.
 */
export const useFpsCounter = (): void => {
  const { setFps } = useFpsContext()
  const frameCountRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(performance.now())

  useFrame(() => {
    frameCountRef.current++
    const currentTime = performance.now()
    const deltaTime = currentTime - lastTimeRef.current

    // Обновляем FPS каждые 500ms для плавного отображения
    if (deltaTime >= 500) {
      const currentFps = Math.round((frameCountRef.current * 1000) / deltaTime)
      setFps(currentFps)
      frameCountRef.current = 0
      lastTimeRef.current = currentTime
    }
  })
}