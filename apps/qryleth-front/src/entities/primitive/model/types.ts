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
  /**
   * Параметры «воротника» у основания сегмента/ветви: плавное увеличение радиуса
   * на начальном участке высоты для мягкого перехода в родителя/предыдущий сегмент.
   * Если не заданы или collarFrac = 0 — эффект отключён.
   */
  collarFrac?: number;   // Доля высоты [0..1] от низа, где действует воротник
  collarScale?: number;  // Множитель радиуса у самого низа (>1 — расширение)
  /**
   * Флаги отрисовки торцевых крышек цилиндра (caps). По умолчанию обе крышки включены.
   * Для ствола/ветвей мы, как правило, скрываем нижнюю крышку для всех внутренних
   * сегментов и верхнюю крышку — для всех, кроме самого верхнего сегмента,
   * чтобы не было видимых круглых граней в местах стыков.
   */
  capTop?: boolean;
  capBottom?: boolean;
}

export interface LeafBillboardGeometry {
  /**
   * Базовый размер листа (используется как радиус/масштаб)
   */
  radius: number;
  /**
   * Единственный поддерживаемый способ отрисовки листвы — текстурированные билборды.
   * Ранее поддерживались варианты 'billboard', 'sphere' и 'coniferCross',
   * теперь они удалены. Свойство сохранено для явной фиксации варианта.
   */
  shape?: 'texture';
  /**
   * Имя спрайта (подпрямоугольника) из atlas.json выбранного набора.
   * Если не задано — используется первый элемент.
   */
  texSpriteName?: string;
}

// Произвольная меш‑геометрия (позиции/нормали/индексы)
export interface CustomMeshGeometry {
  /** Плоский массив координат вершин: [x0,y0,z0, x1,y1,z1, ...] */
  positions: number[]
  /** Плоский массив нормалей (опционально, но рекомендуется): [nx0,ny0,nz0, ...] */
  normals?: number[]
  /** Индексы треугольников (опционально — если не задано, используем non-indexed) */
  indices?: number[]
  /** Текстурные координаты (необязательно) */
  uvs?: number[]
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
  | ({ type: 'leaf';     geometry: LeafBillboardGeometry; } & PrimitiveCommon)
  | ({ type: 'mesh';     geometry: CustomMeshGeometry; } & PrimitiveCommon);

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
