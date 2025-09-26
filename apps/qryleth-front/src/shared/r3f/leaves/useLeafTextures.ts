import * as THREE from 'three'
import { useEffect, useState } from 'react'
import { leafTextureRegistry } from '@/shared/lib/textures'
import { loadLeafBaseMaps } from '@/shared/lib/textures/LeafTextureRegistry'

// Локальный кэш atlas.json по URL, чтобы не дергать сеть при каждом
// ремоунте чанковых компонент листвы/LOD.
const atlasCache = new Map<string, LeafTextureSetState['atlas']>()
const atlasInflight = new Map<string, Promise<LeafTextureSetState['atlas']>>()

async function getAtlasJson(url: string): Promise<LeafTextureSetState['atlas']> {
  if (atlasCache.has(url)) return atlasCache.get(url) as any
  if (atlasInflight.has(url)) return atlasInflight.get(url) as any
  const p = fetch(url, { cache: 'force-cache' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
    .then((a) => { atlasCache.set(url, a); return a })
    .catch(() => { return null })
    .finally(() => { atlasInflight.delete(url) })
  atlasInflight.set(url, p)
  return p
}

export interface LeafTextureSetState {
  diffuseMap: THREE.Texture | null
  alphaMap: THREE.Texture | null
  normalMap: THREE.Texture | null
  roughnessMap: THREE.Texture | null
  atlas: { name: string; x: number; y: number; width: number; height: number; anchorX?: number; anchorY?: number; anchor?: { x: number; y: number } }[] | null
  texAspect: number
  anchorUV: [number, number] | null
}

/**
 * Загружает карты текстур для листвы и применяет вырезку из atlas.json.
 * Унифицировано для Scene и ObjectEditor.
 *
 * Параметры:
 * - setId: идентификатор набора текстур листьев в реестре (если не указан — берется первый доступный);
 * - enabled: флаг использования режима 'texture';
 * - spriteName: имя спрайта внутри атласа (для выбора прямоугольника);
 * - getUniforms: опциональный колбэк, который возвращает ссылку на uniforms материала, чтобы проставить uTexCenter.
 *
 * Возвращает текущие карты, атлас, рассчитанный texAspect и anchorUV.
 */
export function useLeafTextures(
  setId: string | undefined,
  enabled: boolean,
  spriteName: string | undefined,
  getUniforms?: () => any,
): LeafTextureSetState {
  const [diffuseMap, setDiffuseMap] = useState<THREE.Texture | null>(null)
  const [alphaMap, setAlphaMap] = useState<THREE.Texture | null>(null)
  const [normalMap, setNormalMap] = useState<THREE.Texture | null>(null)
  const [roughnessMap, setRoughnessMap] = useState<THREE.Texture | null>(null)
  const [texAspect, setTexAspect] = useState<number>(1)
  const [atlas, setAtlas] = useState<LeafTextureSetState['atlas']>(null)
  const [anchorUV, setAnchorUV] = useState<[number, number] | null>(null)

  // Вариантный кэш по (setId|sprite) для уже сконфигурированных (offset/repeat) текстур,
  // чтобы не клонировать/перенастраивать на каждый ремоунт чанков/LOD.
  const variantKey = `${setId || leafTextureRegistry.list()[0]?.id || 'default'}|${spriteName || 'default'}`
  const variantCache: any = (useLeafTextures as any)._variantCache || ((useLeafTextures as any)._variantCache = new Map<string, any>())

  // Загрузка карт с кэшированием (на уровне реестра)
  useEffect(() => {
    let alive = true
    if (!enabled) {
      setDiffuseMap(null); setAlphaMap(null); setNormalMap(null); setRoughnessMap(null)
      return
    }
    const set = (setId && leafTextureRegistry.get(setId)) || leafTextureRegistry.list()[0]
    if (!set) { setDiffuseMap(null); setAlphaMap(null); setNormalMap(null); setRoughnessMap(null); return }
    ;(async () => {
      const { colorMap, opacityMap, normalMap, roughnessMap } = await loadLeafBaseMaps(set)
      if (!alive) return
      setDiffuseMap(colorMap)
      setAlphaMap(opacityMap)
      setNormalMap(normalMap)
      setRoughnessMap(roughnessMap)
      const img2: any = colorMap?.image
      if (img2 && img2.width && img2.height) setTexAspect(img2.width / img2.height)
    })()
    return () => { alive = false }
  }, [enabled, setId])

  // Базовые текстуры теперь кэшируются на уровне реестра и переиспользуются
  // многими компонентами; dispose здесь не вызываем, чтобы не ломать разделяемые ресурсы.

  // Загрузка atlas.json c кэшированием (без повторных сетевых запросов)
  useEffect(() => {
    if (!enabled) { setAtlas(null); return }
    const set = (setId && leafTextureRegistry.get(setId)) || leafTextureRegistry.list()[0]
    const atlasUrl = set?.atlasUrl
    let alive = true
    if (atlasUrl) {
      // Сначала пытаемся отдать из кэша синхронно
      if (atlasCache.has(atlasUrl)) {
        setAtlas(atlasCache.get(atlasUrl) || null)
      } else {
        // Иначе один раз грузим и кладём в кэш
        getAtlasJson(atlasUrl).then((a) => { if (alive) setAtlas(a) })
      }
    } else {
      setAtlas(null)
    }
    return () => { alive = false }
  }, [enabled, setId])

  // Применение вырезки, установка anchor и uTexCenter (с кэшированием вариантов)
  useEffect(() => {
    if (!enabled) return
    if (!diffuseMap) return
    const img: any = diffuseMap.image
    if (!img || !img.width || !img.height) return
    const W = img.width, H = img.height
    const items = atlas || []
    const rect: any = (items.find(i => i.name === spriteName) || items[0])
    if (!rect) return
    // Добавляем небольшой внутренний паддинг (в UV) для снижения bleeding в мипах
    const PAD = 2 // пикселя
    const padX = Math.min(rect.width * 0.25, PAD)
    const padY = Math.min(rect.height * 0.25, PAD)
    const repX = Math.max(0, (rect.width - 2 * padX)) / W
    const repY = Math.max(0, (rect.height - 2 * padY)) / H
    const offX = (rect.x + padX) / W
    const offYFlipTrue = 1 - (rect.y + rect.height) / H
    const offYFlipFalse = (rect.y + padY) / H
    const cx = offX + repX * 0.5
    const cyFlipTrue = offYFlipTrue + repY * 0.5
    const cyFlipFalse = offYFlipFalse + repY * 0.5
    // Если в кэше уже есть вариант для (setId|sprite) — используем его
    const cached = variantCache.get(variantKey)
    if (cached && cached.diffuse) {
      setDiffuseMap(cached.diffuse)
      setAlphaMap(cached.alpha)
      setNormalMap(cached.normal)
      setRoughnessMap(cached.roughness)
      setTexAspect(cached.texAspect)
      setAnchorUV(cached.anchorUV)
      // uTexCenter для материала тоже обновим
      const uniforms = getUniforms?.()
      if (uniforms && uniforms.uTexCenter) uniforms.uTexCenter.value.set(cached.uTexCenter?.x ?? 0.5, cached.uTexCenter?.y ?? 0.5)
      return
    }

    // Иначе создаём клон‑варианты (общие для всех потребителей) и сохраняем в кэш
    const cloneAndApply = (t: THREE.Texture | null) => {
      if (!t) return null
      const c = t.clone()
      c.repeat.set(repX, repY)
      c.offset.set(offX, c.flipY ? offYFlipTrue : offYFlipFalse)
      c.center.set(0.0, 0.0)
      c.rotation = 0
      c.needsUpdate = true
      return c
    }
    const d = cloneAndApply(diffuseMap)
    const a = cloneAndApply(alphaMap)
    const n = cloneAndApply(normalMap)
    const r = cloneAndApply(roughnessMap)

    const uniforms = getUniforms?.()
    const cy = (diffuseMap && diffuseMap.flipY === false) ? cyFlipFalse : cyFlipTrue
    if (uniforms && uniforms.uTexCenter) uniforms.uTexCenter.value.set(cx, cy)
    setTexAspect(rect.width / rect.height)
    setDiffuseMap(d)
    setAlphaMap(a)
    setNormalMap(n)
    setRoughnessMap(r)
    const anchorPair: [number, number] = (() => {
      const ax = typeof rect.anchorX === 'number' ? rect.anchorX : (rect.anchor?.x)
      const ay = typeof rect.anchorY === 'number' ? rect.anchorY : (rect.anchor?.y)
      if (typeof ax === 'number' && typeof ay === 'number' && rect.width > 0 && rect.height > 0) {
        const uN = Math.min(1, Math.max(0, ax / rect.width))
        const vN = Math.min(1, Math.max(0, ay / rect.height))
        return [uN, vN]
      }
      return [0.5, 1.0]
    })()
    setAnchorUV(anchorPair)

    variantCache.set(variantKey, {
      diffuse: d, alpha: a, normal: n, roughness: r,
      texAspect: rect.width / rect.height,
      anchorUV: anchorPair,
      uTexCenter: { x: cx, y: cy }
    })
  }, [enabled, atlas, diffuseMap, alphaMap, normalMap, roughnessMap, spriteName])

  return { diffuseMap, alphaMap, normalMap, roughnessMap, atlas, texAspect, anchorUV }
}
