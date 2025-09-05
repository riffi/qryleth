import React from 'react'

interface FpsDisplayProps {
  fps: number
}

/**
 * Компонент для отображения FPS в углу viewport'а.
 * Отображается как HTML overlay поверх Canvas.
 */
export const FpsDisplay: React.FC<FpsDisplayProps> = ({ fps }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '60px',
        right: '10px',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '14px',
        fontWeight: 'bold',
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    >
      {fps} FPS
    </div>
  )
}
