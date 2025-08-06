export interface LightingSettings {
  ambientColor?: string;
  ambientIntensity?: number;
  directionalColor?: string;
  directionalIntensity?: number;
  backgroundColor?: string;
  ambientOcclusion?: {
    enabled?: boolean;
    intensity?: number;
    radius?: number;
  };
}
