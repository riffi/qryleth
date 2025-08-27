# Террейн: GfxTerrainConfig и GfxHeightSampler

Документ описывает унифицированную систему террейна в Qryleth: конфигурацию источников высот, локальные модификации рельефа и единый интерфейс сэмплинга высоты/нормалей.

---

## Обзор

- **Цель:** устранить дублирование логики высот между рендерингом и размещением объектов.
- **Ключевая идея:** любые операции с высотой (рендер, физика, размещение) идут через единый `GfxHeightSampler`.
- **Источники:** Perlin (детерминированный шум), PNG heightmap (Dexie).
- **Модификации:** `TerrainOps` — локальные добавки рельефа (add/sub/set, falloff, эллипсы, поворот).

---

## Типы данных

```ts
// Данные perlin-шума (размеры — в сегментах сетки)
export interface GfxPerlinParams {
  /**
   * Зерно шума Perlin для детерминированной генерации.
   */
  seed: number
  /**
   * Количество октав шума (чем больше, тем детальнее рельеф).
   */
  octaveCount: number
  /**
   * Амплитуда базового рельефа. Определяет характерную высоту гор/впадин.
   */
  amplitude: number
  /**
   * Коэффициент затухания между октавами (0..1). Меньше — глаже, больше — шумнее.
   */
  persistence: number
  /**
   * Разрешение сетки шума по X (в сегментах сетки террейна, не в метрах).
   */
  width: number
  /**
   * Разрешение сетки шума по Z (в сегментах сетки террейна, не в метрах).
   */
  height: number
  /**
   * Смещение базового уровня высоты (DC‑смещение) в метрах. Позволяет опускать
   * (отрицательные значения) или поднимать (положительные) весь базовый рельеф
   * относительно нулевой плоскости Y=0 или уровня моря.
   *
   * Формула:
   *   h_base(x,z) = amplitude * perlin(x,z) + heightOffset
   *
   * По умолчанию: 0 (отключено).
   */
  heightOffset?: number
}

// Данные PNG heightmap (размеры — пиксели изображения)
export interface GfxHeightmapParams {
  assetId: string        // ключ blob PNG в Dexie
  imgWidth: number
  imgHeight: number
  min: number            // нижняя граница нормализации высоты
  max: number            // верхняя граница нормализации высоты
  wrap?: 'clamp' | 'repeat' // режим обработки UV на краях
}

// Источник базовых высот террейна
export type GfxTerrainSource =
  | { kind: 'perlin'; params: GfxPerlinParams }
  | { kind: 'heightmap'; params: GfxHeightmapParams }

// Операции модификации рельефа
export interface GfxTerrainOp {
  id: string
  mode: 'add' | 'sub' | 'set'
  center: [number, number] // мировые координаты (x, z)
  radius: number            // радиус влияния (мировые единицы)
  intensity: number         // амплитуда
  falloff?: 'smoothstep' | 'gauss' | 'linear'
  radiusZ?: number          // эллипс по Z (если указан)
  rotation?: number         // поворот эллипса в радианах
}

// Полная конфигурация террейна слоя
export interface GfxTerrainConfig {
  /** Ширина террейна в мировых единицах (метрах). */
  worldWidth: number
  /** Глубина террейна (ось Z) в мировых единицах (метрах). */
  worldHeight: number
  /**
   * Плавный спад высоты к краям (0..1 — доля от размера края).
   * ВАЖНО: спад ведёт к базовому уровню источника. Для Perlin это `heightOffset`
   * (если задан) или 0.
   */
  edgeFade?: number
  /**
   * Уровень моря (высота плоскости воды) в метрах. Если не задан, считается 0.
   * Используется для согласования визуализации воды и сэмплинга высот ниже 0.
   */
  seaLevel?: number
  /** Источник базовых высот (Perlin или карта высот). */
  source: GfxTerrainSource
  /** Необязательный набор локальных модификаций рельефа. */
  ops?: GfxTerrainOp[]
}
```

---

## Сэмплер высоты

