export interface GfxLayer {
  id: string;
  name: string;
  type?: 'object' | 'landscape';
  width?: number;
  height?: number;
  shape?: 'plane' | 'perlin';
  noiseData?: number[];
}
