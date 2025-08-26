# Система террейнов (ландшафтные слои)

Документ описывает обновлённую архитектуру ландшафтных слоёв: единый сэмплер высоты, поддержку PNG heightmap и модификаций рельефа (TerrainOps), модульную структуру террейна, а также соответствующие изменения UI.

---

## Ключевые изменения

- 🧭 Единый источник истины: высоты и нормали считаются через `GfxHeightSampler` и используются и в рендеринге, и при размещении объектов. У сэмплера есть жизненный цикл: `isReady()`, `ready()`, `dispose()`.
- 🖼️ Поддержка PNG heightmap: загрузка файлов в IndexedDB (Dexie), биллинейная интерполяция яркости и хранение массива высот (Float32Array) для быстрого семплинга.
- 🔁 Дедупликация при загрузке: карты масштабируются до ≤200px по большей стороне, из них извлекаются высоты и считается хэш; при совпадении хэша ассет переиспользуется (новый не создаётся).
- 🧰 TerrainOps: локальные модификации рельефа (add/sub/set) с функциями затухания и эллиптическими зонами влияния.
 - 🧩 Модульная архитектура: источники, семплинг, эффекты, операции и кэши вынесены в отдельные модули под `src/features/scene/lib/terrain/`.
 - 🧠 Кэши с TTL/LRU: `assets/heightmapCache.ts` контролирует память и предоставляет `invalidate(assetId)`/`clear()`.
 

---

## UI: создание слоя ландшафта

Компонент: `src/features/scene/ui/objectManager/SceneLayerModals.tsx`

Поток создания:

1. Выберите «Форма поверхности» → Рельефная поверхность (террейн)
2. Источник данных террейна:
   - `Perlin` — детерминированный шум
   - `Heightmap` — загрузка PNG

### Создание Perlin-террейна

1. Выберите источник `Perlin`
2. Настройте параметры генерации:
   - **Seed** — зерно для детерминированности (любое число)
   - **Octave Count** — количество слоёв шума (1-8, рекомендуется 3-5)
   - **Amplitude** — максимальная высота рельефа (обычно 5-20)
   - **Persistence** — затухание деталей между слоями (0.1-0.8)
   - **Grid Width/Height** — размер сетки генерации (16-128 сегментов)
3. Опционально настройте:
   - **Edge Fade** — плавное затухание к краям (0.0-0.3)
   - **World Size** — размеры террейна в мировых единицах
4. Создайте слой → конфигурация сохраняется в store

**Рекомендуемые настройки для разных типов ландшафта:**

- **Горы**: octaveCount=5-6, amplitude=15-25, persistence=0.6, grid=128x128
- **Холмы**: octaveCount=3-4, amplitude=5-10, persistence=0.4, grid=64x64
- **Равнина**: octaveCount=2-3, amplitude=2-5, persistence=0.3, grid=32x32

### Создание Heightmap-террейна

1. Выберите источник `Heightmap`
2. Загрузите PNG-файл (поддерживаются стандартные форматы)
3. Настройте параметры интерпретации:
   - **Минимальная высота (min)** — высота для чёрных пикселей
   - **Максимальная высота (max)** — высота для белых пикселей
   - **Режим краёв (wrap)**: 
     - `clamp` — крайние пиксели растягиваются за границы
     - `repeat` — изображение повторяется по краям
4. Создайте слой → PNG сохраняется в Dexie (с дедупликацией по хэшу высот), формируется `GfxTerrainConfig` и сохраняется в store

---

## Технические детали

- Типы: см. `docs/api/types/terrain.md`
- Сэмплер: `src/features/scene/lib/terrain/GfxHeightSampler.ts`
- Утилиты для heightmap: `src/features/scene/lib/terrain/HeightmapUtils.ts`
- Рендеринг: `src/features/scene/ui/renderer/landscape/LandscapeLayer.tsx`
- Размещение объектов: `src/features/scene/lib/placement/ObjectPlacementUtils.ts`
- Построение геометрии: `src/features/scene/lib/terrain/GeometryBuilder.ts` (`buildGfxTerrainGeometry`, `decideSegments`)
- Модули террейна:
  - `heightSources/PerlinSource.ts`, `heightSources/HeightmapSource.ts`
  - `sampling/uv.ts`, `sampling/bilinear.ts`
  - `ops/spatialIndex.ts`, `ops/applyOps.ts`
  - `effects/edgeFade.ts`
  - `assets/heightmapCache.ts` (кэш ImageData и числового поля высот, инвалидация, TTL/LRU)

