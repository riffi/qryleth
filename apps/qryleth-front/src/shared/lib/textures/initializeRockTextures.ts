import { rockTextureRegistry } from './RockTextureRegistry'

/**
 * Инициализирует стандартный набор текстур камня из public/texture/rock.
 * На текущем этапе регистрируется набор rock_0005 (1K), перенесённый из тестового проекта.
 */
export function initializeRockTextures(): void {
  const base = '/texture/rock/rock_0005_1k_Nbn63p/'
  rockTextureRegistry.register({
    id: 'rock_0005_1k',
    name: 'Rock 0005 (1K)',
    previewUrl: base + 'rock_0005_color_1k.jpg',
    colorMapUrl: base + 'rock_0005_color_1k.jpg',
    normalMapUrl: base + 'rock_0005_normal_opengl_1k.png',
    roughnessMapUrl: base + 'rock_0005_roughness_1k.jpg',
    aoMapUrl: base + 'rock_0005_ao_1k.jpg',
    displacementMapUrl: base + 'rock_0005_height_1k.png',
  })
}

