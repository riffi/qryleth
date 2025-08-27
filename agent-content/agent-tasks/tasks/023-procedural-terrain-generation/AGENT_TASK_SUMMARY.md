---
id: 23
epic: null
title: "Система процедурной генерации ландшафта с операциями TerrainOps"
status: planned
created: 2025-08-26
updated: 2025-08-27
owner: agent
tags: [terrain, procedural-generation, scene-api, landscaping]
phases:
  total: 7
  completed: 5
---

# Система процедурной генерации ландшафта с операциями TerrainOps

## Обязательная информация
!Правила работы с агентскими задачами: [agent-tasks.md](../../../../docs/development/workflows/agent-tasks.md)
**ВАЖНО**: При выполнении каждой из фаз необходимо обязательно сверяться с требованиями и принципами из указанного файла.

## Цели
Реализовать систему процедурной генерации ландшафта поверх существующей архитектуры террейна с поддержкой различных типов операций (холмы, котловины, хребты, плато и др.) и алгоритмов размещения для создания разнообразных и реалистичных ландшафтов.

## Контекст

### Текущее состояние
В проекте Qryleth уже реализована система террейна с:
- `GfxTerrainConfig` - конфигурация террейна с поддержкой Perlin noise и heightmap
- `GfxTerrainOp` - операции модификации рельефа (add/sub/set, ellipse, falloff)
- `GfxHeightSampler` - единый интерфейс для получения высот и нормалей
- SceneAPI с методами создания слоев террейна

### Потребность
Существующие методы создают базовый террейн без сложных операций. Нужна система процедурной генерации для создания разнообразных ландшафтов с:
- Различными типами рельефа (холмы, котловины, хребты, долины, кратеры, плато)
– Алгоритмами размещения (uniform, poisson, grid, ring)
- Bias-фильтрацией по высоте и уклону
- Детерминированной генерацией через PRNG

### Архитектурные требования
- Обратная совместимость: существующие методы остаются без изменений
- Отдельный модуль `ProceduralTerrainGenerator` вместо расширения SceneAPI
- Интеграция через новые методы в SceneAPI как надстройка над базовой системой
- Использование существующего mulberry32 PRNG из shared/lib/utils

### Размещение в архитектуре проекта

**Новые типы данных:**
- `apps/qryleth-front/src/entities/terrain/model/proceduralTypes.ts` - все типы процедурной генерации

**Основной движок и алгоритмы:**
- `apps/qryleth-front/src/features/scene/lib/terrain/ProceduralTerrainGenerator.ts` - главный класс генератора
- `apps/qryleth-front/src/features/scene/lib/terrain/placement/` - алгоритмы размещения объектов
- `apps/qryleth-front/src/features/scene/lib/terrain/recipes/` - шаблоны операций и их обработка
- `apps/qryleth-front/src/features/scene/lib/terrain/utils/` - утилиты PRNG и математические функции

**Интеграция и фабрики:**
- `apps/qryleth-front/src/features/scene/lib/terrain/TerrainFactory.ts` - готовые конфигурации ландшафтов
- `apps/qryleth-front/src/features/scene/lib/sceneAPI.ts` - новые методы в SceneAPI

**Вспомогательные модули:**
- `apps/qryleth-front/src/shared/lib/utils/prng.ts` - перенесенный mulberry32
- Тесты размещаются рядом с соответствующими модулями (*.test.ts)

### Новые типы данных

#### GfxProceduralTerrainSpec
Полная спецификация для процедурной генерации террейна:

```typescript
interface GfxProceduralTerrainSpec {
  world: {
    width: number        // размеры мира в мировых единицах
    height: number
    edgeFade?: number    // плавный спад к краям (0..1)
  }
  base: GfxProceduralPerlinParams  // базовый Perlin noise с дополнительными параметрами
  pool: GfxTerrainOpPool           // пул операций генерации рельефа
  seed: number                     // глобальный seed
}

// Расширение существующего GfxPerlinParams для процедурной генерации
interface GfxProceduralPerlinParams extends GfxPerlinParams {
  offset?: [number, number]  // сдвиг шума по XZ для вариаций без смены seed
}
```

