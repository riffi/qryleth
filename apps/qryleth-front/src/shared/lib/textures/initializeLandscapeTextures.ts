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
  // Дополнительная текстура: Grass003 (1K, JPG)
  // Структура файлов соответствует каталогу `public/texture/landscape/Grass003_1K-JPG/`
  // Используется PNG-превью и карты: Color, NormalGL, Roughness, AO, Displacement.
  const base003 = '/texture/landscape/Grass003_1K-JPG/'
  landscapeTextureRegistry.register({
    id: 'grass003-1k-jpg',
    name: 'Grass 003 (1K, JPG)',
    previewUrl: base003 + 'Grass003.png',
    colorMapUrl: base003 + 'Grass003_1K-JPG_Color.jpg',
    normalMapUrl: base003 + 'Grass003_1K-JPG_NormalGL.jpg',
    roughnessMapUrl: base003 + 'Grass003_1K-JPG_Roughness.jpg',
    aoMapUrl: base003 + 'Grass003_1K-JPG_AmbientOcclusion.jpg',
    displacementMapUrl: base003 + 'Grass003_1K-JPG_Displacement.jpg',
  })

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

  // Дополнительная текстура: Ground037 (1K, JPG)
  // Структура файлов соответствует каталогу `public/texture/landscape/Ground037_1K-JPG/`
  // Используется PNG-превью и карты: Color, NormalGL, Roughness, AO, Displacement.
  const baseGround037 = '/texture/landscape/Ground037_1K-JPG/'
  landscapeTextureRegistry.register({
    id: 'ground037-1k-jpg',
    name: 'Ground 037 (1K, JPG)',
    previewUrl: baseGround037 + 'Ground037.png',
    colorMapUrl: baseGround037 + 'Ground037_1K-JPG_Color.jpg',
    normalMapUrl: baseGround037 + 'Ground037_1K-JPG_NormalGL.jpg',
    roughnessMapUrl: baseGround037 + 'Ground037_1K-JPG_Roughness.jpg',
    aoMapUrl: baseGround037 + 'Ground037_1K-JPG_AmbientOcclusion.jpg',
    displacementMapUrl: baseGround037 + 'Ground037_1K-JPG_Displacement.jpg',
  })

  // Дополнительная текстура: Ground082S (1K, JPG)
  const baseGround082S = '/texture/landscape/Ground082S_1K-JPG/'
  landscapeTextureRegistry.register({
    id: 'ground082s-1k-jpg',
    name: 'Ground 082S (1K, JPG)',
    previewUrl: baseGround082S + 'Ground082S.png',
    colorMapUrl: baseGround082S + 'Ground082S_1K-JPG_Color.jpg',
    normalMapUrl: baseGround082S + 'Ground082S_1K-JPG_NormalGL.jpg',
    roughnessMapUrl: baseGround082S + 'Ground082S_1K-JPG_Roughness.jpg',
    aoMapUrl: baseGround082S + 'Ground082S_1K-JPG_AmbientOcclusion.jpg',
    displacementMapUrl: baseGround082S + 'Ground082S_1K-JPG_Displacement.jpg',
  })
}
