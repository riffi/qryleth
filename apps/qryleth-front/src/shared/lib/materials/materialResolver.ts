import type { GfxMaterial } from '@/entities/material';
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
