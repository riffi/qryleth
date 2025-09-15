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
}