```ts
export interface GfxHeightSampler {
  /**
   * Получить высоту Y для мировых координат (x, z)
   * Возвращает высоту после применения источника, ops и edgeFade.
   *
   * Договорённости:
   * - Для Perlin-источника высота вычисляется по формуле:
   *     h(x,z) = amplitude * sumOctaves(perlin) + heightOffset (если указан)
   * - Edge fade интерполирует к базовому уровню источника: при Perlin — к
   *   `heightOffset` (или 0, если не задан), а НЕ к жёсткому нулю.
   * - Кламп к 0 НЕ выполняется: отрицательные высоты допустимы и используются
   *   для моделирования дна/подводного рельефа.
   */
  getHeight(x: number, z: number): number

  /**
   * Получить нормаль поверхности в точке (x, z)
   * Вычисляется через конечные разности; результат — нормализованный вектор.
   */
  getNormal(x: number, z: number): [number, number, number]

  /**
   * Зарегистрировать колбэк, вызываемый после асинхронной загрузки ImageData
   * для heightmap-источника. Нужен для повторной генерации геометрии в UI.
   */
  onHeightmapLoaded?(cb: () => void): void
}
```

- Реализация: `src/features/scene/lib/terrain/GfxHeightSampler.ts`
- Создание: `createGfxHeightSampler(cfg: GfxTerrainConfig)`
- Геометрия: `buildGfxTerrainGeometry(cfg, sampler)` из `src/features/scene/lib/terrain/GeometryBuilder.ts` — формирует `THREE.BufferGeometry` по сэмплеру.
 - Геометрия: `buildGfxTerrainGeometry(cfg, sampler)` из `src/features/scene/lib/terrain/GeometryBuilder.ts` — формирует `THREE.BufferGeometry` по сэмплеру.
   Геометрия не клампит значение высоты к 0 — отрицательные высоты поддерживаются.

### Жизненный цикл сэмплера

- `isReady()` — источник готов к корректным выборкам (Perlin — всегда true; Heightmap — после загрузки heights/ImageData).
- `ready()` — промис готовности; используйте в UI вместо таймеров для прелоадеров.
- `dispose()` — освобождение подписок/ссылок.

### Примечания по уровню моря и базовому смещению

- Если задан `cfg.seaLevel`, визуальная плоскость воды и вспомогательные системы
  должны использовать это значение вместо жёсткого 0.
- Для Perlin-источника `params.heightOffset` задаёт базовый уровень рельефа. Это
  полезно для сценариев с архипелагами: можно опустить базу ниже `seaLevel`,
  оставив над водой только острова, созданные локальными операциями/деталями.

---

## Использование в рендеринге

```ts
import { createGfxHeightSampler } from '@/features/scene/lib/terrain/GfxHeightSampler'
import { buildGfxTerrainGeometry } from '@/features/scene/lib/terrain/GeometryBuilder'

// 1) получить конфигурацию террейна
const sampler = createGfxHeightSampler(layer.terrain)
await sampler.ready?.() // для heightmap дождаться загрузки данных
const geometry = buildGfxTerrainGeometry(layer.terrain, sampler)
```

- Компонент: `src/features/scene/ui/renderer/landscape/LandscapeLayer.tsx`
- Поведение:
  - при наличии `layer.terrain` используется напрямую;
  - создание слоя должно обеспечивать валидную конфигурацию террейна через SceneAPI (рендер не модифицирует store).

---

## Использование при размещении объектов

```ts
// Единая точка доступа к высотам
const sampler = getHeightSamplerForLayer(layer)
const y = sampler.getHeight(x, z)
const n = sampler.getNormal(x, z)
```

- Модуль: `src/features/scene/lib/placement/ObjectPlacementUtils.ts`
- Преимущества: отсутствие дублирования логики высот и нормалей между рендерингом и размещением.

---

## Импорт PNG heightmap

- Dexie-таблица: `terrainAssets` (PNG blob, `heightsBuffer`, `heightsHash`).
- Утилиты: `src/features/scene/lib/terrain/HeightmapUtils.ts`
  - `validatePngFile()`, `uploadTerrainAsset()`, `createTerrainAssetPreviewUrl()` и др.
- Нормализация: входной PNG масштабируется до ≤200px по большей стороне, затем извлекается массив высот (`Float32Array`).
- Дедупликация: по SHA‑256 хэшу массива высот (`heightsHash`). При загрузке идентичной карты возвращается уже существующий ассет (новый не создаётся).
- Асинхронная загрузка heights/ImageData; ожидание следует выполнять через `sampler.ready()`.

