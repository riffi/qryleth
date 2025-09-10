import type { GlobalPalette } from '@/entities/palette'

/**
 * Предустановленная палитра: Qryleth Default.
 * UUID должен оставаться стабильным для корректной сериализации/ссылок из сцен.
 */
export const QRYLETH_DEFAULT: GlobalPalette = {
  uuid: 'default',
  name: 'Qryleth Default',
  colors: {
    sky:    '#7fb3ff',
    fog:    '#9fb8c8',
    water:  '#4aa3c7',
    foliage:'#4a7c59',
    wood:   '#6a4b3b',
    rock:   '#8a8a8a',
    metal:  '#9fa3a7',
    sand:   '#d9c18f',
    ground: '#6b4f36',
    snow:   '#ffffff',
    accent: '#d98f4a',
  }
}

/**
 * Предустановленная палитра: Qryleth Autumn.
 * UUID должен оставаться стабильным для корректной сериализации/ссылок из сцен.
 */
export const QRYLETH_AUTUMN: GlobalPalette = {
  uuid: 'autumn',
  name: 'Qryleth Autumn',
  colors: {
    sky:    '#e0b987', // мягкое тёплое небо с персиково-золотым
    fog:    '#d8c2a8', // светлый туман с бежево-серым
    water:  '#5c8080', // спокойная холодная вода, без резкого контраста
    foliage:'#d48a4d', // мягкий золотисто-оранжевый, меньше «кричит»
    wood:   '#9c6b42', // тёплый коричневый, более приглушённый
    rock:   '#8d8d8d', // светлее серый камень, без жёсткой тёмности
    metal:  '#a9acad', // нейтральный, слегка светлее
    sand:   '#e2c27a', // мягкий золотистый песок
    ground: '#8a5c3b', // тёплый терракотовый, не слишком тёмный
    snow:   '#f8f6f4', // мягкий кремово-белый
    accent: '#e6985c', // акцент — нежно-оранжевый/тыквенный, без агрессии
  }
}

/**
 * Предустановленная палитра: Qryleth Winter.
 * UUID должен оставаться стабильным для корректной сериализации/ссылок из сцен.
 */
export const QRYLETH_WINTER: GlobalPalette = {
  uuid: 'winter',
  name: 'Qryleth Winter',
  colors: {
    sky:    '#b0d6f9', // холодное зимнее небо, светло-голубое
    fog:    '#d0d8e0', // холодный серо-голубой туман
    water:  '#3a6d99', // тёмно-синяя зимняя вода
    foliage:'#cedddb', // хвоя с холодным оттенком
    wood:   '#5a4a42', // затемнённое дерево
    rock:   '#9aa0a8', // холодный серо-голубой камень
    metal:  '#b0b4ba', // светлый металл, слегка холодный
    sand:   '#e0e0da', // зимний песок/снегопесок, светло-серый
    ground: '#6a6f73', // промёрзшая земля, серо-коричневая
    snow:   '#ffffff', // яркий белый снег
    accent: '#4ab0d9', // ледяной акцент — бирюзово-голубой
  }
}

export const QRYLETH_ALIEN: GlobalPalette = {
  uuid: 'alien',
  name: 'Qryleth Alien',
  colors: {
    sky:    '#6a5acd', // фиолетово-лазурное небо
    fog:    '#8a9bbd', // холодный туман с серо-голубым отливом
    water:  '#3dd3c9', // малахитово-бирюзовая вода
    foliage:'#cd84bd', // слегка неоновая зелень, но мягкая
    wood:   '#5c3b6f', // древесина с фиолетовым оттенком
    rock:   '#a0a6b8', // серо-голубые камни
    metal:  '#b7a0d9', // металл с лавандовым отливом
    sand:   '#d0c48c', // бледно-жёлтый песок с инопланетным подтоном
    ground: '#574f68', // фиолетово-серый грунт
    snow:   '#e4f2ff', // бело-голубой «кристаллический снег»
    accent: '#ff7ba5', // розово-коралловый акцент для контраста
  }
}

/**
 * Список предустановленных палитр, доступных без пользовательского CRUD.
 */
export const PREDEFINED_GLOBAL_PALETTES: GlobalPalette[] = [
  QRYLETH_DEFAULT,
  QRYLETH_AUTUMN,
  QRYLETH_WINTER,
  QRYLETH_ALIEN
]

