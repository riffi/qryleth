// Создаем долину с плато в центре и горами по бокам
const valleySpec = {
  world: { width: 300, height: 300, edgeFade: 0.1 },
  base: {
    seed: 12345,
    octaveCount: 4,
    amplitude: 12,
    persistence: 0.5,
    width: 128,
    height: 128
  },
  pool: {
    global: { intensityScale: 1.2, maxOps: 100 },
    recipes: [
      // Центральное плато
      {
        kind: "plateau",
        count: [1, 1],
        placement: { type: "center" },
        radius: [40, 50],
        intensity: [8, 12],
        falloff: "smoothstep",
        bias: { preferHeight: { min: 2, max: 6, weight: 0.7 } }
      },
      // Горы слева
      {
        kind: "mountain",
        count: [8, 12],
        placement: { type: "poisson", minDistance: 25 },
        radius: [15, 25],
        intensity: [15, 25],
        falloff: "sharp",
        bias: { preferArea: { x: [0, 0.3], y: [0.2, 0.8], weight: 0.9 } }
      },
      // Горы справа
      {
        kind: "mountain",
        count: [8, 12],
        placement: { type: "poisson", minDistance: 25 },
        radius: [15, 25],
        intensity: [15, 25],
        falloff: "sharp",
        bias: { preferArea: { x: [0.7, 1], y: [0.2, 0.8], weight: 0.9 } }
      },
      // Долина между горами
      {
        kind: "valley",
        count: [3, 5],
        placement: { type: "uniform" },
        radius: [20, 35],
        intensity: [-8, -12],
        falloff: "smoothstep",
        bias: { preferArea: { x: [0.3, 0.7], y: [0.2, 0.8], weight: 0.8 } }
      },
      // Дополнительные холмы для плавности
      {
        kind: "hill",
        count: [15, 20],
        placement: { type: "poisson", minDistance: 20 },
        radius: [8, 15],
        intensity: [3, 6],
        falloff: "smoothstep"
      }
    ]
  },
  seed: 98765
};

// Создаем процедурный ландшафт
const valleyLayer = await sceneApi.createProceduralLayer(valleySpec, {
  name: "Долина с плато",
  visible: true
});

console.log("Долина создана:", valleyLayer);