#### GfxTerrainOpPool
Пул операций для генерации различных типов рельефа:

```typescript
interface GfxTerrainOpPool {
  global?: {
    intensityScale?: number  // глобальный множитель интенсивности
    maxOps?: number         // ограничение количества операций
  }
  recipes: GfxTerrainOpRecipe[]
}

interface GfxTerrainOpRecipe {
  kind: 'hill' | 'basin' | 'ridge' | 'valley' | 'crater' | 'plateau' | 'terrace' | 'dune'
  mode?: 'auto' | 'add' | 'sub' | 'set'  // auto подбирает типичный режим
  count: number | [number, number]        // количество операций
  placement: GfxPlacementSpec            // алгоритм размещения
  radius: number | [number, number]      // базовый радиус в метрах
  aspect?: [number, number]              // отношение Rz/Rx для эллипсов
  intensity: number | [number, number]   // амплитуда изменения высоты
  rotation?: [number, number]            // разброс угла поворота
  falloff?: 'smoothstep' | 'gauss' | 'linear'
  bias?: GfxBiasSpec                     // предпочтения по рельефу
  jitter?: { center?: number }           // шумовой сдвиг центров
  step?: number                          // для stroke: шаг вдоль линии
}
```

#### GfxPlacementSpec и GfxBiasSpec
Алгоритмы размещения и фильтрация по рельефу:

```typescript
type GfxPlacementSpec =
  | { type: 'uniform' }                    // равномерный случайный
  | { type: 'poisson', minDistance: number }  // разреженное размещение
  | { type: 'gridJitter', cell: number, jitter?: number }  // сетка с дрожью
  | { type: 'ring', center: [number,number], rMin: number, rMax: number }  // по кольцу

interface GfxBiasSpec {
  preferHeight?: { min?: number, max?: number, weight?: number }  // фильтр по высоте
  preferSlope?: { min?: number, max?: number, weight?: number }   // фильтр по уклону
  avoidOverlap?: boolean  // избегать пересечений с существующими операциями
}
```

#### Дополнительные служебные типы (область и опции генерации)

```typescript
// Область, внутри которой разрешено размещение операций
type GfxPlacementArea =
  | { kind: 'rect', x: number, y: number, width: number, height: number }
  | { kind: 'circle', x: number, y: number, radius: number }

// Дополнительные опции для генерации пула операций
interface GfxOpsGenerationOptions {
  area?: GfxPlacementArea               // ограничение по области генерации
  sampler?: import('@/entities/terrain').GfxHeightSampler // внешний сэмплер высот для bias/avoidOverlap
}
```

### Единицы измерения и координаты

- Координаты центра операций и размеры (`radius`, `minDistance`, `cell`) задаются в мировых единицах (метрах).
- Угол `rotation` задаётся в радианах. `aspect` — отношение `radiusZ/radiusX` (по умолчанию 1).
- Фильтры `preferHeight` измеряются в метрах (высота), `preferSlope` — в радианах уклона. `weight` — коэффициент влияния на вероятностную выборку (не жёсткий отсев).
- `avoidOverlap: true` — проверка пересечений учитывает как уже сгенерированные новые операции текущей сессии, так и существующие операции в конфигурации, с использованием пространственного индекса.

### Правила маппинга рецептов в операции

- Один рецепт (`GfxTerrainOpRecipe`) может порождать несколько `GfxTerrainOp` (например, `crater` = центральная выемка + вал; `ridge/valley` = серия эллипсов вдоль линии; `terrace` = концентрические «ступени»).
- Значение `mode: 'auto'` интерпретируется по умолчанию так:
  - hill → add; basin → sub; valley → sub; ridge → add; dune → add;
  - plateau → set (или add с малым falloff); crater → комбинированно (sub + add);
  - terrace → set/add сериями.

