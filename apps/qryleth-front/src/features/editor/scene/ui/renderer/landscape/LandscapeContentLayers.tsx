import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { DEFAULT_LANDSCAPE_COLOR } from '@/features/editor/scene/constants'
import { createGfxHeightSampler } from '@/features/editor/scene/lib/terrain/GfxHeightSampler'
import { buildGfxTerrainGeometry } from '@/features/editor/scene/lib/terrain/GeometryBuilder'
import { MultiColorProcessor } from '@/features/editor/scene/lib/terrain/MultiColorProcessor'
import { paletteRegistry } from '@/shared/lib/palette'

// Глобальный кэш финальных геометрий для режима 'triangle' с подсчётом ссылок.
// Ключ: baseGeometry.uuid + параметры многоцветной палитры.
// Это позволяет переиспользовать дорогостоящий результат генерации геометрии
// между перерендерами, избегая повторного дублирования вершин и пересчёта нормалей.
const triangleGeometryCache = new Map<string, { geom: THREE.BufferGeometry; refCount: number }>()

/**
 * Строит стабильный ключ из конфигурации многоцветной окраски.
 * Учитывает режим, slopeBoost и палитру с сортировкой по высоте.
 */
function makeMultiColorKey(cfg: import('@/entities/layer/model/types').GfxMultiColorConfig | undefined | null, paletteUuid?: string): string {
  if (!cfg) return 'none'
  const mode = cfg.mode ?? 'vertex'
  const slope = Number.isFinite(cfg.slopeBoost as number) ? (cfg.slopeBoost as number) : 0
  const paletteStops = (cfg.palette ?? [])
    .slice()
    .sort((a, b) => a.height - b.height)
    .map(s => {
      const desc = s.colorSource
        ? `${s.colorSource.type}:${(s.colorSource as any).role ?? ''}:${(s.colorSource as any).tint ?? ''}:${(s.colorSource as any).hueTowards?.deg ?? ''}:${(s.colorSource as any).hueTowards?.t ?? ''}:${(s.colorSource as any).saturationShift ?? ''}`
        : `${s.color ?? ''}`
      return `${s.height}:${desc}:${s.alpha ?? 1}`
    })
    .join('|')
  return `${mode};${slope};${paletteStops};pal:${paletteUuid || 'default'}`
}

/**
 * Получить финальную геометрию для 'triangle' из кэша или сгенерировать и закэшировать.
 * Возвращает геометрию и ключ кэша. Обязательно вызвать releaseTriangleGeometry(key)
 * в cleanup, чтобы корректно уменьшить счётчик ссылок и освободить память при надобности.
 */
function acquireTriangleGeometry(
  baseGeom: THREE.BufferGeometry,
  processor: MultiColorProcessor,
  sampler: unknown,
  mcKey: string
): { geom: THREE.BufferGeometry; cacheKey: string } {
  const key = `${(baseGeom as any).uuid || 'geom'}|triangle|${mcKey}`
  const cached = triangleGeometryCache.get(key)
  if (cached) {
    cached.refCount++
    return { geom: cached.geom, cacheKey: key }
  }
  const generated = processor.generateFaceColoredGeometry(sampler, baseGeom)
  triangleGeometryCache.set(key, { geom: generated, refCount: 1 })
  return { geom: generated, cacheKey: key }
}

/**
 * Освободить ссылку на закэшированную треугольную геометрию.
 * При достижении нулевого счётчика — очистить GPU-ресурсы и удалить из кэша.
 */
function releaseTriangleGeometry(cacheKey: string | null | undefined): void {
  if (!cacheKey) return
  const entry = triangleGeometryCache.get(cacheKey)
  if (!entry) return
  entry.refCount = Math.max(0, entry.refCount - 1)
  if (entry.refCount === 0) {
    try { entry.geom.dispose() } catch {}
    triangleGeometryCache.delete(cacheKey)
  }
}
import {FrontSide} from "three/src/constants";

/**
 * Рендер ландшафта (новая архитектура): читает элементы из `landscapeContent.items`
 * и отрисовывает каждую площадку независимо от слоёв.
 *
 * Поддерживаемые формы:
 * - shape = 'terrain': строится геометрия по GfxTerrainConfig и сэмплеру высот;
 * - shape = 'plane': рендерится простая плоскость заданного размера.
 *
 * Цвет/многоцветная окраска берутся из item.material (color | multiColor).
 */
export const LandscapeContentLayers: React.FC = () => {
  const content = useSceneStore(state => state.landscapeContent)
  const renderMode = useSceneStore(state => (state as any).renderMode)
  const items = content?.items ?? []
  if (!items.length) return null

  return (
    <group>
      {items.map(item => (
        <LandscapeItemMesh key={item.id} item={item} wireframe={renderMode === 'wireframe'} />
      ))}
    </group>
  )
}

interface LandscapeItemMeshProps {
  item: import('@/entities/terrain').GfxLandscape
  wireframe: boolean
}

