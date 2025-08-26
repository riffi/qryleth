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
3. Для heightmap — загрузите PNG и настройте параметры:
   - Минимальная/максимальная высота (min/max)
   - Режим краёв (wrap: `clamp` | `repeat`)
4. Создайте слой → PNG сохраняется в Dexie (с дедупликацией по хэшу высот), формируется `GfxTerrainConfig` и сохраняется в store.

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

## Пример конфигурации heightmap

```ts
import type { GfxTerrainConfig } from '@/entities/terrain'

const cfg: GfxTerrainConfig = {
  worldWidth: 120,
  worldHeight: 120,
  edgeFade: 0.15,
  source: {
    kind: 'heightmap',
    params: {
      assetId: 'dexie-asset-id',
      imgWidth: 2048,
      imgHeight: 2048,
      min: -2,
      max: 12,
      wrap: 'clamp'
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