### Примеры использования

#### Горный ландшафт
```typescript
const mountainTerrain: GfxProceduralTerrainSpec = {
  world: { width: 300, height: 300, edgeFade: 0.1 },
  base: {
    seed: 1234, octaveCount: 6, amplitude: 12, persistence: 0.6,
    width: 128, height: 128
  },
  pool: {
    global: { intensityScale: 1.2, maxOps: 100 },
    recipes: [
      {
        kind: 'hill', count: [15, 25],
        placement: { type: 'poisson', minDistance: 25 },
        radius: [12, 30], intensity: [8, 15],
        falloff: 'smoothstep'
      },
      {
        kind: 'ridge', count: 3,
        placement: { type: 'gridJitter', cell: 120, jitter: 0.35 },
        radius: [8, 12], aspect: [0.2, 0.4], step: 10,
        intensity: [6, 10], falloff: 'smoothstep'
      }
    ]
  },
  seed: 9876
}
```

#### Пустынные дюны
```typescript
const dunesTerrain: GfxProceduralTerrainSpec = {
  world: { width: 200, height: 200, edgeFade: 0.15 },
  base: {
    seed: 5555, octaveCount: 3, amplitude: 4, persistence: 0.4,
    width: 48, height: 48
  },
  pool: {
    recipes: [
      {
        kind: 'dune', count: [20, 30],
        placement: { type: 'gridJitter', cell: 16, jitter: 0.6 },
        radius: [8, 14], aspect: [0.2, 0.5],
        rotation: [-0.3, 0.3], intensity: [1, 3],
        falloff: 'smoothstep'
      },
      {
        kind: 'basin', count: [3, 6],
        placement: { type: 'poisson', minDistance: 40 },
        radius: [15, 25], intensity: [2, 4],
        bias: { preferHeight: { max: 2, weight: 0.8 } }
      }
    ]
  },
  seed: 7777
}
```

#### Использование в коде
```typescript
// Генерация полного террейна
const terrainConfig = await sceneApi.generateProceduralTerrain(mountainTerrain)

// Добавление операций к существующему слою
const additionalOps = await sceneApi.generateTerrainOpsFromPool(
  dunesTerrain.pool,
  12345,
  { 
    area: { kind: 'rect', x: 50, y: 50, width: 100, height: 100 },
    sampler: existingHeightSampler 
  }
)

// Создание слоя с процедурной генерацией
const result = await sceneApi.createProceduralLayer(
  mountainTerrain,
  { name: 'Горный ландшафт', visible: true }
)
```

## Список фаз

### ✅ Фаза 1: Перенос PRNG и создание базовых типов
- Перенести `mulberry32` и связанные функции из `/apps/qryleth-front/src/shared/lib/noise/perlin.ts` в `apps/qryleth-front/src/shared/lib/utils/prng.ts`
- Обновить импорт в `perlin.ts`
- Создать типы для процедурной генерации в `apps/qryleth-front/src/entities/terrain/model/proceduralTypes.ts`:
  - `GfxProceduralTerrainSpec` - полная спецификация процедурного террейна
  - `GfxProceduralPerlinParams` - расширение GfxPerlinParams с полем offset
  - `GfxTerrainOpPool` - пул операций с глобальными настройками
  - `GfxTerrainOpRecipe` - рецепт для генерации операций определенного типа
  - `GfxPlacementSpec` - алгоритмы размещения (uniform, poisson, gridJitter, ring)
  - `GfxBiasSpec` - фильтрация по высоте и уклону
  - `GfxPlacementArea` - ограничение области генерации (rect/circle)
  - `GfxOpsGenerationOptions` - дополнительные опции генерации пула
- Обновить экспорт в `apps/qryleth-front/src/entities/terrain/index.ts`

