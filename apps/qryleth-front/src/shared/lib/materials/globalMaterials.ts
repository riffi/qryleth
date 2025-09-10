import type { CreateGfxMaterial, GfxMaterial } from '@/entities/material';
import { GLOBAL_MATERIAL_TYPES } from '@/entities/material';

/**
 * Константы UUID для глобальных материалов
 * ВАЖНО: Эти UUID должны оставаться неизменными для совместимости
 */
export const GLOBAL_MATERIAL_UUIDS = {
  WOOD: 'global-material-wood-001',
  METAL: 'global-material-metal-001',
  EARTH: 'global-material-earth-001',
  STONE: 'global-material-stone-001',
  GLASS: 'global-material-glass-001',
  GOLD: 'global-material-gold-001',
  COPPER: 'global-material-copper-001',
  PLASTIC: 'global-material-plastic-001',
  RUBBER: 'global-material-rubber-001',
  CERAMIC: 'global-material-ceramic-001',
  FOLIAGE: 'global-material-foliage-001',
} as const;

/**
 * Предопределенные глобальные материалы с фиксированными UUID
 * Совместимые с Three.js MeshStandardMaterial (PBR)
 * Эти материалы доступны во всех сценах и могут использоваться AI
 * 
 * ВАЖНО: UUID должны оставаться стабильными между сессиями
 * для корректного обмена сценами между пользователями
 */
export const PREDEFINED_GLOBAL_MATERIALS_WITH_UUID: GfxMaterial[] = [
  // Листва — цвет берётся из роли 'foliage' активной палитры
  {
    uuid: GLOBAL_MATERIAL_UUIDS.FOLIAGE,
    name: 'Листва',
    type: 'dielectric',
    properties: {
      // Фолбэк цвет на случай отсутствия палитры
      color: '#4a7c59',
      colorSource: { type: 'role', role: 'foliage' } as any,
      opacity: 1.0,
      transparent: false,
      metalness: 0.0,
      roughness: 0.8,
      castShadow: true,
      receiveShadow: true,
    },
    isGlobal: true,
    description: 'Материал листвы. Базовый цвет берётся из роли foliage активной палитры',
  },
  // Дерево - натуральный диэлектрик
  {
    uuid: GLOBAL_MATERIAL_UUIDS.WOOD,
    name: 'Дерево',
    type: 'dielectric',
    properties: {
      color: '#8B4513', // Коричневый цвет дерева
      opacity: 1.0,
      transparent: false,
      metalness: 0.0,
      roughness: 0.7,
      castShadow: true,
      receiveShadow: true,
    },
    isGlobal: true,
    description: 'Натуральная древесина средней твердости с естественной текстурой',
  },

  // Металл - железо/сталь
  {
    uuid: GLOBAL_MATERIAL_UUIDS.METAL,
    name: 'Металл',
    type: 'metal',
    properties: {
      color: '#7D7D7D', // Серый металлик
      opacity: 1.0,
      transparent: false,
      metalness: 1.0,
      roughness: 0.2,
      envMapIntensity: 1.0,
      castShadow: true,
      receiveShadow: true,
    },
    isGlobal: true,
    description: 'Матовая сталь или железо с небольшими отражениями',
  },

  // Земля/грунт
  {
    uuid: GLOBAL_MATERIAL_UUIDS.EARTH,
    name: 'Земля',
    type: 'dielectric',
    properties: {
      color: '#654321', // Темно-коричневый земля
      opacity: 1.0,
      transparent: false,
      metalness: 0.0,
      roughness: 0.9,
      castShadow: true,
      receiveShadow: true,
    },
    isGlobal: true,
    description: 'Плодородная почва или грунт с матовой поверхностью',
  },

  // Камень
  {
    uuid: GLOBAL_MATERIAL_UUIDS.STONE,
    name: 'Камень',
    type: 'dielectric',
    properties: {
      color: '#708090', // Серый камень
      opacity: 1.0,
      transparent: false,
      metalness: 0.0,
      roughness: 0.8,
      castShadow: true,
      receiveShadow: true,
    },
    isGlobal: true,
    description: 'Натуральный камень с шероховатой поверхностью',
  },

  // Стекло
  {
    uuid: GLOBAL_MATERIAL_UUIDS.GLASS,
    name: 'Стекло',
    type: 'glass',
    properties: {
      color: '#FFFFFF', // Прозрачное
      opacity: 0.1,
      transparent: true,
      metalness: 0.0,
      roughness: 0.0,
      ior: 1.5, // Коэффициент преломления стекла
      envMapIntensity: 1.0,
      castShadow: false, // Прозрачные объекты обычно не отбрасывают тени
      receiveShadow: true,
    },
    isGlobal: true,
    description: 'Прозрачное стекло с высоким коэффициентом преломления',
  },

  // Дополнительные популярные материалы
  
  // Золото
  {
    uuid: GLOBAL_MATERIAL_UUIDS.GOLD,
    name: 'Золото',
    type: 'metal',
    properties: {
      color: '#FFD700', // Золотой цвет
      opacity: 1.0,
      transparent: false,
      metalness: 1.0,
      roughness: 0.1,
      envMapIntensity: 1.0,
      castShadow: true,
      receiveShadow: true,
    },
    isGlobal: true,
    description: 'Благородный металл с характерным золотым блеском',
  },

  // Медь
  {
    uuid: GLOBAL_MATERIAL_UUIDS.COPPER,
    name: 'Медь',
    type: 'metal',
    properties: {
      color: '#B87333', // Медный цвет
      opacity: 1.0,
      transparent: false,
      metalness: 1.0,
      roughness: 0.15,
      envMapIntensity: 1.0,
      castShadow: true,
      receiveShadow: true,
    },
    isGlobal: true,
    description: 'Медь с характерным красноватым оттенком',
  },

  // Пластик
  {
    uuid: GLOBAL_MATERIAL_UUIDS.PLASTIC,
    name: 'Пластик',
    type: 'dielectric',
    properties: {
      color: '#FFFFFF', // Белый пластик
      opacity: 1.0,
      transparent: false,
      metalness: 0.0,
      roughness: 0.4,
      castShadow: true,
      receiveShadow: true,
    },
    isGlobal: true,
    description: 'Матовый белый пластик средней шероховатости',
  },

  // Резина
  {
    uuid: GLOBAL_MATERIAL_UUIDS.RUBBER,
    name: 'Резина',
    type: 'dielectric',
    properties: {
      color: '#2F2F2F', // Темно-серая резина
      opacity: 1.0,
      transparent: false,
      metalness: 0.0,
      roughness: 0.95,
      castShadow: true,
      receiveShadow: true,
    },
    isGlobal: true,
    description: 'Черная резина с очень матовой поверхностью',
  },

  // Керамика
  {
    uuid: GLOBAL_MATERIAL_UUIDS.CERAMIC,
    name: 'Керамика',
    type: 'dielectric',
    properties: {
      color: '#F5F5DC', // Бежевый
      opacity: 1.0,
      transparent: false,
      metalness: 0.0,
      roughness: 0.3,
      castShadow: true,
      receiveShadow: true,
    },
    isGlobal: true,
    description: 'Глазурованная керамика с гладкой поверхностью',
  }
];
