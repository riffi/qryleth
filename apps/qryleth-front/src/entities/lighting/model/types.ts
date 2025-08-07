/**
 * Типы, описывающие систему освещения сцены
 * и параметры отдельных источников света.
 */

/**
 * Базовые параметры любого источника света.
 */
interface BaseLight {
  /** Уникальный идентификатор источника */
  uuid: string;
  /** Цвет излучаемого света в формате hex */
  color?: string;
  /** Интенсивность свечения */
  intensity?: number;
  /** Флаг видимости источника */
  visible?: boolean;
}

/**
 * Настройки окружающего (ambient) освещения.
 */
export interface AmbientLightSettings extends BaseLight {}

/**
 * Настройки направленного (directional) света,
 * используемого, например, для моделирования солнца.
 */
export interface DirectionalLightSettings extends BaseLight {
  /** Позиция источника в мировых координатах */
  position: [number, number, number];
  /** Точка, на которую направлен свет */
  target?: [number, number, number];
  /** Включена ли генерация теней */
  castShadow?: boolean;
  /** Дополнительные параметры теней */
  shadowProps?: {
    /** Размер карты теней */
    mapSize?: [number, number];
    /** Дальность камеры теней */
    cameraFar?: number;
  };
}

/**
 * Настройки точечного (point) источника света.
 */
export interface PointLightSettings extends BaseLight {
  /** Позиция источника в мировых координатах */
  position: [number, number, number];
  /** Радиус действия света */
  distance?: number;
  /** Коэффициент затухания */
  decay?: number;
}

/**
 * Настройки прожекторного (spot) источника света.
 */
export interface SpotLightSettings extends BaseLight {
  /** Позиция источника в мировых координатах */
  position: [number, number, number];
  /** Точка, на которую направлен прожектор */
  target?: [number, number, number];
  /** Угол раскрытия луча (в радианах) */
  angle?: number;
  /** Мягкость краёв луча */
  penumbra?: number;
  /** Радиус действия света */
  distance?: number;
  /** Включена ли генерация теней */
  castShadow?: boolean;
}

/**
 * Корневые настройки освещения сцены.
 */
export interface LightingSettings {
  /** Окружающий свет сцены */
  ambient?: AmbientLightSettings;
  /** Направленный свет (например, солнце) */
  directional?: DirectionalLightSettings;
  /** Параметры эффекта ambient occlusion */
  ambientOcclusion?: {
    /** Включён ли эффект */
    enabled?: boolean;
    /** Интенсивность эффекта */
    intensity?: number;
    /** Радиус выборки */
    radius?: number;
  };
  /** Цвет фона сцены */
  backgroundColor?: string;
}

