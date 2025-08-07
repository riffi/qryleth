/**
 * Интерфейс материала в системе Qryleth
 * Совместим с Three.js MeshStandardMaterial (PBR)
 */
export interface GfxMaterial {
  /** Уникальный идентификатор материала */
  uuid: string;
  /** Название материала */
  name: string;
  /** Тип материала для категоризации */
  type: 'metal' | 'dielectric' | 'glass' | 'emissive' | 'custom';
  
  /** Свойства материала совместимые с Three.js MeshStandardMaterial */
  properties: {
    /** Базовый цвет материала в формате hex (Three.js: color) */
    color: string;
    /** Прозрачность материала 0.0-1.0 (Three.js: opacity) */
    opacity?: number;
    /** Флаг прозрачности (Three.js: transparent) */
    transparent?: boolean;
    /** Металличность материала 0.0-1.0 (Three.js: metalness) */
    metalness?: number;
    /** Шероховатость поверхности 0.0-1.0 (Three.js: roughness) */
    roughness?: number;
    /** Цвет эмиссии в формате hex (Three.js: emissive) */
    emissive?: string;
    /** Интенсивность эмиссии (Three.js: emissiveIntensity) */
    emissiveIntensity?: number;
    /** Коэффициент преломления (Three.js: ior) */
    ior?: number;
    /** Карта окружения интенсивность (Three.js: envMapIntensity) */
    envMapIntensity?: number;
    /** Режим двусторонних граней (Three.js: side) */
    side?: 'front' | 'back' | 'double';
    /** Альфа тест порог (Three.js: alphaTest) */
    alphaTest?: number;
    /** Отбрасывание теней (Three.js: castShadow на mesh) */
    castShadow?: boolean;
    /** Получение теней (Three.js: receiveShadow на mesh) */
    receiveShadow?: boolean;
  };
  
  /** Флаг глобального материала (доступен во всех сценах) */
  isGlobal: boolean;
  /** Опциональное описание материала */
  description?: string;
}

/**
 * Тип для создания нового материала без uuid
 */
export type CreateGfxMaterial = Omit<GfxMaterial, 'uuid'>;

/**
 * Предопределенные типы глобальных материалов
 */
export const GLOBAL_MATERIAL_TYPES = {
  WOOD: 'wood',
  METAL: 'metal', 
  EARTH: 'earth',
  STONE: 'stone',
  GLASS: 'glass',
} as const;

export type GlobalMaterialType = typeof GLOBAL_MATERIAL_TYPES[keyof typeof GLOBAL_MATERIAL_TYPES];