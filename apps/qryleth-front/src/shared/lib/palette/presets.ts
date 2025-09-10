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
    sky:    '#d0a36b', // тёплое осеннее небо, с золотистым оттенком
    fog:    '#c7a98c', // мягкий туман с бежево-серым оттенком
    water:  '#4a7c7c', // приглушённая вода для контраста
    foliage:'#c56b2c', // лиственно-оранжевый (золотая осень)
    wood:   '#8b5a2b', // насыщенно-коричневый
    rock:   '#7f7f7f', // серо-каменный
    metal:  '#9fa3a7', // нейтральный
    sand:   '#d8b56a', // песок теплее, с золотистым отливом
    ground: '#7c4a2d', // земля — тёплый коричневый
    snow:   '#f2f2f2', // лёгкий кремово-белый
    accent: '#e07a3c', // яркий акцент — тыквенно-оранжевый
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
    foliage:'#9dc1c1', // хвоя с холодным оттенком
    wood:   '#5a4a42', // затемнённое дерево
    rock:   '#9aa0a8', // холодный серо-голубой камень
    metal:  '#b0b4ba', // светлый металл, слегка холодный
    sand:   '#e0e0da', // зимний песок/снегопесок, светло-серый
    ground: '#6a6f73', // промёрзшая земля, серо-коричневая
    snow:   '#ffffff', // яркий белый снег
    accent: '#4ab0d9', // ледяной акцент — бирюзово-голубой
  }
}

/**
 * Список предустановленных палитр, доступных без пользовательского CRUD.
 */
export const PREDEFINED_GLOBAL_PALETTES: GlobalPalette[] = [
  QRYLETH_DEFAULT,
  QRYLETH_AUTUMN,
  QRYLETH_WINTER,
]

