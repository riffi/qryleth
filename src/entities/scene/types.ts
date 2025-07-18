import type {GfxPrimitive} from "../primitive/model/types.ts";
import type {Vector3} from "../../shared/types/vector3.ts";
import type {GfxObject} from "../object/model/types.ts";
import type {Transform} from "../../shared/types/transform.ts";



export interface SceneObject extends GfxObject{
  layerId?: string;
  /** Controls visibility of all placements of this object */
  visible?: boolean;
}

export interface LightingSettings {
  ambientColor?: string;
  ambientIntensity?: number;
  directionalColor?: string;
  directionalIntensity?: number;
  backgroundColor?: string;
}

export interface ScenePlacement {
  uuid: string;
  objectUuid: string;
  transform?: Transform;
  /** Visibility of a particular placement/instance */
  visible?: boolean;
}

export interface SceneLayer {
  id: string;
  name: string;
  type?: 'object' | 'landscape';
  width?: number;
  height?: number;
  shape?: 'plane' | 'perlin';
  noiseData?: number[];
  visible: boolean;
  position: number;
}

export interface SceneResponse {
  objects: SceneObject[];
  placements: ScenePlacement[];
  layers?: SceneLayer[];
  lighting?: LightingSettings;
}
