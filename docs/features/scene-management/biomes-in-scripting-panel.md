# Биомы в Scripting Panel

> Автоматически рассеивайте объекты библиотеки по областям сцены прямо из панели скриптинга. Управляйте алгоритмом, плотностью (spacing), источниками и стратификацией программно.

---

## Что такое Scripting Panel

Панель для запуска JS/TS‑скриптов с доступом к Scene API. Подробности: ./scripting-panel.md

В скриптах доступны:
- `sceneApi` — методы управления сценой (включая биомы)
- `console` — вывод в консоль браузера
- стандартные объекты JS

---

## Быстрый старт: создать биом и выполнить scatter

```ts
// Прямоугольный биом 200×200 в центре сцены
const biome = {
  uuid: undefined,
  name: 'Лесной биом',
  area: { type: 'rect', rect: { x: -100, z: -100, width: 200, depth: 200 }, rotationY: 0 },
  visible: true,
  scattering: {
    algorithm: 'poisson',
    spacing: 1.5,
    edge: { fadeWidth: 8, fadeCurve: 'smoothstep', edgeBias: 0 },
    transform: { randomYawDeg: [0, 360], randomUniformScale: [0.9, 1.3], randomOffsetXZ: [0, 0.6] },
    seed: 12345,
    source: { anyTags: ['дерево', 'куст', 'трава'] }
  },
  strata: [
    { name: 'Деревья', scattering: { spacing: 2.2, source: { requiredTags: ['дерево'] } } },
    { name: 'Кустарники', scattering: { spacing: 1.6, source: { anyTags: ['куст'] } } },
    { name: 'Трава', scattering: { spacing: 1.0, source: { anyTags: ['трава'] } } }
  ]
}

const addRes = sceneApi.addBiome(biome)
if (!addRes.success) throw new Error('Не удалось добавить биом')

// Выполнить скаттеринг (append)
const scatterRes = await sceneApi.scatterBiome(addRes.biomeUuid)
console.log('Скаттеринг:', scatterRes)
```

---

## Полная регенерация инстансов биома

```ts
const biomeUuid = addRes.biomeUuid
// forceDelete: если генерация дала 0 точек — пустим всё равно
const regenRes = await sceneApi.regenerateBiomeInstances(biomeUuid, { forceDelete: true })
console.log('Регенерация:', regenRes)
```

---

## Обновление биома

```ts
sceneApi.updateBiome(addRes.biomeUuid, {
  scattering: { spacing: 1.2 } // сделать плотнее
})

await sceneApi.regenerateBiomeInstances(addRes.biomeUuid)
```

---

## 🎯 Готовые решения для копирования

### 1) Лес со стратами (деревья/кусты/трава)

```ts
// Прямоугольный биом 300×200 со стратами
const forest = {
  uuid: undefined,
  name: 'Лес (стратифицированный)',
  area: { type: 'rect', rect: { x: -150, z: -100, width: 300, depth: 200 }, rotationY: 0 },
  visible: true,
  scattering: {
    algorithm: 'poisson',
    spacing: 1.4,
    edge: { fadeWidth: 6, fadeCurve: 'smoothstep', edgeBias: 0 },
    transform: { randomYawDeg: [0, 360], randomUniformScale: [0.9, 1.3], randomOffsetXZ: [0, 0.4] },
    seed: 2025,
    source: { anyTags: ['дерево','куст','трава'] }
  },
  strata: [
    { name: 'Деревья',     scattering: { spacing: 2.2, edge: { fadeWidth: 6, fadeCurve: 'smoothstep', edgeBias: 0.2 }, source: { requiredTags: ['дерево'] } } },
    { name: 'Кустарники',  scattering: { spacing: 1.6, edge: { fadeWidth: 8, fadeCurve: 'linear',     edgeBias: -0.1 }, source: { anyTags: ['куст'] } } },
    { name: 'Трава',       scattering: { spacing: 1.0, edge: { fadeWidth: 5, fadeCurve: 'smoothstep', edgeBias: 0    }, source: { anyTags: ['трава'] } } }
  ]
}

const addForest = sceneApi.addBiome(forest)
if (!addForest.success) throw new Error('Не удалось добавить лесной биом')
await sceneApi.scatterBiome(addForest.biomeUuid)
```

— Используется `poisson` для естественного распределения деревьев и травы.
— Лёгкий `edgeBias` у деревьев тянет их ближе к центру, кустарники смещены к краю.

### 2) Каменный круг (валуны)

```ts
// Круговой биом с валунами
const rocks = {
  uuid: undefined,
  name: 'Каменный круг',
  area: { type: 'circle', circle: { x: 0, z: 0, radius: 40 } },
  visible: true,
  scattering: {
    algorithm: 'poisson',
    spacing: 2.0,
    edge: { fadeWidth: 6, fadeCurve: 'linear', edgeBias: 0 },
    transform: { randomYawDeg: [0, 360], randomUniformScale: [0.8, 1.3], randomOffsetXZ: [0, 0.5] },
    seed: 9876,
    source: { anyTags: ['камень','валун','rock','boulder'] }
  }
}

const addRocks = sceneApi.addBiome(rocks)
if (!addRocks.success) throw new Error('Не удалось добавить биом камней')
await sceneApi.regenerateBiomeInstances(addRocks.biomeUuid, { forceDelete: true })
```