**Отчёт**: [phases/phase_1_summary.md](phases/phase_1_summary.md)

### ✅ Фаза 2: Алгоритмы размещения
- Создать алгоритмы размещения в `apps/qryleth-front/src/features/scene/lib/terrain/placement/`:
  - `PlacementAlgorithms.ts` - реализация uniform, poisson, gridJitter, ring
  - `PlacementUtils.ts` - вспомогательные функции для работы с координатами
  - `index.ts` - экспорт функций размещения
- Unit-тесты для алгоритмов размещения в `PlacementAlgorithms.test.ts`

### ✅ Фаза 3: Шаблоны операций и bias функции
- Создать систему шаблонов операций в `src/features/scene/lib/terrain/recipes/`:
  - `OperationTemplates.ts` - готовые рецепты для 8 типов операций (hill, basin, ridge, valley, crater, plateau, terrace, dune)
  - `RecipeProcessor.ts` - генерация GfxTerrainOp из рецептов с учетом параметров
  - `BiasProcessor.ts` - фильтрация размещения по высоте, уклону и пересечениям
  - `index.ts` - экспорт всех процессоров
- Создать утилиты PRNG в `src/features/scene/lib/terrain/utils/`:
  - `PRNGUtils.ts` - разделение seed на подпотоки, hash-функции
  - `TerrainUtils.ts` - вспомогательные математические функции
- Unit-тесты для всех процессоров и шаблонов
  
Дополнительно:
- Явно документировать: «один рецепт может порождать несколько GfxTerrainOp» (crater/terrace/ridge).
- Зафиксировать дефолты `mode: 'auto'` для каждого `kind` (см. раздел выше).

### ✅ Фаза 4.1: Движок ProceduralTerrainGenerator (основа)
- Создать основной движок в `apps/qryleth-front/src/features/scene/lib/terrain/ProceduralTerrainGenerator.ts`:
  - Класс `ProceduralTerrainGenerator` с методами:
    - `generateTerrain(spec: GfxProceduralTerrainSpec): Promise<GfxTerrainConfig>`
    - `generateOpsFromPool(pool: GfxTerrainOpPool, seed: number, opts?): Promise<GfxTerrainOp[]>`
  - Интеграция всех алгоритмов размещения, рецептов и bias-фильтров
  - Поддержка ограничений по области размещения и максимальному количеству операций
  
  Статус: реализовано в рамках фазы 4.1
  - Файл: `apps/qryleth-front/src/features/scene/lib/terrain/ProceduralTerrainGenerator.ts`
  - Тест: `apps/qryleth-front/src/features/scene/lib/terrain/ProceduralTerrainGenerator.test.ts`
  - Примечание: `opts` у `generateOpsFromPool` расширен параметрами `worldWidth/worldHeight` для коррекции алгоритмов размещения. Bias-фильтрация учитывает `avoidOverlap` и работает с опциональным внешним `sampler`.
  
  **Отчёт**: [phases/phase_4_1_summary.md](phases/phase_4_1_summary.md)

### ✅ Фаза 4.2: Фабрики и интеграционные тесты
- Создать фабричные методы в `apps/qryleth-front/src/features/scene/lib/terrain/TerrainFactory.ts`:
  - `createMountainTerrain()`, `createHillsTerrain()`, `createDunesTerrain()` и др.
  - Готовые конфигурации для разных типов ландшафтов
- Comprehensive unit-тесты и integration-тесты для движка и фабрик
  
  Статус: реализовано в рамках фазы 4.2
  - Файл: `apps/qryleth-front/src/features/scene/lib/terrain/TerrainFactory.ts`
  - Тест: `apps/qryleth-front/src/features/scene/lib/terrain/TerrainFactory.test.ts`
  - **Отчёт**: [phases/phase_4_2_summary.md](phases/phase_4_2_summary.md)

