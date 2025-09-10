import React from 'react'

interface FpsDisplayProps {
  /** Текущее значение FPS для отображения. */
  fps: number
  /**
   * Отступ сверху, px. Нужен, чтобы не пересекаться с другими оверлеями
   * (например, панелью PlayControls в правом верхнем углу).
   * По умолчанию 10.
   */
  top?: number
  /**
   * Отступ справа, px. По умолчанию 10.
   */
  right?: number
}

/**
 * Компонент для отображения FPS в углу viewport'а.
 *
 * Верстка и визуальный стиль выровнены с верхней панелью тулбара SceneEditor
 * (полупрозрачный фон с блюром, мягкая тень, скругления) и сниженным z-index,
 * чтобы оверлей не перекрывал всплывающие окна (popover/tooltip/modal).
 * Размещается в правом верхнем углу центрального контейнера сцены.
 */
export const FpsDisplay: React.FC<FpsDisplayProps> = ({ fps, top = 10, right = 10 }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        right,
        // Выровняли индекс слоёв с верхним тулбаром, чтобы не перекрывать попапы
        zIndex: 10,
        // Стиль как у верхнего тулбара
        background: 'color-mix(in srgb, var(--mantine-color-dark-7) 72%, transparent)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
        borderRadius: 10,
        color: 'white',
        padding: '6px 10px',
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: 700,
        // Не перехватываем события мыши: оверлей «прозрачный» для кликов
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    >
      {fps} FPS
    </div>
  )
}