— Полная регенерация заменяет прежние инстансы на новые.

### 3) Поле цветов (алгоритм random с мягким spacing)

```ts
// Прямоугольник 200×120; равномерная выборка с мягким постфильтром расстояния
const flowers = {
  uuid: undefined,
  name: 'Полевые цветы',
  area: { type: 'rect', rect: { x: -100, z: -60, width: 200, depth: 120 } },
  visible: true,
  scattering: {
    algorithm: 'random',
    spacing: 0.8, // базовая плотность; мягкий фильтр применит 0.9*spacing
    edge: { fadeWidth: 4, fadeCurve: 'smoothstep', edgeBias: 0.1 }, // чуть плотнее к центру
    transform: { randomYawDeg: [0, 360], randomUniformScale: [0.7, 1.1], randomOffsetXZ: [0, 0.15] },
    seed: 555,
    source: { anyTags: ['flower','цветок'] }
  }
}

const addFlowers = sceneApi.addBiome(flowers)
if (!addFlowers.success) throw new Error('Не удалось добавить биом цветов')
await sceneApi.scatterBiome(addFlowers.biomeUuid)
```

— `random` быстрее и визуально ровнее благодаря мягкому фильтру по расстоянию.

---

### 4) Редкий парк деревьев (просторные расстояния)

```ts
// Большой прямоугольный парк с редкими деревьями
const park = {
  uuid: undefined,
  name: 'Редкий парк',
  area: { type: 'rect', rect: { x: -200, z: -120, width: 400, depth: 240 } },
  visible: true,
  scattering: {
    algorithm: 'poisson',
    spacing: 4.0, // редкие посадки
    edge: { fadeWidth: 10, fadeCurve: 'smoothstep', edgeBias: 0.15 }, // чуть плотнее к центру
    transform: { randomYawDeg: [0, 360], randomUniformScale: [0.95, 1.4], randomOffsetXZ: [0, 0.2] },
    seed: 7777,
    source: {
      anyTags: ['tree','дерево'],
      // Лёгкое предпочтение дубов над елями (пример весов)
      weightsByTag: { oak: 1.2, дуб: 1.2, spruce: 0.8, ель: 0.8 }
    }
  }
}

const addPark = sceneApi.addBiome(park)
if (!addPark.success) throw new Error('Не удалось добавить парк')
await sceneApi.scatterBiome(addPark.biomeUuid)
```

— Большой spacing создаёт «воздух» между деревьями, пригодно для парков/аллей.

### 5) Кромка кустов вдоль границы области

```ts
// Узкая кромка кустов по периметру прямоугольника
const shrubsEdge = {
  uuid: undefined,
  name: 'Кромка кустов',
  area: { type: 'rect', rect: { x: -120, z: -80, width: 240, depth: 160 } },
  visible: true,
  scattering: {
    algorithm: 'random',
    spacing: 1.2,
    // Смещаем вероятность к краю: edgeBias < 0
    edge: { fadeWidth: 12, fadeCurve: 'smoothstep', edgeBias: -0.6 },
    transform: { randomYawDeg: [0, 360], randomUniformScale: [0.8, 1.2], randomOffsetXZ: [0, 0.25] },
    seed: 4242,
    source: { anyTags: ['shrub','куст'] }
  }
}

const addShrubs = sceneApi.addBiome(shrubsEdge)
if (!addShrubs.success) throw new Error('Не удалось добавить кромку кустов')
await sceneApi.scatterBiome(addShrubs.biomeUuid)
```

— Отрицательный `edgeBias` концентрирует инстансы вдоль границ области.

---

## Работа с источниками (source)

```ts
// Задать фильтр по тегам и весам
sceneApi.updateBiome(addRes.biomeUuid, {
  scattering: {
    source: {
      requiredTags: ['дерево'],
      weightsByTag: { дуб: 2, ель: 1 }
    }
  }
})
```

Подсказки:
- Теги сравниваются в нижнем регистре — нормализуйте данные библиотеки.
- Если `source` не задан, будет использована вся библиотека с равными весами.

---

## Детали алгоритмов

- `random`: равномерная выборка кандидатов с edge‑весами и мягким постфильтром по расстоянию `spacing * 0.9`.
- `poisson`: `minDistance = spacing`, ограничение числа точек по hex‑packing (η≈0.9069).

Страты независимы по коллизиям (`spacing` между стратами не проверяется).

---

## Отладка и типичные ошибки

- Пустой пул источников → создано 0 инстансов. Проверьте `source` и наличие тегов в библиотеке.
- Слишком малый `spacing` относительно области → высокая нагрузка при генерации. Увеличьте `spacing` или область.
- Нет террейна — высота Y остаётся 0 до выравнивания. Используйте landscape‑слой или вызовите авто‑подстройку.

---

## См. также

- Типы: ../../api/types/biomes.md
- Scene API: ../../api/scene-api.md
- Ландшафт в Scripting Panel: ./terrain-in-scripting-panel.md
