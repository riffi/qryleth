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
}
