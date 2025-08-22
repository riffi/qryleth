# Система террейнов (ландшафтные слои)

Документ описывает обновлённую архитектуру ландшафтных слоёв: единый сэмплер высоты, поддержку PNG heightmap и модификаций рельефа (TerrainOps), а также соответствующие изменения UI.

---

## Ключевые изменения

- 🧭 Единый источник истины: высоты и нормали считаются через `GfxHeightSampler` и используются и в рендеринге, и при размещении объектов.
- 🖼️ Поддержка PNG heightmap: загрузка файлов в IndexedDB (Dexie) и bilinear интерполяция яркости.
- 🧰 TerrainOps: локальные модификации рельефа (add/sub/set) с функциями затухания и эллиптическими зонами влияния.
- ♻️ Legacy-совместимость: старое поле `noiseData` поддерживается через `terrain.source.kind = 'legacy'`.

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
4. Создайте слой → PNG сохраняется в Dexie, формируется `GfxTerrainConfig` и сохраняется в store.

---

## Технические детали

- Типы: см. `docs/api/types/terrain.md`
- Сэмплер: `src/features/scene/lib/terrain/GfxHeightSampler.ts`
- Утилиты для heightmap: `src/features/scene/lib/terrain/HeightmapUtils.ts`
- Рендеринг: `src/features/scene/ui/renderer/landscape/LandscapeLayer.tsx`
- Размещение объектов: `src/features/scene/lib/placement/ObjectPlacementUtils.ts`

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

---

## Совместимость и миграция

- Старые слои с `noiseData` автоматически обрабатываются как `terrain.source.kind = 'legacy'`.
- Новые слои сохраняются с `terrain: GfxTerrainConfig`; поле `noiseData` больше не заполняется.
- Scene API метод `adjustInstancesForPerlinTerrain` работает со всеми типами террейнов.

---

## Производительность

- Кэш значений высот в `GfxHeightSampler` ускоряет повторные запросы.
- Пространственный индекс уменьшает число проверок при большом количестве `TerrainOps`.
- Геометрия пересобирается только при изменении источника/настройки/загрузке ImageData.

