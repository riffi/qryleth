import React from 'react'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { useFpsContext } from '../../../lib/contexts/FpsContext'

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
  const { avgFps, history, stats, frameMs } = useFpsContext()
  const [expanded, setExpanded] = React.useState(false)

  // Построить path для простого графика FPS
  const width = 180
  const height = 42
  const values = history
  const maxFps = 120
  const pts = React.useMemo(() => {
    if (!values.length) return ''
    const len = values.length
    const stepX = width / Math.max(1, len - 1)
    return values.map((v, i) => {
      const x = Math.round(i * stepX)
      const clamped = Math.min(maxFps, Math.max(0, v))
      const y = Math.round(height - (clamped / maxFps) * height)
      return `${x},${y}`
    }).join(' ')
  }, [values])

  return (
    <div
      style={{
        position: 'absolute',
        top,
        right,
        zIndex: 10,
        background: 'color-mix(in srgb, var(--mantine-color-dark-7) 72%, transparent)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
        borderRadius: 10,
        color: 'white',
        padding: '6px 10px',
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: 700,
        // Разрешаем клики для иконки/разворота
        pointerEvents: 'auto',
        userSelect: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{fps} FPS</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
          title={expanded ? 'Свернуть' : 'Развернуть'}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22,
            borderRadius: 6,
            border: 'none',
            background: 'color-mix(in srgb, var(--mantine-color-dark-6) 72%, transparent)',
            color: 'white', cursor: 'pointer', padding: 0
          }}
        >
          {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 8, pointerEvents: 'none' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
            <div>avg {avgFps}</div>
            <div>frame ~ {frameMs.toFixed(1)} ms</div>
          </div>
          <svg width={width} height={height} style={{ display: 'block', opacity: 0.9 }}>
            <polyline fill="none" stroke="#4ade80" strokeWidth="2" points={pts} />
            <line x1="0" y1={height} x2={width} y2={height} stroke="#ffffff20" />
          </svg>
          <div style={{ marginTop: 6 }}>
            <div>🟢 drawCalls {stats.drawCalls}</div>
            <div>🟢 programs {stats.programs}</div>
            <div>🟢 triangles {stats.triangles}</div>
            <div>🟢 textures {stats.textures}</div>
            <div>🟢 memory {`{ geometries: ${stats.memory.geometries}, textures: ${stats.memory.textures} }`}</div>
          </div>
        </div>
      )}
    </div>
  )
}
