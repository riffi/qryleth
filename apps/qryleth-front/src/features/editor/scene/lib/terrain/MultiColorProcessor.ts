import * as THREE from 'three'
import type { GfxMultiColorConfig, GfxMultiColorPaletteStop } from '../../../../entities/layer/model/types'
import type { GlobalPalette } from '@/entities/palette'

/**
 * Минимально-самодостаточный, но расширяемый процессор многоцветной окраски.
 * Поддерживает два режима:
 *  - 'vertex'   — вершинная окраска (как раньше)
 *  - 'triangle' — плоская окраска по треугольникам (дублируем вершины)
 *
 * Конфиг (необязательный):
 * {
 *   mode?: 'vertex' | 'triangle',
 *   // Палитра по высоте (worldY). Сортировка по height — снизу вверх.
 *   palette?: { height: number; color: string }[],
 *   // Вклад горбистости/крутизны (0..1). Прибавляется к яркости цвета.
 *   slopeBoost?: number
 * }
 */

export class MultiColorProcessor {
  private palette: Array<{ height: number; color: string; alpha: number }>
  private slopeBoost: number

  constructor(private readonly config: GfxMultiColorConfig = {}, private readonly activePalette?: GlobalPalette) {
    const rawStops: GfxMultiColorPaletteStop[] = (config.palette ?? [
      { height: -10, color: '#2d5a27', alpha: 1.0 },
      { height: 0,   color: '#4a7c59', alpha: 1.0 },
      { height: 10,  color: '#8aa05a', alpha: 1.0 },
      { height: 25,  color: '#b7b7b7', alpha: 1.0 },
      { height: 100, color: '#eaeaea', alpha: 1.0 },
    ]).slice().sort((a, b) => a.height - b.height)

    // Преобразуем стопы: резолвим роль → базовый цвет и применяем tint К КАЖДОМУ стопу ДО интерполяции
    this.palette = rawStops.map(s => ({
      height: s.height,
      color: resolveStopHexColor(s, activePalette),
      alpha: s.alpha ?? 1.0,
    }))

    this.slopeBoost = Math.min(Math.max(config.slopeBoost ?? 0, 0), 1)
  }

  /**
   * ВЕРШИННАЯ окраска — возвращает Float32Array (r,g,b,a per vertex).
   * geom: ожидается BufferGeometry с атрибутом 'position' (и желательно 'normal').
   * sampler: не обязателен; при желании можно забирать высоты из него.
   */
  generateVertexColors(
      _sampler: unknown,
      geom: THREE.BufferGeometry
  ): Float32Array {
    const pos = geom.attributes.position as THREE.BufferAttribute
    const normal = geom.attributes.normal as THREE.BufferAttribute | undefined

    const count = pos.count
    const colors = new Float32Array(count * 4) // RGBA вместо RGB

    const n = new THREE.Vector3()
    const c = new THREE.Color()
    let alpha = 1.0

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)

      if (normal) n.set(normal.getX(i), normal.getY(i), normal.getZ(i))
      else n.set(0, 1, 0)

      // базовый цвет и прозрачность по высоте
      alpha = this.samplePaletteByHeight(y, c)

      // модификация яркости от крутизны склона
      if (this.slopeBoost > 0) {
        // косинус угла к вертикали: чем ближе к 0 — тем круче склон
        const steep = 1 - Math.abs(n.y) // 0 — плоско, 1 — вертикально
        const factor = 1 + (steep * this.slopeBoost) * 0.4 // поднимем яркость до +40%
        c.multiplyScalar(factor)
        c.r = Math.min(1, c.r)
        c.g = Math.min(1, c.g)
        c.b = Math.min(1, c.b)
      }

