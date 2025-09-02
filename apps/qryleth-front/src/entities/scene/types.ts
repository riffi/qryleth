import type {LightingSettings} from "../lighting";
import type {GfxObjectInstance} from "../objectInstance";
import type {GfxLayer} from "@/entities/layer";
import type {GfxObject} from "@/entities/object";
import type { GfxBiome } from '@/entities/biome'

export interface SceneObject extends GfxObject{
  layerId?: string;
  /** Controls visibility of all object instances of this object */
  visible?: boolean;
  /** UUID объекта в библиотеке, если он был добавлен из неё */
  libraryUuid?: string;
}

export interface SceneObjectInstance extends GfxObjectInstance{
  /** Visibility of a particular instance */
  visible?: boolean;
}

export interface SceneLayer extends GfxLayer{
  /** Видимость слоя в сцене **/
  visible: boolean;
  position: number;
}

export interface SceneData {
  objects: SceneObject[]
  objectInstances: SceneObjectInstance[]
  layers: SceneLayer[]
  lighting: LightingSettings
  /** Биомы сцены (области скаттеринга и их параметры) */
  biomes: GfxBiome[]
}

/**
 * Статус сцены: доменный тип (entities).
 */
export type SceneStatus = 'draft' | 'saved' | 'modified'

/**
 * Метаданные сцены: доменный тип (entities).
 */
export interface SceneMetaData {
  uuid?: string
  name: string
  status: SceneStatus
}

