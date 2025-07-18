import type { Vector3 } from "../../../shared/types/vector3.ts";

export interface Primitive {
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