      const o = i * 4
      colors[o + 0] = c.r
      colors[o + 1] = c.g
      colors[o + 2] = c.b
      colors[o + 3] = alpha
    }

    return colors
  }

  /**
   * ТРЕУГОЛЬНАЯ (по-граням) окраска — создаёт НОВУЮ геометрию без индексов,
   * где вершины продублированы по 3 на каждую грань, и у всех трёх один и тот же цвет.
   */
  generateFaceColoredGeometry(
      sampler: unknown,
      geom: THREE.BufferGeometry
  ): THREE.BufferGeometry {
    const srcPos = geom.getAttribute('position') as THREE.BufferAttribute
    if (!srcPos) {
      console.warn('MultiColorProcessor: geometry has no position attribute')
      return geom
    }

    const hasIndex = !!geom.getIndex()
    const index = geom.getIndex()?.array as (Uint16Array | Uint32Array | number[]) | undefined

    // Нормали не обязательны — пересчитаем потом
    const srcNorm = geom.getAttribute('normal') as THREE.BufferAttribute | undefined

    const positions: number[] = []
    const colors: number[] = [] // теперь будет RGBA
    const normals: number[] = []

    const vA = new THREE.Vector3()
    const vB = new THREE.Vector3()
    const vC = new THREE.Vector3()

    const nA = new THREE.Vector3()
    const nB = new THREE.Vector3()
    const nC = new THREE.Vector3()

    const center = new THREE.Vector3()
    const faceColor = new THREE.Color()
    let faceAlpha = 1.0

    const pushVertex = (vx: number, vy: number, vz: number, color: THREE.Color, alpha: number, nx?: number, ny?: number, nz?: number) => {
      positions.push(vx, vy, vz)
      colors.push(color.r, color.g, color.b, alpha)
      if (nx !== undefined && ny !== undefined && nz !== undefined) {
        normals.push(nx, ny, nz)
      } else {
        // заполним позже computeVertexNormals()
        normals.push(0, 0, 0)
      }
    }

    const triCount = hasIndex ? (index!.length / 3) : (srcPos.count / 3)

    for (let f = 0; f < triCount; f++) {
      let a: number, b: number, c: number
      if (hasIndex) {
        a = (index as any)[f * 3 + 0]
        b = (index as any)[f * 3 + 1]
        c = (index as any)[f * 3 + 2]
      } else {
        a = f * 3 + 0
        b = f * 3 + 1
        c = f * 3 + 2
      }

      vA.set(srcPos.getX(a), srcPos.getY(a), srcPos.getZ(a))
      vB.set(srcPos.getX(b), srcPos.getY(b), srcPos.getZ(b))
      vC.set(srcPos.getX(c), srcPos.getY(c), srcPos.getZ(c))

      // возьмём цвет и прозрачность по центру треугольника (стабильнее, чем первая вершина)
      center.set((vA.x + vB.x + vC.x) / 3, (vA.y + vB.y + vC.y) / 3, (vA.z + vB.z + vC.z) / 3)
      faceAlpha = this.samplePaletteByHeight(center.y, faceColor)

      if (this.slopeBoost > 0 && srcNorm) {
        nA.set(srcNorm.getX(a), srcNorm.getY(a), srcNorm.getZ(a))
        nB.set(srcNorm.getX(b), srcNorm.getY(b), srcNorm.getZ(b))
        nC.set(srcNorm.getX(c), srcNorm.getY(c), srcNorm.getZ(c))
        const ny = (nA.y + nB.y + nC.y) / 3
        const steep = 1 - Math.abs(ny)
        const factor = 1 + (steep * this.slopeBoost) * 0.4
        faceColor.multiplyScalar(factor)
        faceColor.r = Math.min(1, faceColor.r)
        faceColor.g = Math.min(1, faceColor.g)
        faceColor.b = Math.min(1, faceColor.b)
      }

      // продублируем вершины, у всех цвет и прозрачность одинаковые
      pushVertex(vA.x, vA.y, vA.z, faceColor, faceAlpha)
      pushVertex(vB.x, vB.y, vB.z, faceColor, faceAlpha)
      pushVertex(vC.x, vC.y, vC.z, faceColor, faceAlpha)
    }

    const newGeom = new THREE.BufferGeometry()
    newGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    newGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4))
    // нормали пересчитаем для корректного освещения
    newGeom.computeVertexNormals()

    return newGeom
  }

  // ===== helpers =====

  private samplePaletteByHeight(y: number, out: THREE.Color): number {
    // поиск двух ближайших стопов по высоте и линейная интерполяция цветов и прозрачности
    const stops = this.palette
    if (stops.length === 0) { out.set('#ffffff'); return 1.0 }

    if (y <= stops[0].height) { 
      out.set(stops[0].color)
      return stops[0].alpha ?? 1.0
    }
    if (y >= stops[stops.length - 1].height) { 
      out.set(stops[stops.length - 1].color)
      return stops[stops.length - 1].alpha ?? 1.0
    }

    let i1 = 0
    for (let i = 0; i < stops.length - 1; i++) {
      if (y >= stops[i].height && y <= stops[i + 1].height) {
        i1 = i
        break
      }
    }
    const a = stops[i1]
    const b = stops[i1 + 1]
    const t = (y - a.height) / Math.max(1e-6, (b.height - a.height))

    const ca = new THREE.Color(a.color)
    const cb = new THREE.Color(b.color)
    out.r = ca.r + (cb.r - ca.r) * t
    out.g = ca.g + (cb.g - ca.g) * t
    out.b = ca.b + (cb.b - ca.b) * t
    
    // интерполяция прозрачности
    const alphaA = a.alpha ?? 1.0
    const alphaB = b.alpha ?? 1.0
    return alphaA + (alphaB - alphaA) * t
  }
}

