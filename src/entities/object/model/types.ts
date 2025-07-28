import type {GfxPrimitive} from "@/entities";
import type {Vector3, BoundingBox} from "@/shared/types";

export interface GfxObject {
  uuid: string;
  name: string;
  primitives: GfxPrimitive[];
  /** Ограничивающий прямоугольник объекта в локальных координатах */
  boundingBox?: BoundingBox;
}

export interface GFXObjectWithTransform extends GfxObject {
  position?: Vector3,
  scale?: Vector3,
  rotation?: Vector3,
  /** UUID объекта в библиотеке, если он был сохранён там */
  libraryUuid?: string
}
