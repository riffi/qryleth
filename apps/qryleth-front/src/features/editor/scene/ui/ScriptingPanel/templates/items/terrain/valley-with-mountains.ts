import type { TemplateData } from '../../types'

/**
 * Шаблон: Долина с горами — центральная долина и горные цепи по краям.
 */
export const valleyWithMountainsTemplate: TemplateData = {
  id: 'valley-with-mountains',
  name: 'Долина с горами',
  description: 'Центральная долина на всю ширину и горные цепи по краям.',
  code: `// Долина, окруженная горными цепями (с долиной на всю ширину)
const valleySpec = {
  // Мир 300×200 (X×Z). Диапазоны: X [-150..150], Z [-100..100]
  layer: { width: 300, depth: 200, edgeFade: 0.15 },
  base: { 
    seed: 1001, 
    octaveCount: 4, 
    amplitude: 6, 
    persistence: 0.5, 
    width: 256, 
    height: 256 
  },
  pool: {
    // Увеличиваем бюджет операций, чтобы все рецепты попали в результат
    global: { intensityScale: 1.2, maxOps: 150 },
    recipes: [
      // Центральная долина на всю ширину — сначала, чтобы гарантировать попадание в бюджет
      {
        kind: 'valley',
        count: 1,
        // Центр в (0,0), один длинный штрих вдоль X (rotation по умолчанию = 0)
        placement: { type: 'ring', center: [0, 0], rMin: 0, rMax: 0 },
        radius: 50,                 // больше радиус — лучше перекрытие штрихов
        aspect: [0.7, 0.9],         // толщина долины по Z
        intensity: 8,
        step: 50,                   // 5 центров: [-100, -50, 0, 50, 100]
        falloff: 'smoothstep'
      },
      // Горы по южному краю — чуть дальше от края, чтобы edgeFade не гасил высоту
      {
        kind: 'hill',
        count: [8, 12],
        placement: { 
          type: 'uniform',
          area: { kind: 'rect', x: -150, z: -80, width: 300, depth: 40 }
        },
        radius: [14, 22],
        intensity: [7, 14],
        falloff: 'gauss'
      },
      // Горная цепь по северному краю — гряды толще по Z и длиннее
      {
        kind: 'ridge',
        count: [10, 14],
        placement: { 
          type: 'uniform',
          area: { kind: 'rect', x: -150, z: 60, width: 300, depth: 40 }
        },
        radius: [18, 26],
        aspect: [0.9, 1.3],
        intensity: [8, 15],
        step: 25,
        falloff: 'smoothstep'
        // rotation: [-0.05, 0.05],
        // randomRotationEnabled: true
      }
    ]
  },
  seed: 1001
}

const valley = await sceneApi.createProceduralLandscape(valleySpec, { 
  name: 'Долина Драконов', 
  visible: true,
  material: {
    multiColor: {
      mode: 'triangle',
      palette: [
        { height: -10, colorSource: { type: 'role', role: 'foliage', tint: -0.15 } },
        {
          height: 0,
          colorSource: {
            type: 'role',
            role: 'foliage',
            tint: 0.0,
            hueShift: 0.0,
            saturationShift: 0 
          }
        },
        {
          height: 10,
          colorSource: {
            type: 'role',
            role: 'foliage',
            hueTowards: {deg:25, t:0.5},             
            tint: +0.102,               
            saturationShift: +0.027     
          }
        },
        {
          height: 25,
          colorSource: {
            type: 'role',
            role: 'rock',
            tint: +0.176,          
            hueShift: 0.0,
            saturationShift: 0.0
          }
        },
        { height: 100, colorSource: { type: 'role', role: 'snow',    tint: 0 } },
      ],
      slopeBoost: 0.3, // 0..1 — подкрашивает крутые склоны
    }
  }
})

console.log('Создана долина:', valley)`
}
