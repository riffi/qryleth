export interface GfxLayer {
  id: string;
  name: string;
  type?: 'object' | 'landscape' | 'sea';
  width?: number;
  height?: number;
  shape?: 'plane' | 'perlin';
  noiseData?: number[];
}
