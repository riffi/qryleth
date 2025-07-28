import type {GfxPrimitive} from "@/entities";
import type {Vector3} from "@/shared/types";

export interface GfxObject {
  uuid: string;
  name: string;
  primitives: GfxPrimitive[];
}

export interface GFXObjectWithTransform extends GfxObject {
  position?: Vector3,
  scale?: Vector3,
  rotation?: Vector3,
  /** UUID объекта в библиотеке, если он был сохранён там */
  libraryUuid?: string
}
