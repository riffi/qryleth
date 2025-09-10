import type { GfxMaterial } from '@/entities/material';
import type { ColorSource, GlobalPalette } from '@/entities/palette'
import { materialRegistry } from './MaterialRegistry';

/**
 * Дефолтный материал, используемый когда материал не найден
 * Совместим с Three.js MeshStandardMaterial
 */
export const DEFAULT_MATERIAL: GfxMaterial = {
  uuid: 'default-material',
  name: 'Дефолтный материал',
  type: 'dielectric',
  properties: {
    color: '#808080', // Серый цвет
    opacity: 1.0,
    transparent: false,
    metalness: 0.0,
    roughness: 0.5,
    castShadow: true,
    receiveShadow: true,
  },
  isGlobal: true,
  description: 'Дефолтный серый материал, используемый при ошибках резолвинга',
};

/**
 * Настройки приоритета резолвинга материалов
 */
export interface MaterialResolutionContext {
  /** Прямой материал примитива (наивысший приоритет) */
  directMaterial?: {
    color?: string;
    opacity?: number;
    emissive?: string;
    emissiveIntensity?: number;
  };
  /** UUID материала объекта */
  objectMaterialUuid?: string;
  /** UUID глобального материала */
  globalMaterialUuid?: string;
  /** Материалы объекта для поиска по UUID */
  objectMaterials?: GfxMaterial[];
}

/**
 * Резолвит материал согласно иерархии приоритетов:
 * 1. Прямой материал примитива (для обратной совместимости)
 * 2. Материал объекта по objectMaterialUuid
 * 3. Глобальный материал по globalMaterialUuid
 * 4. Дефолтный материал
 */
export function resolveMaterial(context: MaterialResolutionContext): GfxMaterial {
  // 1. Прямой материал примитива (обратная совместимость)
  if (context.directMaterial) {
    return convertLegacyMaterial(context.directMaterial);
  }

  // 2. Материал объекта по objectMaterialUuid
  if (context.objectMaterialUuid && context.objectMaterials) {
    const objectMaterial = context.objectMaterials.find(
      material => material.uuid === context.objectMaterialUuid
    );
    if (objectMaterial) {
      return objectMaterial;
    }
  }

  // 3. Глобальный материал по globalMaterialUuid
  if (context.globalMaterialUuid) {
    const globalMaterial = materialRegistry.get(context.globalMaterialUuid);
    if (globalMaterial) {
      return globalMaterial;
    }
  }

  // 4. Дефолтный материал
  return DEFAULT_MATERIAL;
}

/**
 * Преобразует цвет из HEX в HSV и обратно; применяется для tint по компоненту Value.
 * Внимание: минимальная реализация без зависимостей.
 */
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
 * Применяет tint ([-1..+1]) к компоненту Value (HSV) указанного цвета.
 * Используется для осветления/затемнения, с клампингом в [0..1].
 */
/**
 * Применяет набор корректировок к HSV-компонентам исходного цвета.
 *
 * Поддерживаемые корректировки:
 * - tint          — сдвиг Value (яркость)       в [-1..+1]
 * - hueTowards   — интерполяция Hue по кратчайшей дуге к целевому (deg: 0..360, t: 0..1)
 * - saturationShift — сдвиг Saturation (насыщенность) в [-1..+1]
 *
 * Корректировки применяются аддитивно с клампингом в допустимые диапазоны.
 * Возвращает HEX строку результата.
 */
