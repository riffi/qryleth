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
 * Список предустановленных палитр, доступных без пользовательского CRUD.
 */
export const PREDEFINED_GLOBAL_PALETTES: GlobalPalette[] = [
  QRYLETH_DEFAULT,
  QRYLETH_AUTUMN,
]

