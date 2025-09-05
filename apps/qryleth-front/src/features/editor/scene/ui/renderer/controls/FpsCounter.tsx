import React from 'react'
import { useFpsCounter } from '../../../lib/hooks/useFpsCounter'

/**
 * Компонент-хук для подсчета FPS внутри R3F Canvas.
 * Не рендерит ничего, только считает FPS с помощью useFrame.
 */
export const FpsCounter: React.FC = () => {
  // Только считаем FPS, отображение будет вне Canvas
  useFpsCounter()
  return null
}