### Кэширование и инвалидация

- Кэш `assets/heightmapCache.ts` хранит ImageData и числовые поля высот с TTL/LRU, предоставляет `invalidate(assetId)` и `clear()`.
- `HeightmapUtils.deleteTerrainAsset/renameTerrainAsset` вызывают `invalidate(assetId)` для консистентности данных.

---

## Примеры создания слоёв с разными источниками

### Пример создания слоя с Perlin Noise

```ts
import type { GfxTerrainConfig } from '@/entities/terrain'

const perlinTerrainConfig: GfxTerrainConfig = {
  worldWidth: 200,
  worldHeight: 200,
  edgeFade: 0.1,
  seaLevel: 0, // уровень моря (по умолчанию 0)
  source: {
    kind: 'perlin',
    params: {
      seed: 12345,           // детерминированное зерно для воспроизводимости
      octaveCount: 4,        // количество слоёв шума (детализация)
      amplitude: 8.0,        // максимальная высота рельефа
      persistence: 0.5,      // затухание амплитуды между октавами
      width: 64,             // размер сетки по ширине (в сегментах)
      height: 64,            // размер сетки по высоте (в сегментах)
      heightOffset: 0        // смещение базового уровня; может быть < 0
    }
  },
  ops: [
    // Добавление холма в центре
    {
      id: 'central-hill',
      mode: 'add',
      center: [100, 100],
      radius: 30,
      intensity: 5.0,
      falloff: 'smoothstep'
    },
    // Выемка-озеро
    {
      id: 'lake',
      mode: 'sub',
      center: [150, 150],
      radius: 20,
      radiusZ: 15,          // эллиптическая форма
      rotation: Math.PI / 4, // поворот на 45°
      intensity: 3.0,
      falloff: 'gauss'
    }
  ]
}
```

#### Описание параметров Perlin Noise:

- **seed**: детерминированное зерно — одинаковое значение всегда даёт идентичный рельеф
- **octaveCount**: количество слоёв шума. Больше октав = более детальный и сложный рельеф
- **amplitude**: максимальная высота генерируемого рельефа (в мировых единицах)
- **persistence**: коэффициент затухания амплитуды между октавами (0.0-1.0). Меньше = более гладкий рельеф
- **width/height**: размеры сетки для генерации шума (в сегментах). Влияют на частоту деталей

#### Примеры различных конфигураций Perlin:

**Горный ландшафт (высокая амплитуда, много деталей):**
```ts
const mountainTerrain: GfxTerrainConfig = {
  worldWidth: 300,
  worldHeight: 300,
  source: {
    kind: 'perlin',
    params: {
      seed: 9876,
      octaveCount: 6,      // много слоёв для деталей
      amplitude: 15.0,     // высокие горы
      persistence: 0.6,    // сохранение деталей
      width: 128,
      height: 128
    }
  }
}
```

**Холмистая равнина (мягкий рельеф):**
```ts
const hillsTerrain: GfxTerrainConfig = {
  worldWidth: 200,
  worldHeight: 200,
  source: {
    kind: 'perlin',
    params: {
      seed: 1111,
      octaveCount: 3,      // мало слоёв для плавности
      amplitude: 4.0,      // невысокие холмы
      persistence: 0.3,    // быстрое затухание деталей
      width: 32,           // крупная сетка = плавные формы
      height: 32
    }
  }
}
```

**Пустынные дюны (средний рельеф):**
```ts
const dunesTerrain: GfxTerrainConfig = {
  worldWidth: 150,
  worldHeight: 150,
  source: {
    kind: 'perlin',
    params: {
      seed: 5555,
      octaveCount: 4,
      amplitude: 8.0,
      persistence: 0.4,    // умеренное затухание
      width: 48,
      height: 48
    }
  }
}
```

### Пример создания слоя с heightmap

```ts
import type { GfxTerrainConfig } from '@/entities/terrain'

const heightmapTerrainConfig: GfxTerrainConfig = {
  worldWidth: 100,
  worldHeight: 100,
  edgeFade: 0.15,
  source: {
    kind: 'heightmap',
    params: {
      assetId: 'dexie-asset-id',  // ID загруженного PNG в Dexie
      imgWidth: 1024,             // ширина исходного изображения
      imgHeight: 1024,            // высота исходного изображения
      min: 0,                     // минимальная высота (чёрные пиксели)
      max: 10,                    // максимальная высота (белые пиксели)
      wrap: 'clamp'               // обработка краёв: 'clamp' | 'repeat'
    }
  }
}
```

