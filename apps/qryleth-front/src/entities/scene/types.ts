import type {LightingSettings} from "../lighting";
import type {GfxObjectInstance} from "../objectInstance";
import type { GfxLayerLegacy } from "@/entities/layer";
import type {GfxObject} from "@/entities/object";
import type { GfxBiome } from '@/entities/biome'
import type { GfxEnvironmentContent } from '@/entities/environment'
import type { GfxWaterBody } from '@/entities/water'
import type { GfxLandscape } from '@/entities/terrain'

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

export interface SceneLayer extends GfxLayerLegacy{
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
  /**
   * Содержимое ландшафтного слоя (единый контейнер, привязан к единственному слою типа Landscape).
   *
   * В новой архитектуре ландшафт описывается массивом площадок (террейнов/плоскостей),
   * хранящихся отдельно от тонкого слоя. `layerId` должен указывать на слой с `type: 'landscape'`.
   */
  landscapeContent?: { layerId: string; items: GfxLandscape[] } | null
  /**
   * Содержимое водных слоёв: массив контейнеров, каждый привязан к своему слою.
   *
   * Допускается любое число водных слоёв; внутри каждого — множество водоёмов (реки/озёра/море).
   */
  waterContent?: Array<{ layerId: string; items: GfxWaterBody[] }>
  /**
   * Содержимое окружения сцены: обязательный контейнер без привязки к слою.
   * Содержит параметры ветра, неба/тумана/экспозиции и наборы облаков.
   */
  environmentContent: GfxEnvironmentContent
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

