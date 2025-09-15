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
  /**
   * Тип графического объекта.
   * - 'regular' — обычный объект, который хранит геометрию как набор примитивов в поле `primitives`.
   * - 'tree' — процедурный объект «дерево», который НЕ хранит набор примитивов,
   *   а хранит параметры генерации в `treeData` и в рантайме восстанавливается в примитивы.
   *
   * Поле опционально для обратной совместимости: отсутствие трактуется как 'regular'.
   */
  objectType?: 'regular' | 'tree';
  /**
   * Параметры процедурного дерева (для objectType = 'tree').
   *
   * Хранит сериализованные входные параметры генератора и UUID материалов коры/листвы.
   * Эти данные используются для детерминированной реконструкции дерева при отображении/использовании.
   *
   * Замечание по слоям архитектуры: тип параметров генератора определяется во фиче редактора,
   * поэтому здесь используется `any` для исключения циклических зависимостей. Должен содержать
   * объект, совместимый с TreeGeneratorParams.
   */
  treeData?: {
    /** Сериализованные параметры процедурной генерации дерева (совместимы с TreeGeneratorParams). */
    params: any;
    /** UUID материала коры (применяется к стволу и ветвям). */
    barkMaterialUuid: string;
    /** UUID материала листвы. */
    leafMaterialUuid: string;
  };
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