---

## Примеры конфигураций террейнов

### Пример конфигурации Perlin

```ts
import type { GfxTerrainConfig } from '@/entities/terrain'

// Горный ландшафт с высокой детализацией
const perlinMountains: GfxTerrainConfig = {
  worldWidth: 250,
  worldHeight: 250,
  edgeFade: 0.2,
  source: {
    kind: 'perlin',
    params: {
      seed: 42,
      octaveCount: 6,    // много слоёв для сложного рельефа
      amplitude: 18.0,   // высокие пики
      persistence: 0.55, // сохранение деталей
      width: 128,        // высокое разрешение
      height: 128
    }
  },
  ops: [
    // Центральный массив
    {
      id: 'main-ridge',
      mode: 'add',
      center: [125, 125],
      radius: 60,
      intensity: 8.0,
      falloff: 'smoothstep'
    },
    // Долина-проход
    {
      id: 'valley-pass',
      mode: 'sub',
      center: [100, 150],
      radius: 25,
      radiusZ: 40,
      rotation: Math.PI / 3,
      intensity: 6.0,
      falloff: 'gauss'
    }
  ]
}

// Плавные холмы для пасторального ландшафта
const perlinHills: GfxTerrainConfig = {
  worldWidth: 180,
  worldHeight: 180,
  edgeFade: 0.1,
  source: {
    kind: 'perlin',
    params: {
      seed: 777,
      octaveCount: 3,    // мало слоёв = плавность
      amplitude: 6.0,    // невысокие холмы
      persistence: 0.35, // быстрое затухание деталей
      width: 48,         // низкое разрешение = мягкие формы
      height: 48
    }
  }
}
```

### Пример конфигурации Heightmap

```ts
import type { GfxTerrainConfig } from '@/entities/terrain'

const heightmapTerrain: GfxTerrainConfig = {
  worldWidth: 120,
  worldHeight: 120,
  edgeFade: 0.15,
  source: {
    kind: 'heightmap',
    params: {
      assetId: 'dexie-asset-id',
      imgWidth: 2048,
      imgHeight: 2048,
      min: -2,           // глубина водоёмов
      max: 12,           // высота вершин
      wrap: 'clamp'      // растянуть края
    }
  }
}
```

### Пример использования сэмплера и геометрии в рендере

```ts
import { createGfxHeightSampler } from '@/features/scene/lib/terrain/GfxHeightSampler'
import { buildGfxTerrainGeometry } from '@/features/scene/lib/terrain/GeometryBuilder'

const sampler = createGfxHeightSampler(cfg)
await sampler.ready?.() // для heightmap дождаться загрузки данных
const geometry = buildGfxTerrainGeometry(cfg, sampler)
```

---

## Совместимость и миграция

- Поддержка устаревшего поля `noiseData` удалена. Используйте `terrain: GfxTerrainConfig`.
- Scene API метод `adjustInstancesForPerlinTerrain` работает со всеми типами террейнов новой архитектуры.

### Инвалидация кэшей

- При удалении или переименовании ассета вызывается `invalidate(assetId)` из `assets/heightmapCache.ts` (инициируется в `HeightmapUtils.ts`).

---

## Производительность

- Кэш значений высот в `GfxHeightSampler` ускоряет повторные запросы.
- Пространственный индекс уменьшает число проверок при большом количестве `TerrainOps`.
- Геометрия пересобирается только при изменении источника/настройки/загрузке ImageData.
- Высоты сохраняются в Dexie и индексируются по хэшу — повторные загрузки идентичных PNG не создают дубликатов.
- В `assets/heightmapCache.ts` применяются TTL/LRU для контроля памяти; предусмотрены `invalidate(assetId)` и глобальный `clear()`.

