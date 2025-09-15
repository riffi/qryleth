import { leafTextureRegistry } from './LeafTextureRegistry'

/**
 * Инициализация реестра наборов текстур листвы.
 *
 * На текущем этапе регистрируется один «зашитый» набор LeafSet019 (1K, JPG),
 * соответствующий текущей структуре ресурсов в `public/texture/leaf/LeafSet019_1K-JPG`.
 *
 * В дальнейшем сюда можно добавлять другие наборы или подгружать конфигурацию извне.
 */
export function initializeLeafTextures(): void {
  // Базовый путь к текущему набору
  const base = '/texture/leaf/LeafSet019_1K-JPG/'
  leafTextureRegistry.register({
    id: 'leafset019-1k-jpg',
    name: 'Leaf Set 019 (1K, JPG)',
    previewUrl: base + 'LeafSet019.png',
    colorMapUrl: base + 'LeafSet019_1K-JPG_Color.jpg',
    normalMapUrl: base + 'LeafSet019_1K-JPG_NormalGL.jpg',
    opacityMapUrl: base + 'LeafSet019_1K-JPG_Opacity.jpg',
    roughnessMapUrl: base + 'LeafSet019_1K-JPG_Roughness.jpg',
    atlasUrl: base + 'atlas.json',
  })

  // Дополнительный набор: LeafSet024 (1K, JPG)
  const base24 = '/texture/leaf/LeafSet024_1K-JPG/'
  leafTextureRegistry.register({
    id: 'leafset024-1k-jpg',
    name: 'Leaf Set 024 (1K, JPG)',
    previewUrl: base24 + 'LeafSet024.png',
    colorMapUrl: base24 + 'LeafSet024_1K-JPG_Color.jpg',
    normalMapUrl: base24 + 'LeafSet024_1K-JPG_NormalGL.jpg',
    opacityMapUrl: base24 + 'LeafSet024_1K-JPG_Opacity.jpg',
    roughnessMapUrl: base24 + 'LeafSet024_1K-JPG_Roughness.jpg',
    atlasUrl: base24 + 'atlas.json',
  })
}