// ===== helpers for tint & role resolve =====

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 }
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(Math.max(0, Math.min(255, Math.round(r))))}${toHex(Math.max(0, Math.min(255, Math.round(g))))}${toHex(Math.max(0, Math.min(255, Math.round(b))))}`
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max
  if (d !== 0) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h, s, v }
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  let r = 0, g = 0, b = 0
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  return { r: r * 255, g: g * 255, b: b * 255 }
}

/**
 * Применить к цвету (HEX) корректировки HSV:
 * - tint (Value): [-1..+1]
 * - hueTowards (Hue): интерполяция к целевому оттенку (deg: 0..360, t: 0..1)
 * - saturationShift (Saturation): [-1..+1]
 * Возвращает HEX результата после клампинга.
 */
function applyColorAdjustments(hex: string, opts?: { tint?: number; hueTowards?: { deg: number; t: number }; saturationShift?: number }): string {
  if (!opts) return hex
  const { tint, hueTowards, saturationShift } = opts
  if (!tint && !hueTowards && !saturationShift) return hex
  const { r, g, b } = hexToRgb(hex)
  let { h, s, v } = rgbToHsv(r, g, b)
  if (hueTowards && Number.isFinite(hueTowards.deg) && Number.isFinite(hueTowards.t)) {
    const t = Math.max(0, Math.min(1, hueTowards.t))
    const h0 = h
    let h1 = ((hueTowards.deg % 360) + 360) % 360 / 360
    let d = h1 - h0
    if (d > 0.5) d -= 1
    if (d < -0.5) d += 1
    h = ((h0 + t * d) % 1 + 1) % 1
  }
  if (Number.isFinite(saturationShift as number) && (saturationShift as number) !== 0) {
    s = Math.max(0, Math.min(1, s + (saturationShift as number)))
  }
  if (Number.isFinite(tint as number) && (tint as number) !== 0) {
    v = Math.max(0, Math.min(1, v + (tint as number)))
  }
  const rgb2 = hsvToRgb(h, s, v)
  return rgbToHex(rgb2.r, rgb2.g, rgb2.b)
}

function resolveStopHexColor(stop: GfxMultiColorPaletteStop, palette?: GlobalPalette): string {
  // Приоритет colorSource
  if (stop.colorSource) {
    if (stop.colorSource.type === 'role') {
      const base = (palette?.colors as any)?.[stop.colorSource.role] || stop.color || '#ffffff'
      return applyColorAdjustments(base, {
        tint: (stop.colorSource as any).tint,
        hueTowards: (stop.colorSource as any).hueTowards,
        saturationShift: (stop.colorSource as any).saturationShift,
      })
    }
    // fixed для стопа — используем color
    return stop.color || '#ffffff'
  }
  return stop.color || '#ffffff'
}
