import type {Vector3} from './common';

export interface ScenePrimitive {
  type: 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'plane';
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  radialSegments?: number;
  baseSize?: number;
  color?: string;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
}

export interface SceneObject {
  name: string;
  primitives: ScenePrimitive[];
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
  objectIndex: number;
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
