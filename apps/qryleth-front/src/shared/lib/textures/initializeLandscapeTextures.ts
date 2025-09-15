import { landscapeTextureRegistry } from './LandscapeTextureRegistry'

/**
 * Инициализация реестра текстур ландшафта.
 *
 * На текущем этапе регистрируется одна «зашитая» текстура травы Grass006 (1K, JPG),
 * соответствующая структуре ресурсов в `public/texture/landscape/Grass006_1K-JPG`.
 *
 * В дальнейшем сюда можно добавлять другие текстуры или подгружать конфигурацию извне.
 */
export function initializeLandscapeTextures(): void {
  const base = '/texture/landscape/Grass006_1K-JPG/'
  landscapeTextureRegistry.register({
    id: 'grass006-1k-jpg',
    name: 'Grass 006 (1K, JPG)',
    previewUrl: base + 'Grass006.png',
    colorMapUrl: base + 'Grass006_1K-JPG_Color.jpg',
    normalMapUrl: base + 'Grass006_1K-JPG_NormalGL.jpg',
    roughnessMapUrl: base + 'Grass006_1K-JPG_Roughness.jpg',
    aoMapUrl: base + 'Grass006_1K-JPG_AmbientOcclusion.jpg',
    displacementMapUrl: base + 'Grass006_1K-JPG_Displacement.jpg',
  })

  // Дополнительная текстура: Grass005 (1K, JPG)
  const base005 = '/texture/landscape/Grass005_1K-JPG/'
  landscapeTextureRegistry.register({
    id: 'grass005-1k-jpg',
    name: 'Grass 005 (1K, JPG)',
    previewUrl: base005 + 'Grass005.png',
    colorMapUrl: base005 + 'Grass005_1K-JPG_Color.jpg',
    normalMapUrl: base005 + 'Grass005_1K-JPG_NormalGL.jpg',
    roughnessMapUrl: base005 + 'Grass005_1K-JPG_Roughness.jpg',
    aoMapUrl: base005 + 'Grass005_1K-JPG_AmbientOcclusion.jpg',
    displacementMapUrl: base005 + 'Grass005_1K-JPG_Displacement.jpg',
  })

  // Дополнительная текстура: Gravel040 (1K, JPG)
  const baseGravel040 = '/texture/landscape/Gravel040_1K-JPG/'
  landscapeTextureRegistry.register({
    id: 'gravel040-1k-jpg',
    name: 'Gravel 040 (1K, JPG)',
    previewUrl: baseGravel040 + 'Gravel040.png',
    colorMapUrl: baseGravel040 + 'Gravel040_1K-JPG_Color.jpg',
    normalMapUrl: baseGravel040 + 'Gravel040_1K-JPG_NormalGL.jpg',
    roughnessMapUrl: baseGravel040 + 'Gravel040_1K-JPG_Roughness.jpg',
    aoMapUrl: baseGravel040 + 'Gravel040_1K-JPG_AmbientOcclusion.jpg',
    displacementMapUrl: baseGravel040 + 'Gravel040_1K-JPG_Displacement.jpg',
  })

  // Дополнительная текстура: Snow010A (1K, JPG)
  const baseSnow010A = '/texture/landscape/Snow010A_1K-JPG/'
  landscapeTextureRegistry.register({
    id: 'snow010a-1k-jpg',
    name: 'Snow 010A (1K, JPG)',
    previewUrl: baseSnow010A + 'Snow010A.png',
    colorMapUrl: baseSnow010A + 'Snow010A_1K-JPG_Color.jpg',
    normalMapUrl: baseSnow010A + 'Snow010A_1K-JPG_NormalGL.jpg',
    roughnessMapUrl: baseSnow010A + 'Snow010A_1K-JPG_Roughness.jpg',
    aoMapUrl: baseSnow010A + 'Snow010A_1K-JPG_AmbientOcclusion.jpg',
    displacementMapUrl: baseSnow010A + 'Snow010A_1K-JPG_Displacement.jpg',
  })
}
