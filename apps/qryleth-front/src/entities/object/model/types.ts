import type {
  GfxPrimitive,
  GfxMaterial,
  GfxPrimitiveGroup,
  PointLightSettings,
  SpotLightSettings,
} from "@/entities";
import type { Vector3, BoundingBox } from "@/shared/types";

export interface GfxObject {
  uuid: string;
  name: string;
  primitives: GfxPrimitive[];
  /** Материалы, привязанные к объекту */
  materials?: GfxMaterial[];
  /**
   * Теги объекта.
   *
   * Используются для поиска/фильтрации в библиотеке и для систем
   * скаттеринга (биомы). На сцене теги не участвуют в логике, но
   * сохраняются как часть объекта для удобства редактирования.
   */
  tags?: string[];
  /** Ограничивающий прямоугольник объекта в локальных координатах */
  boundingBox?: BoundingBox;
  /** Группы примитивов - Record для эффективного доступа по UUID */
  primitiveGroups?: Record<string, GfxPrimitiveGroup>;
  /** Привязка примитивов к группам: primitiveUuid -> groupUuid */
  primitiveGroupAssignments?: Record<string, string>;
  /** Локальное освещение, перемещающееся вместе с объектом */
  localLights?: {
    /** Точечные источники света */
    point: PointLightSettings[];
    /** Прожекторные источники света */
    spot: SpotLightSettings[];
  };
}

export interface GfxObjectWithTransform extends GfxObject {
  position?: Vector3,
  scale?: Vector3,
  rotation?: Vector3,
  /** UUID объекта в библиотеке, если он был сохранён там */
  libraryUuid?: string
}
