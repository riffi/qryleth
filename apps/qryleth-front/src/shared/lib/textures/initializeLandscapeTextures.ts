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
}
