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

  // Мульти-текстура по высоте: смешивание до 4 слоёв цветовых карт
  useEffect(() => {
    const mat = materialRef.current as any
    if (!mat) return
    const mt = item.material?.multiTexture
    if (!mt || !Array.isArray(mt.layers) || mt.layers.length === 0) {
      // Сброс onBeforeCompile если ранее был установлен
      if (mat.userData && mat.userData._mtApplied) {
        mat.onBeforeCompile = undefined
        mat.userData._mtApplied = false
        mat.needsUpdate = true
      }
      return
    }

    // Ограничим число слоёв до 2, чтобы не превышать лимит текстурных юнитов
    const layers = mt.layers.slice().sort((a, b) => a.height - b.height).slice(0, 2)
    // Подготовим текстуры и параметры
    const maps: (THREE.Texture | null)[] = layers.map(layer => {
      const entry = landscapeTextureRegistry.get(layer.textureId)
      if (!entry?.colorMapUrl) return null
      const tex = new THREE.TextureLoader().load(entry.colorMapUrl)
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      ;(tex as any).colorSpace = (THREE as any).SRGBColorSpace// || (THREE as any).sRGBEncoding
      const r = layer.uvRepeat || item.material?.uvRepeat || [1, 1]
      tex.repeat.set(r[0], r[1])
      return tex
    })
    const normMaps: (THREE.Texture | null)[] = layers.map(layer => {
      const entry = landscapeTextureRegistry.get(layer.textureId)
      if (!entry?.normalMapUrl) return null
      const tex = new THREE.TextureLoader().load(entry.normalMapUrl)
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      const r = layer.uvRepeat || item.material?.uvRepeat || [1, 1]
      tex.repeat.set(r[0], r[1])
      return tex
    })
    const roughMaps: (THREE.Texture | null)[] = layers.map(layer => {
      const entry = landscapeTextureRegistry.get(layer.textureId)
      if (!entry?.roughnessMapUrl) return null
      const tex = new THREE.TextureLoader().load(entry.roughnessMapUrl)
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      const r = layer.uvRepeat || item.material?.uvRepeat || [1, 1]
      tex.repeat.set(r[0], r[1])
      return tex
    })
    const aoMaps: (THREE.Texture | null)[] = layers.map(layer => {
      const entry = landscapeTextureRegistry.get(layer.textureId)
      if (!entry?.aoMapUrl) return null
      const tex = new THREE.TextureLoader().load(entry.aoMapUrl)
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      const r = layer.uvRepeat || item.material?.uvRepeat || [1, 1]
      tex.repeat.set(r[0], r[1])
      return tex
    })
    const heights = layers.map(l => l.height)
    const repeats = layers.map(l => l.uvRepeat || item.material?.uvRepeat || [1, 1])

    // Активируем необходимые ветки стандартного шейдера через defines (без привязки встроенных sampler-ов)
    mat.onBeforeCompile = (shader: any) => {
      shader.defines = shader.defines || {}
      // Включаем UV и нужные блоки шейдера
      shader.defines.USE_UV = ''
      shader.defines.USE_MAP = ''
      // Включаем кастомный блок нормалей (без стандартной карты normalMap)
      shader.defines.USE_NORMALMAP = ''
      shader.defines.NORMALMAP_UV = 'uv'
      // Отключаем roughness/AO в multiTexture
      // shader.defines.USE_ROUGHNESSMAP = ''
      // shader.defines.USE_AOMAP = ''
      // Явно укажем, что используем первый UV‑канал (vUv)
      shader.defines.MAP_UV = 'uv'
      shader.defines.ROUGHNESSMAP_UV = 'uv'
      shader.uniforms.uCount = { value: layers.length }
      shader.uniforms.uHeights = { value: new Float32Array([heights[0] ?? 0, heights[1] ?? 0, heights[2] ?? 0, heights[3] ?? 0]) }
      shader.uniforms.uTex0 = { value: maps[0] || whiteTex }
      shader.uniforms.uTex1 = { value: maps[1] || whiteTex }
      shader.uniforms.uRepeat0 = { value: new THREE.Vector2(repeats[0]?.[0] ?? 1, repeats[0]?.[1] ?? 1) }
      shader.uniforms.uRepeat1 = { value: new THREE.Vector2(repeats[1]?.[0] ?? 1, repeats[1]?.[1] ?? 1) }
      shader.uniforms.uRepeat2 = { value: new THREE.Vector2(repeats[2]?.[0] ?? 1, repeats[2]?.[1] ?? 1) }
      shader.uniforms.uRepeat3 = { value: new THREE.Vector2(repeats[3]?.[0] ?? 1, repeats[3]?.[1] ?? 1) }
      shader.uniforms.uNorm0 = { value: normMaps[0] || neutralNormalTex }
      shader.uniforms.uNorm1 = { value: normMaps[1] || neutralNormalTex }
      shader.uniforms.uRough0 = { value: roughMaps[0] || whiteTex }
      shader.uniforms.uRough1 = { value: roughMaps[1] || whiteTex }
      shader.uniforms.uAO0 = { value: aoMaps[0] || whiteTex }
      shader.uniforms.uAO1 = { value: aoMaps[1] || whiteTex }
      shader.uniforms.uExposure = { value: (item.material?.multiTexture as any)?.exposure ?? 1.0 }
      shader.uniforms.uNormalInfluence = { value: 0.9 }
      shader.uniforms.uAOIntensity = { value: 0.4 }

      // Вершинный шейдер: проброс мирового Y
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n varying float vWorldY;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n vec4 worldPos = modelMatrix * vec4(transformed, 1.0);\n vWorldY = worldPos.y;')

      // Фрагментный шейдер: смешивание карт по высоте, замена map_fragment
      const mixCode = `
        uniform int uCount; 
        uniform float uHeights[2];
        uniform sampler2D uTex0; uniform sampler2D uTex1;
        uniform sampler2D uNorm0; uniform sampler2D uNorm1;
        uniform sampler2D uRough0; uniform sampler2D uRough1;
        uniform sampler2D uAO0; uniform sampler2D uAO1;
        uniform vec2 uRepeat0; uniform vec2 uRepeat1;
        uniform float uExposure;
        uniform float uNormalInfluence;
        uniform float uAOIntensity;
        varying float vWorldY;
        
        vec4 computeWeights(float y) {
          if (uCount <= 1) return vec4(1.0, 0.0, 0.0, 0.0);
          float t = clamp((y - uHeights[0]) / max(0.0001, (uHeights[1] - uHeights[0])), 0.0, 1.0);
          return vec4(1.0 - t, t, 0.0, 0.0);
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
        
      `
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + mixCode)
      // Исправленный фрагментный шейдер для смешивания текстур:
      .replace(
          '#include <map_fragment>',
          `
  vec4 w = computeWeights(vWorldY);
  
  // Получаем цвета из текстур (уже в линейном пространстве после sRGB декодирования)
  vec4 s0 = texture2D(uTex0, vUv * uRepeat0);
  vec4 s1 = texture2D(uTex1, vUv * uRepeat1);
  
  // Смешиваем текстуры
  vec4 texelColor = s0 * w.x + s1 * w.y;
  
  // Применяем exposure БЕЗ clamp (пусть tone mapping сделает свою работу)
  texelColor.rgb *= uExposure;
  
  // Применяем к diffuseColor (который по умолчанию vec4(1.0))
  diffuseColor.rgb *= texelColor.rgb;
  diffuseColor.a *= texelColor.a;
  `
      )
      .replace(
          '#include <normal_fragment_maps>',
          `
      vec4 wn = computeWeights(vWorldY);
      
      vec3 n0 = texture2D(uNorm0, vUv * uRepeat0).xyz * 2.0 - 1.0;
      vec3 n1 = texture2D(uNorm1, vUv * uRepeat1).xyz * 2.0 - 1.0;
      
      vec3 blendedNormal = normalize(n0 * wn.x + n1 * wn.y);
      blendedNormal.xy *= uNormalInfluence;
      blendedNormal = normalize(blendedNormal);
      
      normal = perturbNormal2Arb(-vViewPosition, normal, blendedNormal, vUv);
      `
      )
        .replace(
          '#include <roughnessmap_fragment>',
          `
            // Аккуратное возвращение карт шероховатости: мягкое влияние без бликов
            float r0 = texture2D(uRough0, vUv * uRepeat0).g;
            float r1 = texture2D(uRough1, vUv * uRepeat1).g;
            float rMix = r0 * w.x + r1 * w.y;
            // Смешиваем от 1.0 (матовая) к карте с небольшим весом, и ограничиваем минимумом
            float roughnessFactor = mix(1.0, rMix, 0.35);
            roughnessFactor = clamp(roughnessFactor, 0.25, 1.0);
          `
        )
        .replace(
          '#include <aomap_fragment>',
          `
            // Мягкий AO по мульти‑текстурам (используем vUv)
            float ao0 = texture2D(uAO0, vUv * uRepeat0).r;
            float ao1 = texture2D(uAO1, vUv * uRepeat1).r;
            float aoMix = ao0 * w.x + ao1 * w.y;
            // Управляемое влияние AO (снижаем по умолчанию)
            float aoI = clamp(uAOIntensity, 0.0, 1.0);
            reflectedLight.indirectDiffuse *= ( aoI * aoMix + ( 1.0 - aoI ) );
          `
        )
    }
    mat.userData._mtApplied = true
    mat.needsUpdate = true

    return () => { /* оставить material как есть; three пересоберёт при размонте */ }
  }, [item.material?.multiTexture, item.material?.uvRepeat, whiteTex, neutralNormalTex])

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