/**
 * Меш одной ландшафтной площадки. Генерирует геометрию и материал по данным элемента.
 */
const LandscapeItemMesh: React.FC<LandscapeItemMeshProps> = ({ item, wireframe }) => {
  const [geometryVersion, setGeometryVersion] = useState(0)
  // Ключ геометрии 'triangle' для корректного освобождения при размонтировании/обновлении
  const triangleCacheKeyRef = useRef<string | null>(null)

  const sampler = useMemo(() => {
    if (item.shape === 'terrain' && item.terrain) {
      return createGfxHeightSampler(item.terrain)
    }
    return null
  }, [item.shape, item.terrain])

  // Ожидание готовности heightmap при наличии
  useEffect(() => {
    if (!sampler || item.shape !== 'terrain' || !item.terrain) return
    let cancelled = false
    ;(async () => {
      await sampler.ready?.()
      if (!cancelled) setGeometryVersion(v => v + 1)
    })()
    return () => { cancelled = true }
  }, [sampler, item.shape, item.terrain])

  const baseGeometry = useMemo(() => {
    const w = item.size?.width || 1
    const d = item.size?.depth || 1
    let geom: THREE.BufferGeometry
    if (item.shape === 'terrain') {
      if (item.terrain && sampler) {
        geom = buildGfxTerrainGeometry(item.terrain, sampler)
      } else {
        geom = new THREE.PlaneGeometry(w, d)
      }
    } else {
      geom = new THREE.PlaneGeometry(w, d)
    }
    return geom
  }, [item.shape, item.size?.width, item.size?.depth, item.terrain, sampler, geometryVersion])

  useEffect(() => () => { baseGeometry?.dispose() }, [baseGeometry])

  const environmentContent = useSceneStore(state => state.environmentContent)
  const paletteUuid = environmentContent?.paletteUuid || 'default'
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')

  const multiColorProcessor = useMemo(() => {
    if (item.material?.multiColor && sampler) {
      return new MultiColorProcessor(item.material.multiColor, activePalette as any)
    }
    return null
  }, [item.material?.multiColor, sampler, paletteUuid])

  const finalGeometry = useMemo(() => {
    // Сбросим ссылку предыдущего ключа
    triangleCacheKeyRef.current = null
    if (!multiColorProcessor || !sampler || !baseGeometry) return baseGeometry
    const mode = item.material?.multiColor?.mode
    if (mode === 'triangle') {
      // Используем кэш финальной геометрии по составному ключу
      const mcKey = makeMultiColorKey(item.material?.multiColor, paletteUuid)
      const { geom, cacheKey } = acquireTriangleGeometry(baseGeometry, multiColorProcessor, sampler, mcKey)
      triangleCacheKeyRef.current = cacheKey
      return geom
    } else {
      const vertexColors = multiColorProcessor.generateVertexColors(sampler, baseGeometry)
      baseGeometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 4))
      ;(baseGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true
      return baseGeometry
    }
  }, [multiColorProcessor, sampler, baseGeometry, item.material?.multiColor])

  useEffect(() => {
    // Освобождение для не кэшированных геометрий
    if (finalGeometry && finalGeometry !== baseGeometry && !triangleCacheKeyRef.current) {
      return () => { try { finalGeometry.dispose() } catch {} }
    }
    // Для кэшированных — уменьшаем refCount, при 0 будет dispose и удаление
    if (triangleCacheKeyRef.current) {
      const keyToRelease = triangleCacheKeyRef.current
      return () => { releaseTriangleGeometry(keyToRelease) }
    }
  }, [finalGeometry, baseGeometry])

  const materialColor = useMemo(() => {
    if (item.material?.multiColor) return new THREE.Color('#ffffff')
    if (item.material?.color) return new THREE.Color(item.material.color)
    return new THREE.Color(DEFAULT_LANDSCAPE_COLOR)
  }, [item.material?.color, item.material?.multiColor])

  const rotation = item.shape === 'terrain' ? [0, 0, 0] as const : [-Math.PI / 2, 0, 0] as const
  const position = useMemo(() => ([item.center?.[0] ?? 0, 0.1, item.center?.[1] ?? 0] as const), [item.center])
  const useVertexColors = Boolean(item.material?.multiColor)

  return (
    <mesh
      /*
       * ВАЖНО: привязываем видимость меша к флагу item.visible из Zustand‑стора.
       * Если visible === false — элемент скрывается на сцене, при true/undefined — показывается.
       */
      visible={item.visible !== false}
      geometry={finalGeometry}
      rotation={rotation}
      position={position}
      receiveShadow
    >
      <meshLambertMaterial
        color={materialColor}
        side={THREE.FrontSide}
        wireframe={wireframe}
        transparent={Boolean(item.material?.multiColor?.palette?.some(s => (s.alpha ?? 1) < 1)) || Boolean(item.material?.multiColor)}
        opacity={1.0}
        vertexColors={useVertexColors}
      />
    </mesh>
  )
}
