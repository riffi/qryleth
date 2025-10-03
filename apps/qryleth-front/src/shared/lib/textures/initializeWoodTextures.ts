import { woodTextureRegistry } from './WoodTextureRegistry'

/**
 * Инициализация реестра текстур коры.
 *
 * Регистрируется текстура Bark014 (1K, JPG) из `public/texture/wood/Bark014_1K-JPG`.
 * В дальнейшем сюда можно добавлять новые наборы или подгружать конфигурацию извне.
 */
export function initializeWoodTextures(): void {
  const base = '/texture/wood/Bark014_1K-JPG/'
  woodTextureRegistry.register({
    id: 'bark014-1k-jpg',
    name: 'Bark 014 (1K, JPG)',
    previewUrl: base + 'Bark014.png',
    colorMapUrl: base + 'Bark014_1K-JPG_Color.jpg',
    normalMapUrl: base + 'Bark014_1K-JPG_NormalGL.jpg',
    roughnessMapUrl: base + 'Bark014_1K-JPG_Roughness.jpg',
    aoMapUrl: base + 'Bark014_1K-JPG_AmbientOcclusion.jpg',
    displacementMapUrl: base + 'Bark014_1K-JPG_Displacement.jpg',
  })

  /**
   * Набор «Pine Tree Bark (Stylized)».
   *
   * Источник файлов: `public/texture/wood/stylized/pine-tree-bark`.
   * Доступные карты:
   * - Цвет (PineTree_Bark.png) — используется и как превью.
   * - Нормали (PineTree_Bark_Normal.png).
   * Дополнительные PBR‑карты (шероховатость/окклюзия/смещение) отсутствуют — рендер учитывает это как опциональные карты.
   */
  const pineBase = '/texture/wood/stylized/pine-tree-bark/'
  woodTextureRegistry.register({
    id: 'pine-tree-bark-stylized',
    name: 'Pine Tree Bark (Stylized)',
    previewUrl: pineBase + 'PineTree_Bark.png',
    colorMapUrl: pineBase + 'PineTree_Bark.png',
    normalMapUrl: pineBase + 'PineTree_Bark_Normal.png',
  })

  /**
   * Набор «Birch Tree Bark (Stylized)».
   *
   * Источник файлов: `public/texture/wood/stylized/birch-tree-bark`.
   * Доступные карты:
   * - Цвет (BirchTree_Bark.png) — используется и как превью.
   * - Нормали (BirchTree_Bark_Normal.png).
   * Дополнительные PBR‑карты (шероховатость/окклюзия/смещение) отсутствуют — рендер учитывает это как опциональные карты.
   */
  const birchBase = '/texture/wood/stylized/birch-tree-bark/'
  woodTextureRegistry.register({
    id: 'birch-tree-bark-stylized',
    name: 'Birch Tree Bark (Stylized)',
    previewUrl: birchBase + 'BirchTree_Bark.png',
    colorMapUrl: birchBase + 'BirchTree_Bark.png',
    normalMapUrl: birchBase + 'BirchTree_Bark_Normal.png',
  })

  /**
   * Набор «Wood 0062 (1K)» — стилизованная древесная поверхность.
   * 
   * Источник файлов: `public/texture/wood/stylized/wood_0062_1k_j33v6p/`.
   * Доступные карты (разрешение 1K):
   * - Превью: wood_0062_preview.jpg
   * - Цвет: wood_0062_color_1k.jpg
   * - Нормали (OpenGL): wood_0062_normal_opengl_1k.png
   * - Шероховатость: wood_0062_roughness_1k.jpg
   * - AO: wood_0062_ao_1k.jpg
   * - Высота: wood_0062_height_1k.png
   */
  const wood0062Base = '/texture/wood/stylized/wood_0062_1k_j33v6p/'
  woodTextureRegistry.register({
    id: 'wood0062-1k-jpg',
    name: 'Wood 0062 (1K)',
    previewUrl: wood0062Base + 'wood_0062_preview.jpg',
    colorMapUrl: wood0062Base + 'wood_0062_color_1k.jpg',
    normalMapUrl: wood0062Base + 'wood_0062_normal_opengl_1k.png',
    roughnessMapUrl: wood0062Base + 'wood_0062_roughness_1k.jpg',
    aoMapUrl: wood0062Base + 'wood_0062_ao_1k.jpg',
    displacementMapUrl: wood0062Base + 'wood_0062_height_1k.png',
  })

  // Наборы «ez-tree» для коры деревьев (пути ожидают размещения файлов в public)
  const ezBarkBase = '/texture/ez-tree/bark/'
  woodTextureRegistry.register({
    id: 'ez-bark-oak',
    name: 'ez-tree Bark Oak',
    previewUrl: ezBarkBase + 'oak_color_1k.jpg',
    colorMapUrl: ezBarkBase + 'oak_color_1k.jpg',
    normalMapUrl: ezBarkBase + 'oak_normal_1k.jpg',
    roughnessMapUrl: ezBarkBase + 'oak_roughness_1k.jpg',
    aoMapUrl: ezBarkBase + 'oak_ao_1k.jpg',
  })
  woodTextureRegistry.register({
    id: 'ez-bark-birch',
    name: 'ez-tree Bark Birch',
    previewUrl: ezBarkBase + 'birch_color_1k.jpg',
    colorMapUrl: ezBarkBase + 'birch_color_1k.jpg',
    normalMapUrl: ezBarkBase + 'birch_normal_1k.jpg',
    roughnessMapUrl: ezBarkBase + 'birch_roughness_1k.jpg',
    aoMapUrl: ezBarkBase + 'birch_ao_1k.jpg',
  })
  woodTextureRegistry.register({
    id: 'ez-bark-pine',
    name: 'ez-tree Bark Pine',
    previewUrl: ezBarkBase + 'pine_color_1k.jpg',
    colorMapUrl: ezBarkBase + 'pine_color_1k.jpg',
    normalMapUrl: ezBarkBase + 'pine_normal_1k.jpg',
    roughnessMapUrl: ezBarkBase + 'pine_roughness_1k.jpg',
    aoMapUrl: ezBarkBase + 'pine_ao_1k.jpg',
  })
  woodTextureRegistry.register({
    id: 'ez-bark-willow',
    name: 'ez-tree Bark Willow',
    previewUrl: ezBarkBase + 'willow_color_1k.jpg',
    colorMapUrl: ezBarkBase + 'willow_color_1k.jpg',
    normalMapUrl: ezBarkBase + 'willow_normal_1k.jpg',
    roughnessMapUrl: ezBarkBase + 'willow_roughness_1k.jpg',
    aoMapUrl: ezBarkBase + 'willow_ao_1k.jpg',
  })
}