### ✅ Фаза 5: Интеграция с SceneAPI
- Добавить новые методы в SceneAPI (`apps/qryleth-front/src/features/scene/lib/sceneAPI.ts`):
  - `generateProceduralTerrain(spec: GfxProceduralTerrainSpec): Promise<GfxTerrainConfig>`
  - `generateTerrainOpsFromPool(pool: GfxTerrainOpPool, seed: number, opts?): Promise<GfxTerrainOp[]>`
  - `createProceduralLayer(spec: GfxProceduralTerrainSpec, layerData?: Partial<SceneLayer>): Promise<{success: boolean, layerId?: string, error?: string}>`
- Создать integration-тесты для SceneAPI методов в `sceneAPI.procedural-terrain.test.ts`
- Обеспечить корректную обработку ошибок и валидацию входных параметров
- Проверить производительность и соответствие техническим ограничениям

Примечание:
- `createProceduralLayer(...)` должен использовать `generateProceduralTerrain(...)`, а затем вызывать существующий `createLayerWithAdjustment(...)` для корректной и унифицированной интеграции с текущей логикой выравнивания инстансов.

**Отчёт**: [phases/phase_5_summary.md](phases/phase_5_summary.md)

### ✅ Фаза 6: Обновление ScriptingPanel и AI подсказок
- Обновить подсказки для AI в ScriptingPanel:
  - Дополнить системный промпт в `useAIScriptGenerator.ts` (внутри функции `buildSystemPrompt`) информацией о новых методах
  - Добавить примеры использования процедурной генерации террейна
  - Обновить описания доступных методов SceneAPI с новыми параметрами
- Добавить готовые шаблоны скриптов для процедурной генерации в `scriptTemplates.ts`
- Протестировать AI генерацию скриптов с новыми возможностями

**Отчёт**: [phases/phase_6_summary.md](phases/phase_6_summary.md)

### ⏳ Фаза 7: Обновление документации
- Обновить API документацию:
  - `docs/api/scene-api.md` - добавить описание новых методов процедурной генерации
  - `docs/api/types/terrain.md` - дополнить новыми типами и их подробным описанием
- Обновить функциональную документацию:
  - `docs/features/scene-management/terrain-system.md` - раздел о процедурной генерации
  - Добавить примеры использования и best practices
- Обновить основную проектную документацию в `docs/` с новой функциональностью

### Критерии завершения фаз
- **Фаза 1**: PRNG перенесен, типы созданы, тесты проходят, сборка зеленая
- **Фаза 2**: Алгоритмы размещения работают с unit-тестами покрытием 85%+
- **Фаза 3**: Все 8 типов операций генерируются корректно с bias-фильтрацией
- **Фаза 4**: Движок создает террейн из спецификации, детерминированно воспроизводимо
- **Фаза 5**: SceneAPI интеграция работает, тесты проходят, производительность соответствует требованиям
- **Фаза 6**: ScriptingPanel обновлен, AI генерирует корректные скрипты с новыми методами
- **Фаза 7**: Документация актуализирована, добавлены примеры и best practices

### Технические ограничения
- Максимум 15 файлов изменений за фазу
- Сохранение обратной совместимости с существующими методами
- Покрытие unit-тестами 85%+ для всех новых компонентов
- Детерминированность генерации (одинаковый seed = идентичный результат)
- Производительность: генерация террейна 200x200 с 50 операциями за < 500ms

### Дополнительные технические уточнения
- PRNG: использовать `mulberry32` из `apps/qryleth-front/src/shared/lib/utils/prng.ts`. Все случайности должны зависеть только от seed/под-seed (никакого `Math.random`).
- Под-seed: формировать через хэширование составных частей: `deriveSeed(globalSeed, recipeIndex, opIndex, stage?)`.
- `gridJitter.jitter` — доля от размера ячейки (0..1), где 1 означает возможное смещение до ±0.5 cell по каждой оси.
