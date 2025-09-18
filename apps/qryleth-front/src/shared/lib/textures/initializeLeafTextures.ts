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

  // Стилизованные хвойные листья (одна текстура с альфа‑каналом и атласом спрайтов)
  // В наборе отсутствуют отдельные карты нормалей и шероховатости,
  // прозрачность берётся из альфа‑канала основного изображения.
  const stylizedPineBase = '/texture/leaf/stylized/pine-leaves/'
  leafTextureRegistry.register({
    id: 'stylized-pine-leaves',
    name: 'Pine Leaves (Stylized)',
    previewUrl: stylizedPineBase + 'PineTree_Leaves.png',
    colorMapUrl: stylizedPineBase + 'PineTree_Leaves.png',
    normalMapUrl: stylizedPineBase + 'PineTree_Leaves_NormalMap.png',
    // В PNG присутствует альфа‑канал — используем его как карту прозрачности
    opacityMapUrl: stylizedPineBase + 'PineTree_Leaves_Opacity.png',
    atlasUrl: stylizedPineBase + 'atlas.json',
  })

  const stylizedPineSetBase = '/texture/leaf/stylized/pine-leaves-set/'
  leafTextureRegistry.register({
    id: 'stylized-pine-leave-set',
    name: 'Pine Leave set (Stylized)',
    previewUrl: stylizedPineSetBase + 'PineTree_Leave_Set.png',
    colorMapUrl: stylizedPineSetBase + 'PineTree_Leave_Set.png',
    normalMapUrl: stylizedPineSetBase + 'PineTree_Leave_Set_NormalMap.png',
    opacityMapUrl: stylizedPineSetBase + 'PineTree_Leave_Set_Opacity.png',
    atlasUrl: stylizedPineSetBase + 'atlas.json',
  })

  // Стилизованные листья березы
  // Включает основную текстуру, карту нормалей, карту прозрачности и атлас спрайтов
  const stylizedBirchBase = '/texture/leaf/stylized/birch-leaves/'
  leafTextureRegistry.register({
    id: 'stylized-birch-leaves',
    name: 'Birch Leaves (Stylized)',
    previewUrl: stylizedBirchBase + 'BirchTree_Leaves.png',
    colorMapUrl: stylizedBirchBase + 'BirchTree_Leaves.png',
    normalMapUrl: stylizedBirchBase + 'BirchTree_Leaves_NormalMap.png',
    opacityMapUrl: stylizedBirchBase + 'BirchTree_Leaves_Opacity.png',
    atlasUrl: stylizedBirchBase + 'atlas.json',
  })
}
