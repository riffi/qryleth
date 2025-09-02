import React, { useEffect, useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '../../../model/sceneStore'
import { GfxLayerShape, GfxLayerType } from '@/entities/layer'
import { createGfxHeightSampler } from '@/features/scene/lib/terrain/GfxHeightSampler'

interface FlyoverTarget {
  /** Мировые координаты самой высокой точки */
  x: number
  y: number
  z: number
  /** Радиус орбиты (в плоскости XZ), гарантированно внутри границ слоя */
  radius: number
  /** Высота полёта над вершиной (Y) */
  flightY: number
}

/**
 * FlyoverControls (упрощённая версия)
 *
 * Назначение:
 * - Находит единственную самую высокую точку среди всех видимых ландшафтных слоёв типа Terrain.
 * - Камера непрерывно и плавно облетает эту точку по окружности на фиксированной высоте.
 * - Никаких переходов между множественными вершинами, кластеров и т.п.
 */
export const FlyoverControls: React.FC = () => {
  const { camera } = useThree()
  const layers = useSceneStore(s => s.layers)

  const [target, setTarget] = useState<FlyoverTarget | null>(null)
  const angleRef = useRef(0)

  // Параметры полёта (можно при необходимости вынести в настройки)
  const orbitPeriodSec = 12 // период полного оборота
  const heightOffsetMin = 6 // минимальный зазор над пиком
  const radiusFactor = 0.35 // базовый радиус как доля min(width, height)
  const radiusMargin = 2 // безопасный отступ до краёв слоя

  /**
   * Вычисляет наивысшую точку для указанного Terrain-слоя.
   * Возвращает координаты пика и рекомендуемые параметры облёта.
   */
  const findLayerPeak = async (layer: any): Promise<FlyoverTarget | null> => {
    try {
      if (!layer?.terrain) return null
      const t = layer.terrain
      const sampler = createGfxHeightSampler(t)
      // Дожидаемся готовности данных, если это heightmap
      if ((sampler as any).isReady && !(sampler as any).isReady()) {
        await (sampler as any).ready?.()
      }

      const W = t.worldWidth
      const H = t.worldHeight
      const cx = t.center?.[0] ?? 0
      const cz = t.center?.[1] ?? 0

      // Простая регулярная сетка с умеренным разрешением
      const grid = 96
      let bestY = -Infinity
      let bestX = cx
      let bestZ = cz
      for (let iz = 0; iz < grid; iz++) {
        const vz = grid <= 1 ? 0.5 : iz / (grid - 1)
        const z = cz + (vz - 0.5) * H
        for (let ix = 0; ix < grid; ix++) {
          const vx = grid <= 1 ? 0.5 : ix / (grid - 1)
          const x = cx + (vx - 0.5) * W
          const y = sampler.getHeight(x, z)
          if (y > bestY) {
            bestY = y
            bestX = x
            bestZ = z
          }
        }
      }

      // Подбор радиуса с учётом границ слоя (вписанный круг с небольшим отступом)
      const minX = cx - W / 2
      const maxX = cx + W / 2
      const minZ = cz - H / 2
      const maxZ = cz + H / 2
      const dx = Math.min(Math.abs(bestX - minX), Math.abs(maxX - bestX))
      const dz = Math.min(Math.abs(bestZ - minZ), Math.abs(maxZ - bestZ))
      const radiusInside = Math.max(2, Math.min(dx, dz) - radiusMargin)
      const baseRadius = radiusFactor * Math.min(W, H)
      const radius = Math.max(4, Math.min(baseRadius, radiusInside))
      const flightY = bestY + Math.max(heightOffsetMin, radius * 0.25)

      return { x: bestX, y: bestY, z: bestZ, radius, flightY }
    } catch {
      return null
    }
  }

  /**
   * Ищет глобальную самую высокую точку среди всех подходящих слоёв и
   * сохраняет её как цель облёта. Затем инициализирует позицию камеры.
   */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let best: FlyoverTarget | null = null
      for (const layer of layers) {
        if (!layer?.visible) continue
        if (layer.type !== GfxLayerType.Landscape) continue
        if (layer.shape !== GfxLayerShape.Terrain) continue
        const peak = await findLayerPeak(layer)
        if (!peak) continue
        if (!best || peak.y > best.y) best = peak
      }

      if (!cancelled) {
        setTarget(best)
        if (best) {
          // Старт: ставим камеру на окружность справа от цели и смотрим на пик
          camera.position.set(best.x + best.radius, best.flightY, best.z)
          camera.lookAt(new THREE.Vector3(best.x, best.y, best.z))
          angleRef.current = 0
        }
      }
    })()
    return () => { cancelled = true }
  }, [layers, camera])

  /**
   * Главный цикл анимации: равномерное вращение по окружности вокруг цели.
   */
  useFrame((_, delta) => {
    if (!target) return
    const omega = (2 * Math.PI) / Math.max(1e-6, orbitPeriodSec)
    angleRef.current += omega * delta
    const x = target.x + Math.cos(angleRef.current) * target.radius
    const z = target.z + Math.sin(angleRef.current) * target.radius
    const y = target.flightY
    camera.position.set(x, y, z)
    camera.lookAt(target.x, target.y, target.z)
  })

  return null
}

