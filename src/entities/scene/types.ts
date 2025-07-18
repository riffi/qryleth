import type {Vector3} from './common';
import type {Primitive} from "../primitive/model/types.ts";



export interface SceneObject {
  uuid: string;
  name: string;
  primitives: Primitive[];
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
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
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
