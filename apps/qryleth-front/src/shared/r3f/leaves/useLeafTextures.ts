import * as THREE from 'three'
import { useEffect, useState } from 'react'
import { leafTextureRegistry } from '@/shared/lib/textures'

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

  // Загрузка карт
  useEffect(() => {
    if (!enabled) {
      setDiffuseMap(null); setAlphaMap(null); setNormalMap(null); setRoughnessMap(null)
      return
    }
    const loader = new THREE.TextureLoader()
    const set = (setId && leafTextureRegistry.get(setId)) || leafTextureRegistry.list()[0]
    const colorUrl = set?.colorMapUrl
    const opacityUrl = set?.opacityMapUrl
    const normalUrl = set?.normalMapUrl
    const roughnessUrl = set?.roughnessMapUrl
    const onTex = (t: THREE.Texture | null) => {
      if (!t) return
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
      // Цветовую карту переводим в sRGB, чтобы избежать темного вида
      if (colorUrl && t === (diffuseMap as any)) {
        ;(t as any).colorSpace = (THREE as any).SRGBColorSpace || (t as any).colorSpace
      }
      t.anisotropy = 4
      t.center.set(0.0, 0.0)
      t.rotation = 0
      t.needsUpdate = true
    }
    if (colorUrl) loader.load(colorUrl, (t2) => {
      // для цветовой карты — явный sRGB
      ;(t2 as any).colorSpace = (THREE as any).SRGBColorSpace || (t2 as any).colorSpace
      t2.wrapS = t2.wrapT = THREE.ClampToEdgeWrapping
      t2.center.set(0.0, 0.0)
      t2.rotation = 0
      t2.anisotropy = 4
      t2.needsUpdate = true
      setDiffuseMap(t2)
      const img2: any = t2.image
      if (img2 && img2.width && img2.height) setTexAspect(img2.width / img2.height)
    }, undefined, () => setDiffuseMap(null))
    else setDiffuseMap(null)

    if (opacityUrl) loader.load(opacityUrl, (t) => { onTex(t); setAlphaMap(t) }, undefined, () => setAlphaMap(null))
    else setAlphaMap(null)
    if (normalUrl) loader.load(normalUrl, (t) => { onTex(t); setNormalMap(t) }, undefined, () => setNormalMap(null))
    else setNormalMap(null)
    if (roughnessUrl) loader.load(roughnessUrl, (t) => { onTex(t); setRoughnessMap(t) }, undefined, () => setRoughnessMap(null))
    else setRoughnessMap(null)
  }, [enabled, setId])

  // Загрузка atlas.json
  useEffect(() => {
    if (!enabled) { setAtlas(null); return }
    const set = (setId && leafTextureRegistry.get(setId)) || leafTextureRegistry.list()[0]
    const atlasUrl = set?.atlasUrl
    if (atlasUrl) {
      fetch(atlasUrl)
        .then(r => r.json())
        .then((a) => setAtlas(a))
        .catch(() => setAtlas(null))
    } else {
      setAtlas(null)
    }
  }, [enabled, setId])

  // Применение вырезки, установка anchor и uTexCenter
  useEffect(() => {
    if (!enabled) return
    if (!diffuseMap) return
    const img: any = diffuseMap.image
    if (!img || !img.width || !img.height) return
    const W = img.width, H = img.height
    const items = atlas || []
    const rect: any = (items.find(i => i.name === spriteName) || items[0])
    if (!rect) return
    const repX = rect.width / W
    const repY = rect.height / H
    const offX = rect.x / W
    const offYFlipTrue = 1 - (rect.y + rect.height) / H
    const offYFlipFalse = rect.y / H
    const cx = offX + repX * 0.5
    const cyFlipTrue = offYFlipTrue + repY * 0.5
    const cyFlipFalse = offYFlipFalse + repY * 0.5
    const applyRect = (t: THREE.Texture | null) => {
      if (!t) return
      t.repeat.set(repX, repY)
      t.offset.set(offX, t.flipY ? offYFlipTrue : offYFlipFalse)
      t.center.set(0.0, 0.0)
      t.rotation = 0
      t.needsUpdate = true
    }
    applyRect(diffuseMap); applyRect(alphaMap); applyRect(normalMap); applyRect(roughnessMap)
    // Центр спрайта для вращения в шейдере
    const uniforms = getUniforms?.()
    if (uniforms && uniforms.uTexCenter) {
      const cy = (diffuseMap && diffuseMap.flipY === false) ? cyFlipFalse : cyFlipTrue
      uniforms.uTexCenter.value.set(cx, cy)
    }
    setTexAspect(rect.width / rect.height)
    // Anchor: нормированные координаты внутри прямоугольника (по умолчанию — нижняя середина)
    const ax = typeof rect.anchorX === 'number' ? rect.anchorX : (rect.anchor?.x)
    const ay = typeof rect.anchorY === 'number' ? rect.anchorY : (rect.anchor?.y)
    if (typeof ax === 'number' && typeof ay === 'number' && rect.width > 0 && rect.height > 0) {
      const uN = Math.min(1, Math.max(0, ax / rect.width))
      const vN = Math.min(1, Math.max(0, ay / rect.height))
      setAnchorUV([uN, vN])
    } else {
      setAnchorUV([0.5, 1.0])
    }
  }, [enabled, atlas, diffuseMap, alphaMap, normalMap, roughnessMap, spriteName])

  return { diffuseMap, alphaMap, normalMap, roughnessMap, atlas, texAspect, anchorUV }
}
