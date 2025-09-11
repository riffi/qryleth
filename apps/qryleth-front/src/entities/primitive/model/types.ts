import type { Vector3 } from "@/shared/types";

// Геометрические интерфейсы для каждого типа примитива
export interface BoxGeometry {
  width: number;
  height: number;
  depth: number;
}

export interface SphereGeometry {
  radius: number;
}

export interface CylinderGeometry {
  radiusTop: number;
  radiusBottom: number;
  height: number;
  radialSegments?: number;
}

export interface ConeGeometry {
  radius: number;
  height: number;
  radialSegments?: number;
}

export interface PyramidGeometry {
  baseSize: number;
  height: number;
}

export interface PlaneGeometry {
  width: number;
  height: number;
}

export interface TorusGeometry {
  majorRadius: number;
  minorRadius: number;
  radialSegments?: number;
  tubularSegments?: number;
}

// Специализированные геометрии для процедурных деревьев
export interface TreeCylinderGeometry {
  radiusTop: number;
  radiusBottom: number;
  height: number;
  radialSegments?: number;
}

export interface LeafBillboardGeometry {
  /** Базовый размер листа (используется как радиус/масштаб) */
  radius: number;
  /**
   * Способ отрисовки листа: 'billboard' (плоская плоскость с маской)
   * или 'sphere' (объёмная сфера). По умолчанию 'billboard'.
   */
  shape?: 'billboard' | 'sphere';
}

// Общие свойства примитивов
export interface PrimitiveCommon {
  /** Уникальный идентификатор примитива */
  uuid: string;
  /** Название примитива */
  name?: string;
  
  /** Свойства материала */
  material?: {
    color?: string;
    opacity?: number;
    emissive?: string;
    emissiveIntensity?: number;
  };
  /** UUID материала объекта */
  objectMaterialUuid?: string;
  /** UUID глобального материала */
  globalMaterialUuid?: string;

  /**
   * Видимость примитива. Если значение false, примитив не отображается
   * в сцене, но остаётся частью объекта.
   */
  visible?: boolean;

  /** Трансформации объекта */
  transform?: {
    position?: Vector3;
    rotation?: Vector3;
    scale?: Vector3;
  };
}

// Дискриминированное объединение для строгой типизации
export type GfxPrimitive =
  | ({ type: 'box';      geometry: BoxGeometry;      } & PrimitiveCommon)
  | ({ type: 'sphere';   geometry: SphereGeometry;   } & PrimitiveCommon)
  | ({ type: 'cylinder'; geometry: CylinderGeometry; } & PrimitiveCommon)
  | ({ type: 'cone';     geometry: ConeGeometry;     } & PrimitiveCommon)
  | ({ type: 'pyramid';  geometry: PyramidGeometry;  } & PrimitiveCommon)
  | ({ type: 'plane';    geometry: PlaneGeometry;    } & PrimitiveCommon)
  | ({ type: 'torus';    geometry: TorusGeometry;    } & PrimitiveCommon)
  // Специальные типы для деревьев: не путаются с общими цилиндрами/сферами
  | ({ type: 'trunk';    geometry: TreeCylinderGeometry; } & PrimitiveCommon)
  | ({ type: 'branch';   geometry: TreeCylinderGeometry; } & PrimitiveCommon)
  | ({ type: 'leaf';     geometry: LeafBillboardGeometry; } & PrimitiveCommon);

// Старый интерфейс для обратной совместимости (будет удален в будущих фазах)
export interface LegacyGfxPrimitive {
  type: 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'plane' | 'torus';
  /** Название примитива */
  name?: string;
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  radialSegments?: number;
  tubularSegments?: number;
  majorRadius?: number;
  minorRadius?: number;
  baseSize?: number;
  color?: string;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
}
