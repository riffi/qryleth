import React, { useMemo, useRef } from 'react'
import { Clouds, Cloud } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { GfxLayerType } from '@/entities/layer'

/**
 * Компонент рендера всех слоёв облаков сцены.
 *
 * - Ищет в состоянии сцены слои типа GfxLayerType.Clouds
 * - Для каждого такого слоя рендерит контейнер <Clouds> и набор <Cloud>
 * - Дрейф всех облаков осуществляется по глобальному ветру (environment.wind)
 *   добавлением смещения в плоскости XZ каждый кадр. Для вариативности
 *   допускается коэффициент driftFactor на уровне конкретного облака (если задан в advancedOverrides).
 */
export const CloudLayers: React.FC = () => {
  const layers = useSceneStore(state => state.layers)
  const wind = useSceneStore(state => state.environment.wind)

  const cloudLayers = useMemo(() => (layers || []).filter(l => l.type === GfxLayerType.Clouds && (l as any).clouds && (l.visible ?? true)), [layers])

  if (!cloudLayers || cloudLayers.length === 0) return null

  return (
    <>
      {cloudLayers.map(layer => (
        <CloudLayerGroup key={layer.id} layerId={layer.id} items={(layer as any).clouds.items || []} wind={wind} />
      ))}
    </>
  )
}

interface CloudLayerGroupProps {
  layerId: string
  items: Array<{
    id: string
    position: [number, number, number]
    rotationY?: number
    advancedOverrides?: {
      segments?: number
      bounds?: [number, number, number]
      volume?: number
      opacity?: number
      color?: string
      growth?: number
      animationSpeed?: number
      driftFactor?: number
    }
  }>
  wind: { direction: [number, number]; speed: number }
}

/**
 * Рендер-контейнер для одного слоя облаков с анимацией дрейфа по ветру.
 *
 * Внутри поддерживается накопленное смещение offsetXZ, которое увеличивается
 * на каждом кадре согласно формуле: offset += wind.direction * wind.speed * dt.
 * Итоговая позиция каждого облака = basePosition + offsetXZ * driftFactor.
 */
const CloudLayerGroup: React.FC<CloudLayerGroupProps> = ({ items, wind }) => {
  const groupRef = useRef<Group | null>(null)

  // Базовые позиции облаков фиксируем на момент монтирования/смены items
  const basePositions = useMemo(() => items.map(it => [...it.position] as [number, number, number]), [items])

  // Накопленное смещение дрейфа по XZ
  const driftOffsetRef = useRef<[number, number]>([0, 0])

  useFrame((_, dt) => {
    // Обновляем накопленное смещение согласно ветру
    const [ox, oz] = driftOffsetRef.current
    const dx = (wind?.direction?.[0] ?? 0) * Math.max(0, wind?.speed ?? 0) * dt
    const dz = (wind?.direction?.[1] ?? 0) * Math.max(0, wind?.speed ?? 0) * dt
    const nx = ox + dx
    const nz = oz + dz
    driftOffsetRef.current = [nx, nz]

    // Применяем смещение к каждому облаку (с учётом индивидуального driftFactor, если задан)
    if (!groupRef.current) return
    let idx = 0
    groupRef.current.children.forEach(child => {
      const base = basePositions[idx]
      const driftFactor = items[idx]?.advancedOverrides?.driftFactor ?? 1
      if (base && 'position' in child) {
        child.position.set(base[0] + nx * driftFactor, base[1], base[2] + nz * driftFactor)
      }
      idx++
    })
  })

  return (
    <group ref={groupRef as any}>
      <Clouds>
        {items.map((it) => {
          const o = it.advancedOverrides || {}
          const segments = o.segments ?? 10
          const bounds = o.bounds ?? [20, 15, 20]
          const volume = o.volume ?? 300
          const opacity = o.opacity ?? 0.2
          const color = o.color ?? 'white'
          const growth = o.growth ?? 0.5
          const speed = o.animationSpeed ?? 0.2
          const rotationY = it.rotationY ?? 0
          return (
            <Cloud
              key={it.id}
              seed={(it as any).seed ?? 1}
              segments={segments}
              bounds={bounds as any}
              position={it.position as any}
              rotation={[0, rotationY, 0] as any}
              volume={volume}
              opacity={opacity}
              color={color as any}
              speed={speed}
              growth={growth}
            />
          )
        })}
      </Clouds>
    </group>
  )
}

export default CloudLayers