function applyColorAdjustments(hex: string, opts?: { tint?: number; hueTowards?: { deg: number; t: number }; saturationShift?: number }): string {
  if (!opts) return hex
  const { tint, hueTowards, saturationShift } = opts
  if (!tint && !hueTowards && !saturationShift) return hex
  const { r, g, b } = hexToRgb(hex)
  let { h, s, v } = rgbToHsv(r, g, b)
  // Hue — 0..1, hueTowards: двигаемся по кратчайшей дуге к целевому углу
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

// Обратная совместимость: старые вызовы tint
function applyTintToHex(hex: string, tint?: number): string { return applyColorAdjustments(hex, { tint }) }

/**
 * Резолвит базовый цвет (HEX) для материала с учётом ColorSource и активной палитры.
 * Если ColorSource не задан — возвращает material.properties.color.
 */
export function resolveMaterialBaseColor(material: GfxMaterial, palette?: GlobalPalette): string {
  const src: ColorSource | undefined = (material.properties as any).colorSource
  const fallback = material.properties.color || '#808080'
  if (!src || src.type === 'fixed') return fallback
  // role
  const base = palette?.colors?.[src.role] || fallback
  return applyColorAdjustments(base, { tint: (src as any).tint, hueTowards: (src as any).hueTowards, saturationShift: (src as any).saturationShift })
}

/**
 * Конвертирует GfxMaterial в свойства Three.js с учётом активной палитры (ColorSource).
 * Если палитра не передана — используется fallback на собственный цвет материала.
 */
export function materialToThreePropsWithPalette(material: GfxMaterial, palette?: GlobalPalette) {
  const props = material.properties;
  const colorHex = resolveMaterialBaseColor(material, palette)
  return {
    color: colorHex,
    opacity: props.opacity ?? 1.0,
    transparent: props.transparent ?? (props.opacity !== undefined && props.opacity < 1.0),
    metalness: props.metalness ?? 0.0,
    roughness: props.roughness ?? 0.5,
    emissive: props.emissive,
    emissiveIntensity: props.emissiveIntensity ?? 0.0,
    ior: props.ior ?? 1.5,
    envMapIntensity: props.envMapIntensity ?? 1.0,
    side: props.side === 'double' ? 2 : props.side === 'back' ? 1 : 0,
    alphaTest: props.alphaTest ?? 0.0,
  };
}

/**
 * Конвертирует старый формат материала в новый GfxMaterial
 * Совместимый с Three.js MeshStandardMaterial
 */
function convertLegacyMaterial(legacyMaterial: {
  color?: string;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
}): GfxMaterial {
  const opacity = legacyMaterial.opacity ?? 1.0;
  const transparent = opacity < 1.0;

  return {
    uuid: `legacy-${Date.now()}-${Math.random()}`,
    name: 'Legacy Material',
    type: 'custom',
    properties: {
      color: legacyMaterial.color || '#808080',
      opacity: opacity,
      transparent: transparent,
      metalness: 0.0,
      roughness: 0.5,
      emissive: legacyMaterial.emissive,
      emissiveIntensity: legacyMaterial.emissiveIntensity,
      castShadow: true,
      receiveShadow: true,
    },
    isGlobal: false,
    description: 'Автоматически сконвертированный материал из старого формата',
  };
}


/**
 * Проверяет, является ли материал эмиссивным (светящимся)
 */
export function isEmissiveMaterial(material: GfxMaterial): boolean {
  return (
    material.type === 'emissive' ||
    Boolean(material.properties.emissive && material.properties.emissiveIntensity && material.properties.emissiveIntensity > 0)
  );
}

/**
 * Проверяет, является ли материал прозрачным
 */
export function isTransparentMaterial(material: GfxMaterial): boolean {
  return material.properties.opacity !== undefined && material.properties.opacity < 1.0;
}

/**
 * Проверяет, является ли материал металлическим
 */
export function isMetallicMaterial(material: GfxMaterial): boolean {
  return material.type === 'metal' || (material.properties.metalness !== undefined && material.properties.metalness > 0.5);
}

/**
 * Конвертирует GfxMaterial в свойства для Three.js MeshStandardMaterial
 */
export function materialToThreeProps(material: GfxMaterial) {
  const props = material.properties;

  return {
    color: props.color,
    opacity: props.opacity ?? 1.0,
    transparent: props.transparent ?? (props.opacity !== undefined && props.opacity < 1.0),
    metalness: props.metalness ?? 0.0,
    roughness: props.roughness ?? 0.5,
    emissive: props.emissive,
    emissiveIntensity: props.emissiveIntensity ?? 0.0,
    ior: props.ior ?? 1.5,
    envMapIntensity: props.envMapIntensity ?? 1.0,
    side: props.side === 'double' ? 2 : props.side === 'back' ? 1 : 0, // THREE.DoubleSide : THREE.BackSide : THREE.FrontSide
    alphaTest: props.alphaTest ?? 0.0,
  };
}

/**
 * Получает свойства меша (castShadow, receiveShadow) из материала
 */
export function getMeshPropsFromMaterial(material: GfxMaterial) {
  return {
    castShadow: material.properties.castShadow ?? true,
    receiveShadow: material.properties.receiveShadow ?? true,
  };
}