---

## Замечания по совместимости

- Поддержка `GfxLayer.noiseData` и режима `legacy` удалена. Используйте `terrain: GfxTerrainConfig`.
- Scene API `adjustInstancesForPerlinTerrain` сохраняет имя, но работает с новой архитектурой.

---

## Производительность

- Сэмплер включает кэширование значений высот и пространственный индекс для `TerrainOps`.
- R3F-геометрия строится один раз и регенерируется при изменении источника/параметров/загрузке heightmap.
- `assets/heightmapCache.ts` контролирует рост памяти за счёт TTL/LRU.

---

## 🆕 Процедурная генерация (spec/pool/recipes)

Типы спецификации процедурной генерации и пула рецептов. Используются методами SceneAPI `generateProceduralTerrain(...)`, `generateTerrainOpsFromPool(...)` и `createProceduralLayer(...)`.

```ts
export interface GfxProceduralPerlinParams extends GfxPerlinParams {
  /** Сдвиг шума по XZ для вариаций без смены seed: [dx, dz] */
  offset?: [number, number]
}

export interface GfxProceduralTerrainSpec {
  world: { width: number; height: number; edgeFade?: number }
  base: GfxProceduralPerlinParams
  pool: GfxTerrainOpPool
  seed: number
}

export interface GfxTerrainOpPool {
  global?: { intensityScale?: number; maxOps?: number }
  recipes: GfxTerrainOpRecipe[]
}

export interface GfxTerrainOpRecipe {
  kind: 'hill' | 'basin' | 'ridge' | 'valley' | 'crater' | 'plateau' | 'terrace' | 'dune'
  mode?: 'auto' | 'add' | 'sub' | 'set'
  count: number | [number, number]
  placement: GfxPlacementSpec
  radius: number | [number, number]
  aspect?: [number, number]
  intensity: number | [number, number]
  rotation?: [number, number]
  falloff?: 'smoothstep' | 'gauss' | 'linear'
  bias?: GfxBiasSpec
  jitter?: { center?: number }
  step?: number
}

export type GfxPlacementSpec =
  | { type: 'uniform' }
  | { type: 'poisson', minDistance: number }
  | { type: 'gridJitter', cell: number, jitter?: number }
  | { type: 'ring', center: [number, number], rMin: number, rMax: number }

export interface GfxBiasSpec {
  preferHeight?: { min?: number, max?: number, weight?: number }
  preferSlope?: { min?: number, max?: number, weight?: number }
  avoidOverlap?: boolean
}
```

### Правила и best practices
- В `mode: 'auto'` режим выбирается по `kind` (hill/dune/ridge → add; basin/valley → sub; plateau → set; crater/terrace — составные).
- Для `valley/basin` не указывайте отрицательную `intensity` — используйте положительные значения; знак задаётся режимом.
- `gridJitter.jitter` — доля от половины ячейки (0..1), 1 соответствует возможному смещению до ±cell/2 по каждой оси.
- Для «центрального» размещения используйте `ring` с `rMin≈0, rMax≈2` и центром `[world.width/2, world.height/2]`.
- При ошибках в значениях (неизвестный `kind`, `placement.type`, `falloff` или лишние ключи в `bias`) генератор бросает понятные ошибки с указанием конкретного поля.

### Примеры

```ts
const spec: GfxProceduralTerrainSpec = {
  world: { width: 240, height: 240, edgeFade: 0.1 },
  base: { seed: 3795, octaveCount: 5, amplitude: 8, persistence: 0.55, width: 96, height: 96 },
  pool: {
    global: { intensityScale: 1.0, maxOps: 80 },
    recipes: [
      { kind: 'hill', count: [20, 30], placement: { type: 'uniform' }, radius: [10, 18], intensity: [4, 9], falloff: 'smoothstep' },
      { kind: 'plateau', count: [2, 4], placement: { type: 'poisson', minDistance: 50 }, radius: [12, 18], intensity: [2, 4], falloff: 'linear' }
    ]
  },
  seed: 3795
}
```

