export interface GfxLayer {
  id: string;
  name: string;
  type?: 'object' | 'landscape' | 'water';
  width?: number;
  height?: number;
  shape?: 'plane' | 'perlin';
  noiseData?: number[];
  color?: string;
}
