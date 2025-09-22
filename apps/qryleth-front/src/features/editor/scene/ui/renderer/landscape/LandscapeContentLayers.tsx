import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { DEFAULT_LANDSCAPE_COLOR } from '@/features/editor/scene/constants'
import { createGfxHeightSampler } from '@/features/editor/scene/lib/terrain/GfxHeightSampler'
import { buildGfxTerrainGeometry } from '@/features/editor/scene/lib/terrain/GeometryBuilder'
import { MultiColorProcessor } from '@/features/editor/scene/lib/terrain/MultiColorProcessor'
import { paletteRegistry } from '@/shared/lib/palette'
import { GfxLayerType } from '@/entities/layer'
import { landscapeTextureRegistry } from '@/shared/lib/textures'
import { decideSegments } from '@/features/editor/scene/lib/terrain/GeometryBuilder'
import { TERRAIN_TEXTURING_CONFIG, computeAtlasSizeFromSegments, computeSplatSizeFromSegments, toPow2Up } from '@/features/editor/scene/config/terrainTexturing'
import type { ColorSource, GlobalPalette } from '@/entities/palette'
import { buildTextureAtlases, loadImage, type LayerImages } from '@/features/editor/scene/lib/terrain/texturing/AtlasBuilder'
import { buildSplatmap } from '@/features/editor/scene/lib/terrain/texturing/SplatmapBuilder'
import { setTerrainDebugEntry } from '@/features/editor/scene/lib/terrain/texturing/DebugTextureRegistry'

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
  /**
   * Рендер содержимого ландшафта для активного слоя.
   *
   * Важно: оборачиваем все площадки ландшафта в группу с userData
   * `{ layerId, layerType: 'landscape' }`. Эти метки используются режимом Walk
   * (см. WalkControls) для эффективного рейкастинга вниз под камерой и выбора
   * корректной высоты поверхности. Ранее метки проставлялись в компоненте
   * LandscapeLayer, однако после перехода на новую архитектуру здесь рендерится
   * непосредственное содержимое (`LandscapeContentLayers`) без обёртки слоя.
   * Добавление userData на группу восстанавливает корректную работу Walk-режима.
   */
  const content = useSceneStore(state => state.landscapeContent)
  const renderMode = useSceneStore(state => (state as any).renderMode)
  const items = content?.items ?? []
  if (!items.length) return null

  return (
    <group userData={{ layerId: content!.layerId, layerType: GfxLayerType.Landscape }}>
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

  // URL карты цвета из реестра по textureId (если указан).
  const texEntry = useMemo(() => {
    const texId = item.material?.textureId
    if (!texId) return null
    return landscapeTextureRegistry.get(texId) || null
  }, [item.material?.textureId])

  const colorMapUrl = useMemo(() => texEntry?.colorMapUrl || null, [texEntry])
  const normalMapUrl = useMemo(() => texEntry?.normalMapUrl || null, [texEntry])
  const roughnessMapUrl = useMemo(() => texEntry?.roughnessMapUrl || null, [texEntry])
  const aoMapUrl = useMemo(() => texEntry?.aoMapUrl || null, [texEntry])

  // Повторение UV для всех карт. По умолчанию [1,1].
  const uvRepeat = useMemo<[number, number]>(() => {
    const r = item.material?.uvRepeat
    if (!r || r.length !== 2) return [1, 1]
    const rx = Number.isFinite(r[0]) ? r[0] : 1
    const ry = Number.isFinite(r[1]) ? r[1] : 1
    return [rx, ry]
  }, [item.material?.uvRepeat])

  // Загрузка карты цвета по URL вручную с кэшем three.js; управляем жизненным циклом текстуры.
  const [textureMap, setTextureMap] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let disposed = false
    if (!colorMapUrl) {
      setTextureMap(null)
      return
    }
    const loader = new THREE.TextureLoader()
    const tex = loader.load(colorMapUrl, (t) => {
      if (disposed) return
      t.wrapS = THREE.RepeatWrapping
      t.wrapT = THREE.RepeatWrapping
      t.repeat.set(uvRepeat[0], uvRepeat[1])
      // Цветовая карта — в sRGB пространстве для корректной тонмаппинга
      ;(t as any).colorSpace = (THREE as any).SRGBColorSpace || (THREE as any).sRGBEncoding
      t.needsUpdate = true
      setTextureMap(t)
    })
    return () => {
      disposed = true
      // Не освобождаем текстуру в cleanup из-за StrictMode двойного монтирования в dev.
      // R3F/Three кэшируют текстуры; освобождение произойдёт при dispose материала/геометрии.
    }
  }, [colorMapUrl, uvRepeat[0], uvRepeat[1]])

  const [normalMap, setNormalMap] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let disposed = false
    if (!normalMapUrl) { setNormalMap(null); return }
    const loader = new THREE.TextureLoader()
    const tex = loader.load(normalMapUrl, (t) => {
      if (disposed) return
      t.wrapS = THREE.RepeatWrapping
      t.wrapT = THREE.RepeatWrapping
      t.repeat.set(uvRepeat[0], uvRepeat[1])
      setNormalMap(t)
    })
    return () => { disposed = true }
  }, [normalMapUrl, uvRepeat[0], uvRepeat[1]])

  const [roughnessMap, setRoughnessMap] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let disposed = false
    if (!roughnessMapUrl) { setRoughnessMap(null); return }
    const loader = new THREE.TextureLoader()
    const tex = loader.load(roughnessMapUrl, (t) => {
      if (disposed) return
      t.wrapS = THREE.RepeatWrapping
      t.wrapT = THREE.RepeatWrapping
      t.repeat.set(uvRepeat[0], uvRepeat[1])
      setRoughnessMap(t)
    })
    return () => { disposed = true }
  }, [roughnessMapUrl, uvRepeat[0], uvRepeat[1]])

  const [aoMap, setAoMap] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let disposed = false
    if (!aoMapUrl) { setAoMap(null); return }
    const loader = new THREE.TextureLoader()
    const tex = loader.load(aoMapUrl, (t) => {
      if (disposed) return
      t.wrapS = THREE.RepeatWrapping
      t.wrapT = THREE.RepeatWrapping
      t.repeat.set(uvRepeat[0], uvRepeat[1])
      setAoMap(t)
    })
    return () => { disposed = true }
  }, [aoMapUrl, uvRepeat[0], uvRepeat[1]])

  // Подбор источника цвета: приоритет multiColor, затем textureId (если карта загружена), затем fallback color.
  const materialColor = useMemo(() => {
    if (item.material?.multiColor) return new THREE.Color('#ffffff')
    if (item.material?.textureId && textureMap) return new THREE.Color('#ffffff')
    if (item.material?.color) return new THREE.Color(item.material.color)
    return new THREE.Color(DEFAULT_LANDSCAPE_COLOR)
  }, [item.material?.color, item.material?.multiColor, item.material?.textureId, textureMap])

  // Для AO требуется uv2. Если используем aoMap или multiTexture — дублируем uv -> uv2.
  useEffect(() => {
    if (!finalGeometry) return
    if (!aoMap && !item.material?.multiTexture) return
    const uv = finalGeometry.getAttribute('uv') as THREE.BufferAttribute | undefined
    const uv2 = finalGeometry.getAttribute('uv2') as THREE.BufferAttribute | undefined
    if (uv && !uv2) {
      finalGeometry.setAttribute('uv2', new THREE.BufferAttribute(uv.array as any, 2))
      ;(finalGeometry.attributes as any).uv2.needsUpdate = true
    }
  }, [finalGeometry, aoMap, item.material?.multiTexture])

  const rotation = item.shape === 'terrain' ? [0, 0, 0] as const : [-Math.PI / 2, 0, 0] as const
  const position = useMemo(() => ([item.center?.[0] ?? 0, 0.1, item.center?.[1] ?? 0] as const), [item.center])
  const useVertexColors = Boolean(item.material?.multiColor)

  // Белая 1x1 текстура для активации пути текстурирования в стандартном шейдере
  const whiteTex = useMemo(() => {
    const data = new Uint8Array([255, 255, 255, 255])
    const tex = new THREE.DataTexture(data, 1, 1)
    ;(tex as any).colorSpace = (THREE as any).SRGBColorSpace || (THREE as any).sRGBEncoding
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.needsUpdate = true
    return tex
  }, [])

  // Нейтральная normal‑текстура (0.5,0.5,1.0) для слоёв без карты нормалей
  const neutralNormalTex = useMemo(() => {
    const data = new Uint8Array([128, 128, 255, 255])
    const tex = new THREE.DataTexture(data, 1, 1)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.needsUpdate = true
    return tex
  }, [])

  // Императивная синхронизация карт материала (на случай, если декларативный проп map не применился)
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  // Диагностический флаг: показать атлас как обычную карту материала и отключить кастомный шейдер.
  // Включается через URL-параметр ?terrainDebugAtlasAsMap=1
  const debugAtlasAsMap = useMemo(() => {
    try {
      if (typeof window === 'undefined') return false
      const q = new URLSearchParams(window.location.search)
      return q.get('terrainDebugAtlasAsMap') === '1'
    } catch { return false }
  }, [])
  useEffect(() => {
    const mat = materialRef.current
    if (!mat) return
    // Применяем карты только если не используется многоцветная раскраска по вершинам
    if (!useVertexColors && !item.material?.multiTexture) {
      mat.map = textureMap || null
      mat.normalMap = normalMap || null
      mat.roughnessMap = roughnessMap || null
      mat.aoMap = aoMap || null
      mat.needsUpdate = true
    } else {
      mat.map = null
      mat.normalMap = null
      mat.roughnessMap = null
      mat.aoMap = null
      mat.needsUpdate = true
    }
  }, [useVertexColors, textureMap, normalMap, roughnessMap, aoMap, item.material?.multiTexture])

  // (Старый 2‑слойный путь удалён — используем атласы + splatmap ниже)

  // Кэш собранных атласов и splatmap по item.id
  const atlasCache = useRef(new Map<string, {
    key: string
    albedo: THREE.CanvasTexture
    normal: THREE.CanvasTexture
    roughness: THREE.CanvasTexture
    ao: THREE.CanvasTexture
    splat: THREE.CanvasTexture
    tileOffset: Array<[number, number]>
    tileScale: Array<[number, number]>
    repeats: Array<[number, number]>
    heights: number[]
  }>()).current

  // Новый путь: атлас 2x2 (до 4 слоёв) + splatmap по высоте.
  // Ставит свой onBeforeCompile ПОСЛЕ старого эффекта, чтобы переопределить его.
  useEffect(() => {
    const mat = materialRef.current as any
    if (!mat) return
    const mt = item.material?.multiTexture
    if (!mt || !Array.isArray(mt.layers) || mt.layers.length === 0 || !sampler || item.shape !== 'terrain' || !item.terrain) {
      return
    }

    const sorted = mt.layers.slice().sort((a, b) => a.height - b.height)
    const layers = sorted.slice(0, 4)
    if (sorted.length > 4) console.warn('[multiTexture] Слоёв больше 4, лишние будут отброшены:', sorted.length)

    const segments = decideSegments(item.terrain)
    let atlasSize = computeAtlasSizeFromSegments(segments, TERRAIN_TEXTURING_CONFIG)
    const splatSize = computeSplatSizeFromSegments(segments, TERRAIN_TEXTURING_CONFIG)
    const repeats = layers.map(l => l.uvRepeat || item.material?.uvRepeat || [1, 1]) as Array<[number, number]>
    const heights = layers.map(l => l.height)
    // Резолв цвета палитры для подкраски слоёв
    const resolveColorSource = (src: ColorSource | undefined | null, pal?: GlobalPalette | null): string | null => {
      if (!src) return null
      if (src.type === 'fixed') return (item.material?.color ?? '#ffffff')
      const base = pal?.colors?.[src.role] || '#ffffff'
      // Простая коррекция HSV по опциям src
      const hexToRgb = (hex: string) => {
        const h = hex.replace('#', '')
        const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
        return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 }
      }
      const rgbToHex = (r: number, g: number, b: number) => `#${[r,g,b].map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0')).join('')}`
      const rgbToHsv = (r: number, g: number, b: number) => {
        r/=255; g/=255; b/=255; const max=Math.max(r,g,b),min=Math.min(r,g,b); const d=max-min; let h=0; const s=max===0?0:d/max; const v=max; if(d!==0){ switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break} h/=6 } return {h,s,v}
      }
      const hsvToRgb = (h:number,s:number,v:number) => { const i=Math.floor(h*6); const f=h*6-i; const p=v*(1-s); const q=v*(1-f*s); const t=v*(1-(1-f)*s); let r=0,g=0,b=0; switch(i%6){case 0:r=v;g=t;b=p;break;case 1:r=q;g=v;b=p;break;case 2:r=p;g=v;b=t;break;case 3:r=p;g=q;b=v;break;case 4:r=t;g=p;b=v;break;case 5:r=v;g=p;b=q;break} return {r: Math.round(r*255), g: Math.round(g*255), b: Math.round(b*255)} }
      const { r, g, b } = hexToRgb(base)
      let { h, s, v } = rgbToHsv(r,g,b)
      const tint = (src as any).tint as number | undefined
      const hueTowards = (src as any).hueTowards as {deg:number;t:number}|undefined
      const saturationShift = (src as any).saturationShift as number | undefined
      if (hueTowards && Number.isFinite(hueTowards.deg) && Number.isFinite(hueTowards.t)){
        const t = Math.max(0, Math.min(1, hueTowards.t))
        const h0=h; let h1=((hueTowards.deg%360)+360)%360/360; let d=h1-h0; if(d>0.5)d-=1; if(d<-0.5)d+=1; h=((h0+t*d)%1+1)%1
      }
      if (Number.isFinite(saturationShift as number) && (saturationShift as number)!==0){ s=Math.max(0,Math.min(1,s+(saturationShift as number))) }
      if (Number.isFinite(tint as number) && (tint as number)!==0){ v=Math.max(0,Math.min(1,v+(tint as number))) }
      const rgb2 = hsvToRgb(h,s,v)
      return rgbToHex(rgb2.r,rgb2.g,rgb2.b)
    }
    const layerColorsHex = layers.map(l => resolveColorSource(l.colorSource as any, activePalette as any))
    const layerColorMix = layers.map(l => {
      const t = (l as any).colorize
      return Number.isFinite(t) ? Math.max(0, Math.min(1, Number(t))) : 0
    }) as number[]

    // Хитрая подстройка размера атласа под большие повторы:
    // гарантируем не менее ~256px на один повтор тайла по каждой оси.
    const maxRepX = Math.max(1, ...repeats.map(r => (r?.[0] ?? 1)))
    const maxRepY = Math.max(1, ...repeats.map(r => (r?.[1] ?? 1)))
    const minPxPerRepeat = TERRAIN_TEXTURING_CONFIG.minPxPerRepeat
    const innerNeed = Math.max(Math.ceil(maxRepX * minPxPerRepeat), Math.ceil(maxRepY * minPxPerRepeat))
    const padding = TERRAIN_TEXTURING_CONFIG.paddingPx
    const tiles = TERRAIN_TEXTURING_CONFIG.tilesPerAxis
    const atlasFromRepeats = toPow2Up(tiles * (innerNeed + 2 * padding))
    atlasSize = Math.min(TERRAIN_TEXTURING_CONFIG.atlasMaxSize, Math.max(atlasSize, atlasFromRepeats, TERRAIN_TEXTURING_CONFIG.atlasMinSize))

    const cacheKey = JSON.stringify({
      atlasSize, splatSize,
      layers: layers.map(l => ({ id: l.textureId, h: l.height, r: l.uvRepeat || null, cs: l.colorSource ? true : false, cm: (l as any).colorize ?? 0 })),
      center: item.center || [0, 0],
      size: item.size,
      blend: TERRAIN_TEXTURING_CONFIG.blendHeightMeters,
      geomVer: geometryVersion,
    })

    const existing = atlasCache.get(item.id)
    if (existing && existing.key === cacheKey) {
      const center2: [number, number] = [item.center?.[0] ?? 0, item.center?.[1] ?? 0]
      const size2: [number, number] = [item.size?.width ?? item.terrain.worldWidth, item.size?.depth ?? (item.terrain as any).worldDepth]
      applyMultiTextureShader(
        mat,
        existing.albedo, existing.normal, existing.roughness, existing.ao, existing.splat,
        existing.tileOffset, existing.tileScale, existing.repeats, existing.heights,
        center2, size2,
        mt.exposure,
        layerColorsHex as (string|null)[], layerColorMix as number[]
      )
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        // Дожидаемся готовности источника высоты (важно для heightmap)
        await sampler.ready?.()
        const imageLayers: LayerImages[] = []
        const texLoader = new THREE.TextureLoader()
        const loadTexImage = (url?: string): Promise<CanvasImageSource | null> => new Promise((resolve) => {
          if (!url) { resolve(null); return }
          try {
            texLoader.load(url, (t) => {
              const src = (t && (t as any).image) as CanvasImageSource | undefined
              resolve(src || null)
            }, undefined, () => resolve(null))
          } catch {
            resolve(null)
          }
        })
        for (const l of layers) {
          const entry = landscapeTextureRegistry.get(l.textureId)
          const albedo = await loadTexImage(entry?.colorMapUrl)
          const normal = await loadTexImage(entry?.normalMapUrl)
          const rough = await loadTexImage(entry?.roughnessMapUrl)
          const ao = await loadTexImage(entry?.aoMapUrl)
          imageLayers.push({ albedo, normal, roughness: rough, ao })
        }
        // Пересчитаем atlasSize после загрузки изображений, чтобы гарантировать нативную плотность пикселей
        // для одной «базы» повторения (например, 1024px при rep=1)
        try {
          const tiles = TERRAIN_TEXTURING_CONFIG.tilesPerAxis
          const padding = TERRAIN_TEXTURING_CONFIG.paddingPx
          let needInner = 0
          for (let i = 0; i < imageLayers.length && i < 4; i++) {
            const src = imageLayers[i].albedo || imageLayers[i].normal || imageLayers[i].roughness || imageLayers[i].ao
            const w = Math.max(1, Number((src as any)?.width ?? 0))
            const h = Math.max(1, Number((src as any)?.height ?? 0))
            const rep = repeats[i] || [1, 1]
            const desiredX = Math.max(Math.ceil(w * rep[0]), Math.ceil(minPxPerRepeat * rep[0]))
            const desiredY = Math.max(Math.ceil(h * rep[1]), Math.ceil(minPxPerRepeat * rep[1]))
            const desired = Math.max(desiredX, desiredY)
            if (desired > needInner) needInner = desired
          }
          if (needInner > 0) {
            const target = toPow2Up(tiles * (needInner + 2 * padding))
            atlasSize = Math.min(TERRAIN_TEXTURING_CONFIG.atlasMaxSize, Math.max(atlasSize, target, TERRAIN_TEXTURING_CONFIG.atlasMinSize))
          }
        } catch {}

        // Повторы переносим в шейдер (world-space), чтобы не раздувать атлас.
        const atlasRepeats = layers.map(() => [1, 1]) as Array<[number, number]>
        const built = buildTextureAtlases(atlasSize, imageLayers, atlasRepeats)
        // Быстрый предпросмотр: по URL ?terrainSplatPreview=1 уменьшаем качество расчёта в 2 раза
        const qs = (typeof window !== 'undefined') && new URLSearchParams(window.location.search).get('terrainSplatPreview') === '1' ? 0.5 : 1.0
        const splat = buildSplatmap(sampler, {
          size: splatSize,
          center: [item.center?.[0] ?? 0, item.center?.[1] ?? 0],
          worldSize: { width: item.size?.width ?? item.terrain.worldWidth, depth: item.size?.depth ?? (item.terrain as any).worldDepth },
          layerHeights: heights,
          blendHeight: TERRAIN_TEXTURING_CONFIG.blendHeightMeters,
          qualityScale: qs,
        })
        // Используем DataTexture, чтобы исключить влияние premultiplied alpha
        // Создаём DataTexture напрямую из байтов (без чтения из canvas, чтобы избежать премультипликации)
        const splatTex = new THREE.DataTexture(splat.bytes, splatSize, splatSize, THREE.RGBAFormat)
        splatTex.wrapS = THREE.ClampToEdgeWrapping
        splatTex.wrapT = THREE.ClampToEdgeWrapping
        // Для карт весов избегаем mipmap, чтобы не было паразитных швов от фильтрации
        splatTex.generateMipmaps = false
        splatTex.minFilter = THREE.LinearFilter
        splatTex.magFilter = THREE.LinearFilter
        // ВНИМАНИЕ: splat генерируется в мировых координатах с v растущим как и Z,
        // поэтому переворот по Y НЕ нужен. Иначе получим зеркалирование по Z.
        splatTex.flipY = false
        splatTex.premultiplyAlpha = false
        splatTex.needsUpdate = true

        if (cancelled) return

        const cacheRecord = {
          key: cacheKey,
          albedo: built.albedo,
          normal: built.normal,
          roughness: built.roughness,
          ao: built.ao,
          splat: splatTex,
          tileOffset: built.tileOffset,
          tileScale: built.tileScale,
          repeats,
          heights,
        }
        atlasCache.set(item.id, cacheRecord)

        // Отладка: публикуем канвасы атласов и splatmap в реестр, чтобы показать в панели
        // Сформируем малый превью-канвас splat с принудительной альфой=1, чтобы исключить белый/чёрный фон
        const makeSplatPreview = (bytes: Uint8Array, srcSize: number, previewSize: number = 128): HTMLCanvasElement => {
          const cnvP = document.createElement('canvas')
          cnvP.width = previewSize; cnvP.height = previewSize
          const ctxP = cnvP.getContext('2d', { willReadFrequently: true } as any)!
          const imgP = ctxP.createImageData(previewSize, previewSize)
          const dst = imgP.data
          let di = 0
          for (let y = 0; y < previewSize; y++) {
            const sy = Math.min(srcSize - 1, Math.max(0, Math.floor((y + 0.5) * srcSize / previewSize)))
            for (let x = 0; x < previewSize; x++) {
              const sx = Math.min(srcSize - 1, Math.max(0, Math.floor((x + 0.5) * srcSize / previewSize)))
              const si = (sy * srcSize + sx) * 4
              dst[di++] = bytes[si]
              dst[di++] = bytes[si + 1]
              dst[di++] = bytes[si + 2]
              dst[di++] = 255 // принудительная непрозрачность
            }
          }
          ctxP.putImageData(imgP, 0, 0)
          return cnvP
        }
        const splatPreview = makeSplatPreview(splat.bytes, splatSize, 128)
        setTerrainDebugEntry(item.id, {
          itemId: item.id,
          name: item.name,
          albedo: built.albedo.image as HTMLCanvasElement,
          normal: built.normal.image as HTMLCanvasElement,
          roughness: built.roughness.image as HTMLCanvasElement,
          ao: built.ao.image as HTMLCanvasElement,
          splat: splat.canvas as HTMLCanvasElement,
          splatPreview,
          splatStats: splat.stats,
          atlasSize,
          splatSize,
          layers: layers.map((l, i) => ({ textureId: l.textureId, height: l.height, repeat: repeats[i] }))
        })

        // Диагностический режим: показываем атлас как обычную карту материала, без кастомного шейдера
        if (debugAtlasAsMap) {
          try {
            // ВАЖНО: three.js ожидает, что onBeforeCompile — функция (используется в customProgramCacheKey)
            // Никогда не ставим undefined, иначе возможна ошибка `.toString` при сборке программы
            mat.onBeforeCompile = () => {}
            // Зафиксируем ключ кэша программы, чтобы избежать пересборок
            ;(mat as any).customProgramCacheKey = () => 'atlas-as-map'
            mat.userData._mtApplied = false
            // Подвешиваем цветовую карту напрямую
            mat.map = built.albedo
            mat.normalMap = null
            mat.roughnessMap = null
            mat.aoMap = null
            // Рекомендуемые фильтры/флаги для визуализации
            built.albedo.flipY = true
            built.albedo.generateMipmaps = true
            built.albedo.minFilter = THREE.LinearMipmapLinearFilter
            built.albedo.magFilter = THREE.LinearFilter
            built.albedo.needsUpdate = true
            mat.needsUpdate = true
          } catch {}
        } else {
          const center2: [number, number] = [item.center?.[0] ?? 0, item.center?.[1] ?? 0]
          const size2: [number, number] = [item.size?.width ?? item.terrain.worldWidth, item.size?.depth ?? (item.terrain as any).worldDepth]
          applyMultiTextureShader(
            mat,
            built.albedo, built.normal, built.roughness, built.ao, splatTex,
            built.tileOffset, built.tileScale, repeats, heights,
            center2, size2,
            mt.exposure,
            layerColorsHex as (string|null)[], layerColorMix as number[]
          )
        }
      } catch (e) {
        console.error('Ошибка при сборке атласа/splatmap:', e)
      }
    })()

    return () => { cancelled = true }
  }, [item.material?.multiTexture, item.material?.uvRepeat, sampler, item.shape, item.terrain, geometryVersion, paletteUuid])

  /**
   * Подключить шейдер с использованием атласов и splatmap для до 4 слоёв.
   * Внедряет uniforms и заменяет блоки стандартного шейдера MeshStandardMaterial.
   */
  function applyMultiTextureShader(
    mat: THREE.MeshStandardMaterial & { userData: any; onBeforeCompile?: (shader: any) => void },
    tAlbedo: THREE.Texture,
    tNormal: THREE.Texture,
    tRough: THREE.Texture,
    tAO: THREE.Texture,
    tSplat: THREE.Texture,
    tileOffset: Array<[number, number]>,
    tileScale: Array<[number, number]>,
    repeats: Array<[number, number]>,
    _heights: number[],
    worldCenter: [number, number],
    worldSize: [number, number],
    exposure?: number,
    layerColors?: (string | null)[],
    layerColorMix?: number[]
  ) {
    const cfg = TERRAIN_TEXTURING_CONFIG
    // Подготовка целевых цветов (Linear) и коэффициентов подкраски из аргументов
    const toLinearVec3 = (hex: string) => {
      const c = new THREE.Color(hex)
      if ((THREE as any).SRGBColorSpace && (c as any).convertSRGBToLinear) (c as any).convertSRGBToLinear()
      else { c.r = Math.pow(c.r, 2.2); c.g = Math.pow(c.g, 2.2); c.b = Math.pow(c.b, 2.2) }
      return new THREE.Vector3(c.r, c.g, c.b)
    }
    const colHex: Array<string | null> = [0,1,2,3].map(i => (layerColors && layerColors[i]) || null)
    const colMix: number[] = [0,1,2,3].map(i => Math.max(0, Math.min(1, Number(layerColorMix?.[i] ?? 0))))
    // Если шейдер уже установлен ранее — обновим uniform'ы на лету и выйдем
    const u = (mat.userData && mat.userData._mtUniforms) ? mat.userData._mtUniforms : null
    if (mat.userData?._mtApplied && u && u.uLayerColor0) {
      const setC = (idx: number, uni: any) => {
        const v = colHex[idx] ? toLinearVec3(colHex[idx] as string) : new THREE.Vector3(1,1,1)
        uni.value.copy(v)
      }
      setC(0, u.uLayerColor0); setC(1, u.uLayerColor1); setC(2, u.uLayerColor2); setC(3, u.uLayerColor3)
      u.uLayerColorMix0.value = colMix[0]; u.uLayerColorMix1.value = colMix[1]; u.uLayerColorMix2.value = colMix[2]; u.uLayerColorMix3.value = colMix[3]
      if (u.uExposure) u.uExposure.value = (typeof exposure === 'number' ? exposure : cfg.exposure)
      if (u.uNormalInfluence) u.uNormalInfluence.value = cfg.normalInfluence
      if (u.uAOIntensity) u.uAOIntensity.value = cfg.aoIntensity
      if (u.uRoughnessScale) u.uRoughnessScale.value = cfg.roughnessScale
      if (u.uRoughnessMin) u.uRoughnessMin.value = cfg.roughnessMin
      return
    }
    // Вспомогательные флаги отладки: только albedo без нормалей/rough/AO
    const onlyAlbedo = (typeof window !== 'undefined') && new URLSearchParams(window.location.search).get('terrainDebugOnlyAlbedo') === '1'
    mat.onBeforeCompile = (shader: any) => {
      shader.defines = shader.defines || {}
      shader.defines.USE_UV = ''
      // Не включаем USE_MAP, чтобы встроенный map-путь three не вмешивался в наш кастомный семплинг
      // Подготовим массивы vec2 строго длиной 4
      const padVec2 = (arr: Array<[number, number]>, def: [number, number]) => {
        return [0,1,2,3].map(i => new THREE.Vector2((arr[i] ?? def)[0], (arr[i] ?? def)[1]))
      }
      const uTileOffset = padVec2(tileOffset, [0, 0])
      const uTileScale = padVec2(tileScale, [1, 1])
      // Лёгкая "усадка" тайла внутрь на ~1.5 текселя атласа, чтобы исключить попадание в стык
      const atlasSize = ((tAlbedo as any).image?.width as number) || 1024
      const eps = 1.5 / Math.max(1, atlasSize)
      const adjOffset = uTileOffset.map(v => new THREE.Vector2(v.x + eps, v.y + eps))
      const adjScale  = uTileScale.map(v => new THREE.Vector2(Math.max(0, v.x - 2*eps), Math.max(0, v.y - 2*eps)))
      // Повторы делаем в шейдере (мировые UV)
      shader.uniforms.uAtlasAlbedo = { value: tAlbedo }
      shader.uniforms.uAtlasNormal = { value: tNormal }
      shader.uniforms.uAtlasRough = { value: tRough }
      shader.uniforms.uAtlasAO = { value: tAO }
      shader.uniforms.uSplat = { value: tSplat }
      // ВАЖНО: используем отдельные uniform'ы на каждый слой, т.к. WebGL1
      // не поддерживает динамическое индексирование uniform-массивов стабильно.
      // Записываем значения для uTileOffset0..3, uTileScale0..3, uRepeat0..3
      shader.uniforms.uTileOffset0 = { value: adjOffset[0] }
      shader.uniforms.uTileOffset1 = { value: adjOffset[1] }
      shader.uniforms.uTileOffset2 = { value: adjOffset[2] }
      shader.uniforms.uTileOffset3 = { value: adjOffset[3] }
      shader.uniforms.uTileScale0 = { value: adjScale[0] }
      shader.uniforms.uTileScale1 = { value: adjScale[1] }
      shader.uniforms.uTileScale2 = { value: adjScale[2] }
      shader.uniforms.uTileScale3 = { value: adjScale[3] }
      // Повторы слоёв
      const uRepeat = padVec2(repeats, [1, 1])
      shader.uniforms.uRepeat0 = { value: uRepeat[0] }
      shader.uniforms.uRepeat1 = { value: uRepeat[1] }
      shader.uniforms.uRepeat2 = { value: uRepeat[2] }
      shader.uniforms.uRepeat3 = { value: uRepeat[3] }
      shader.uniforms.uExposure = { value: (typeof exposure === 'number' ? exposure : cfg.exposure) }
      shader.uniforms.uNormalInfluence = { value: cfg.normalInfluence }
      shader.uniforms.uAOIntensity = { value: cfg.aoIntensity }
      shader.uniforms.uRoughnessScale = { value: cfg.roughnessScale }
      shader.uniforms.uRoughnessMin = { value: cfg.roughnessMin }
      // Размер текселя атласа для диагностики (пока не используем в шейдере)
      shader.uniforms.uAtlasTexel = { value: 1.0 / Math.max(1, atlasSize) }
      // Тексель splat для сглаживания весов (9-точечное ядро)
      const splW = ((tSplat as any).image?.width as number) || (tSplat as any).width || 1024
      const splH = ((tSplat as any).image?.height as number) || (tSplat as any).height || splW
      shader.uniforms.uSplatTexel = { value: new THREE.Vector2(1 / Math.max(1, splW), 1 / Math.max(1, splH)) }
      // Цвета слоёв для подкраски (linear)
      shader.uniforms.uLayerColor0 = { value: colHex[0] ? toLinearVec3(colHex[0] as string) : new THREE.Vector3(1,1,1) }
      shader.uniforms.uLayerColor1 = { value: colHex[1] ? toLinearVec3(colHex[1] as string) : new THREE.Vector3(1,1,1) }
      shader.uniforms.uLayerColor2 = { value: colHex[2] ? toLinearVec3(colHex[2] as string) : new THREE.Vector3(1,1,1) }
      shader.uniforms.uLayerColor3 = { value: colHex[3] ? toLinearVec3(colHex[3] as string) : new THREE.Vector3(1,1,1) }
      shader.uniforms.uLayerColorMix0 = { value: colMix[0] }
      shader.uniforms.uLayerColorMix1 = { value: colMix[1] }
      shader.uniforms.uLayerColorMix2 = { value: colMix[2] }
      shader.uniforms.uLayerColorMix3 = { value: colMix[3] }
      // Диагностика: флаг показа атласа напрямую по vUv
      const params = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search) : null
      const showAtlasDirect = params?.get('terrainDebugSampleAtlas') === '1'
      const showWeights = params?.get('terrainDebugShowWeights') === '1'
      const showLayer = params?.get('terrainDebugShowLayer')
      shader.uniforms.uDebugSampleAtlas = { value: showAtlasDirect ? 1.0 : 0.0 }
      shader.uniforms.uDebugShowWeights = { value: showWeights ? 1.0 : 0.0 }
      shader.uniforms.uDebugShowLayer = { value: showLayer != null ? parseFloat(showLayer) : -1.0 }
      shader.uniforms.uWorldCenter = { value: new THREE.Vector2(worldCenter[0], worldCenter[1]) }
      shader.uniforms.uWorldSize = { value: new THREE.Vector2(worldSize[0], worldSize[1]) }

      const header = `
        uniform sampler2D uAtlasAlbedo; 
        uniform sampler2D uAtlasNormal; 
        uniform sampler2D uAtlasRough; 
        uniform sampler2D uAtlasAO; 
        uniform sampler2D uSplat; 
        uniform vec2 uTileOffset0; uniform vec2 uTileOffset1; uniform vec2 uTileOffset2; uniform vec2 uTileOffset3;
        uniform vec2 uTileScale0; uniform vec2 uTileScale1; uniform vec2 uTileScale2; uniform vec2 uTileScale3;
        uniform vec2 uRepeat0; uniform vec2 uRepeat1; uniform vec2 uRepeat2; uniform vec2 uRepeat3;
        uniform float uExposure;
        uniform float uNormalInfluence;
        uniform float uAOIntensity;
        uniform float uDebugSampleAtlas;
        uniform float uAtlasTexel;
        uniform float uRoughnessScale;
        uniform float uRoughnessMin;
        uniform vec2 uSplatTexel;
        uniform vec3 uLayerColor0; uniform vec3 uLayerColor1; uniform vec3 uLayerColor2; uniform vec3 uLayerColor3;
        uniform float uLayerColorMix0; uniform float uLayerColorMix1; uniform float uLayerColorMix2; uniform float uLayerColorMix3;
        uniform float uDebugShowWeights;
        uniform float uDebugShowLayer;
        uniform vec2 uWorldCenter;
        uniform vec2 uWorldSize;
        varying vec3 vWorldPos;

        // Получить UV внутри каждого тайла (без индексирования uniform-массивов)
        // Учитываем, что CanvasTexture по умолчанию flipY = false, а атлас собран в системе координат канваса (0,0 вверху).
        // Поэтому инвертируем Y при преобразовании в UV текстуры: v' = 1 - (offset.y + innerV * scale.y)
        // Семплируем с повторением в пределах внутренней области тайла; рассчитываем инверсию Y
        vec2 layerUV0(vec2 uvWorld) { vec2 f = fract(uvWorld * uRepeat0); vec2 t = f * uTileScale0; return vec2(uTileOffset0.x + t.x, 1.0 - (uTileOffset0.y + t.y)); }
        vec2 layerUV1(vec2 uvWorld) { vec2 f = fract(uvWorld * uRepeat1); vec2 t = f * uTileScale1; return vec2(uTileOffset1.x + t.x, 1.0 - (uTileOffset1.y + t.y)); }
        vec2 layerUV2(vec2 uvWorld) { vec2 f = fract(uvWorld * uRepeat2); vec2 t = f * uTileScale2; return vec2(uTileOffset2.x + t.x, 1.0 - (uTileOffset2.y + t.y)); }
        vec2 layerUV3(vec2 uvWorld) { vec2 f = fract(uvWorld * uRepeat3); vec2 t = f * uTileScale3; return vec2(uTileOffset3.x + t.x, 1.0 - (uTileOffset3.y + t.y)); }

        // Простейшая декодировка sRGB->Linear для наших кастомных сэмплеров albedo
        vec3 sRGBToLinear(vec3 srgb) {
          return pow(srgb, vec3(2.2));
        }

        vec3 perturbNormal2Arb(vec3 eye_pos, vec3 surf_norm, vec3 mapN, vec2 uv) {
          vec3 q0 = dFdx(eye_pos.xyz);
          vec3 q1 = dFdy(eye_pos.xyz);
          vec2 st0 = dFdx(uv.st);
          vec2 st1 = dFdy(uv.st);
          vec3 N = surf_norm;
          vec3 q1perp = cross(q1, N);
          vec3 q0perp = cross(N, q0);
          vec3 T = q1perp * st0.x + q0perp * st1.x;
          vec3 B = q1perp * st0.y + q0perp * st1.y;
          float det = max(dot(T, T), dot(B, B));
          float scale = (det == 0.0) ? 0.0 : inversesqrt(det);
          return normalize(T * (mapN.x * scale) + B * (mapN.y * scale) + N * mapN.z);
        }

        // Нормал-мапа в Tangent space → смешиваем линейно и нормализуем
        // ВАЖНО: здесь больше не используем индексирование по uniform-массиву
        // ожидаем уже рассчитанные UV внутри соответствующего тайла
        vec3 sampleNormal(vec2 uv) {
          vec3 n = texture2D(uAtlasNormal, uv).xyz * 2.0 - 1.0;
          return n;
        }

        // Сглаженный сэмпл splat: 5x5 Гаусс (по оси: 1 4 6 4 1, нормировка 256)
        vec4 sampleSplatSmooth(vec2 uv) {
          vec2 t = uSplatTexel;
          float a0 = 1.0, a1 = 4.0, a2 = 6.0, a3 = 4.0, a4 = 1.0;
          float norm = 256.0;
          vec4 acc = vec4(0.0);
          // y = -2
          acc += texture2D(uSplat, uv + vec2(-2.0*t.x, -2.0*t.y)) * (a0*a0);
          acc += texture2D(uSplat, uv + vec2(-1.0*t.x, -2.0*t.y)) * (a1*a0);
          acc += texture2D(uSplat, uv + vec2( 0.0     , -2.0*t.y)) * (a2*a0);
          acc += texture2D(uSplat, uv + vec2( 1.0*t.x, -2.0*t.y)) * (a3*a0);
          acc += texture2D(uSplat, uv + vec2( 2.0*t.x, -2.0*t.y)) * (a4*a0);
          // y = -1
          acc += texture2D(uSplat, uv + vec2(-2.0*t.x, -1.0*t.y)) * (a0*a1);
          acc += texture2D(uSplat, uv + vec2(-1.0*t.x, -1.0*t.y)) * (a1*a1);
          acc += texture2D(uSplat, uv + vec2( 0.0     , -1.0*t.y)) * (a2*a1);
          acc += texture2D(uSplat, uv + vec2( 1.0*t.x, -1.0*t.y)) * (a3*a1);
          acc += texture2D(uSplat, uv + vec2( 2.0*t.x, -1.0*t.y)) * (a4*a1);
          // y = 0
          acc += texture2D(uSplat, uv + vec2(-2.0*t.x,  0.0     )) * (a0*a2);
          acc += texture2D(uSplat, uv + vec2(-1.0*t.x,  0.0     )) * (a1*a2);
          acc += texture2D(uSplat, uv + vec2( 0.0     ,  0.0     )) * (a2*a2);
          acc += texture2D(uSplat, uv + vec2( 1.0*t.x,  0.0     )) * (a3*a2);
          acc += texture2D(uSplat, uv + vec2( 2.0*t.x,  0.0     )) * (a4*a2);
          // y = +1
          acc += texture2D(uSplat, uv + vec2(-2.0*t.x,  1.0*t.y)) * (a0*a3);
          acc += texture2D(uSplat, uv + vec2(-1.0*t.x,  1.0*t.y)) * (a1*a3);
          acc += texture2D(uSplat, uv + vec2( 0.0     ,  1.0*t.y)) * (a2*a3);
          acc += texture2D(uSplat, uv + vec2( 1.0*t.x,  1.0*t.y)) * (a3*a3);
          acc += texture2D(uSplat, uv + vec2( 2.0*t.x,  1.0*t.y)) * (a4*a3);
          // y = +2
          acc += texture2D(uSplat, uv + vec2(-2.0*t.x,  2.0*t.y)) * (a0*a4);
          acc += texture2D(uSplat, uv + vec2(-1.0*t.x,  2.0*t.y)) * (a1*a4);
          acc += texture2D(uSplat, uv + vec2( 0.0     ,  2.0*t.y)) * (a2*a4);
          acc += texture2D(uSplat, uv + vec2( 1.0*t.x,  2.0*t.y)) * (a3*a4);
          acc += texture2D(uSplat, uv + vec2( 2.0*t.x,  2.0*t.y)) * (a4*a4);
          return acc / norm;
        }
      `

      // Прокинем мировую позицию из вершинного шейдера
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n varying vec3 vWorldPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n vec4 wp = modelMatrix * vec4(position, 1.0);\n vWorldPos = wp.xyz;')

      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + header)
        .replace(
          '#include <map_fragment>',
          `
            // Мировые UV для слоёв и splat
            vec2 uvWorld = (vWorldPos.xz - uWorldCenter + 0.5 * uWorldSize) / uWorldSize;
            vec2 uvSplat = clamp(uvWorld, 0.0, 1.0);
            if (uDebugSampleAtlas > 0.5) {
              // Диагностика: показать атлас по vUv, без смешивания и нормалей
              vec4 c = texture2D(uAtlasAlbedo, vUv);
              c.rgb = sRGBToLinear(c.rgb);
              diffuseColor.rgb = c.rgb;
            } else {
            vec4 w = sampleSplatSmooth(uvSplat);
            w = clamp(w, 0.0, 1.0);
            float s = w.x + w.y + w.z + w.w;
            if (s < 1e-6) {
              w = vec4(1.0, 0.0, 0.0, 0.0);
            } else {
              w /= s;
            }
            if (uDebugShowWeights > 0.5) {
              diffuseColor.rgb = w.rgb;
            } else {
            // Доп. диагностика: показать конкретный слой 0..3 по layerUV
            if (uDebugShowLayer >= 0.0) {
              int li = int(floor(uDebugShowLayer + 0.5));
              vec4 cL = vec4(1.0);
              if (li == 0) cL = texture2D(uAtlasAlbedo, layerUV0(uvWorld));
              else if (li == 1) cL = texture2D(uAtlasAlbedo, layerUV1(uvWorld));
              else if (li == 2) cL = texture2D(uAtlasAlbedo, layerUV2(uvWorld));
              else if (li == 3) cL = texture2D(uAtlasAlbedo, layerUV3(uvWorld));
              cL.rgb = sRGBToLinear(cL.rgb);
              diffuseColor.rgb = cL.rgb;
            } else {

            vec4 c0 = texture2D(uAtlasAlbedo, layerUV0(uvWorld));
            vec4 c1 = texture2D(uAtlasAlbedo, layerUV1(uvWorld));
            vec4 c2 = texture2D(uAtlasAlbedo, layerUV2(uvWorld));
            vec4 c3 = texture2D(uAtlasAlbedo, layerUV3(uvWorld));
            c0.rgb = sRGBToLinear(c0.rgb);
            c1.rgb = sRGBToLinear(c1.rgb);
            c2.rgb = sRGBToLinear(c2.rgb);
            c3.rgb = sRGBToLinear(c3.rgb);
            // Подкраска слоя в направлении цвета из палитры
            c0.rgb = mix(c0.rgb, uLayerColor0, clamp(uLayerColorMix0, 0.0, 1.0));
            c1.rgb = mix(c1.rgb, uLayerColor1, clamp(uLayerColorMix1, 0.0, 1.0));
            c2.rgb = mix(c2.rgb, uLayerColor2, clamp(uLayerColorMix2, 0.0, 1.0));
            c3.rgb = mix(c3.rgb, uLayerColor3, clamp(uLayerColorMix3, 0.0, 1.0));
            vec4 texelColor = c0 * w.x + c1 * w.y + c2 * w.z + c3 * w.w;

            texelColor.a = 1.0; // террейн непрозрачный
            texelColor.rgb *= uExposure;
            // Присваиваем напрямую, чтобы исключить влияние baseColor/цвета материала
            diffuseColor.rgb = texelColor.rgb;
            }
            }
            }
          `
        )
      if (!onlyAlbedo) {
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <normal_fragment_maps>',
            `
            vec4 wN = sampleSplatSmooth(uvSplat);
            wN = clamp(wN, 0.0, 1.0);
            float sN = wN.x + wN.y + wN.z + wN.w;
            if (sN < 1e-6) {
              wN = vec4(1.0, 0.0, 0.0, 0.0);
            } else {
              wN /= sN;
            }

            vec3 n0 = sampleNormal(layerUV0(uvWorld));
            vec3 n1 = sampleNormal(layerUV1(uvWorld));
            vec3 n2 = sampleNormal(layerUV2(uvWorld));
            vec3 n3 = sampleNormal(layerUV3(uvWorld));
              vec3 blendedNormal = normalize(n0 * wN.x + n1 * wN.y + n2 * wN.z + n3 * wN.w);
              blendedNormal.xy *= uNormalInfluence;
              blendedNormal = normalize(blendedNormal);
              normal = perturbNormal2Arb(-vViewPosition, normal, blendedNormal, vUv);
            `
          )
          .replace(
          '#include <roughnessmap_fragment>',
          `
            vec4 wR = sampleSplatSmooth(uvSplat);
            wR = clamp(wR, 0.0, 1.0);
            float sR = wR.x + wR.y + wR.z + wR.w;
            if (sR < 1e-6) {
              wR = vec4(1.0, 0.0, 0.0, 0.0);
            } else {
              wR /= sR;
            }
            float r0 = texture2D(uAtlasRough, layerUV0(uvWorld)).r;
            float r1 = texture2D(uAtlasRough, layerUV1(uvWorld)).r;
            float r2 = texture2D(uAtlasRough, layerUV2(uvWorld)).r;
            float r3 = texture2D(uAtlasRough, layerUV3(uvWorld)).r;
            float rMix = r0 * wR.x + r1 * wR.y + r2 * wR.z + r3 * wR.w;
            float roughnessFactor = clamp(rMix * uRoughnessScale, uRoughnessMin, 1.0);
          `
        )
          .replace(
            '#include <aomap_fragment>',
            `
            vec4 wA = sampleSplatSmooth(uvSplat);
            wA = clamp(wA, 0.0, 1.0);
            float sA = wA.x + wA.y + wA.z + wA.w;
            if (sA < 1e-6) {
              wA = vec4(1.0, 0.0, 0.0, 0.0);
            } else {
              wA /= sA;
            }
            float a0 = texture2D(uAtlasAO, layerUV0(uvWorld)).r;
            float a1 = texture2D(uAtlasAO, layerUV1(uvWorld)).r;
            float a2 = texture2D(uAtlasAO, layerUV2(uvWorld)).r;
            float a3 = texture2D(uAtlasAO, layerUV3(uvWorld)).r;
              float aoMix = a0 * wA.x + a1 * wA.y + a2 * wA.z + a3 * wA.w;
              float aoI = clamp(uAOIntensity, 0.0, 1.0);
              reflectedLight.indirectDiffuse *= ( aoI * aoMix + ( 1.0 - aoI ) );
            `
          )
      }
      // Сохраняем ссылки на uniforms для быстрого обновления без перекомпиляции
      mat.userData._mtUniforms = shader.uniforms
    }
    mat.userData._mtApplied = true
    // Обновим ключ кэша программы, чтобы форсировать перекомпиляцию при смене флагов
    ;(mat as any).customProgramCacheKey = () => `multiTexture-v2|albedoOnly:${onlyAlbedo ? 1 : 0}|pal:${paletteUuid}`
    mat.needsUpdate = true
  }
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
      <meshStandardMaterial
        ref={materialRef}
        color={new THREE.Color('#ffffff')}
        map={item.material?.multiTexture ? whiteTex : (useVertexColors ? undefined : textureMap || undefined)}
        normalMap={item.material?.multiTexture ? undefined : (useVertexColors ? undefined : normalMap || undefined)}
        roughnessMap={item.material?.multiTexture ? undefined : (useVertexColors ? undefined : roughnessMap || undefined)}
        aoMap={item.material?.multiTexture ? undefined : (useVertexColors ? undefined : aoMap || undefined)}
        roughness={1.0}
        metalness={0.0}
        side={THREE.FrontSide}
        depthTest={true}
        wireframe={wireframe}
        transparent={false}
        opacity={1.0}
        vertexColors={useVertexColors}
        aoMapIntensity={1.0}
      />
    </mesh>
  )
}
