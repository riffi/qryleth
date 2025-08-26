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
  seed: number
  octaveCount: number
  amplitude: number
  persistence: number
  width: number
  height: number
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
  worldWidth: number
  worldHeight: number
  edgeFade?: number        // плавный спад высоты к краям (0..1 доля от края)
  source: GfxTerrainSource
  ops?: GfxTerrainOp[]     // необязательный набор локальных модификаций
}
```

---

## Сэмплер высоты

```ts
export interface GfxHeightSampler {
  /**
   * Получить высоту Y для мировых координат (x, z)
   * Возвращает высоту после применения источника, ops и edgeFade.
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
- Геометрия: `buildGfxTerrainGeometry(cfg, sampler)` — формирует `THREE.BufferGeometry` по сэмплеру.

---

## Использование в рендеринге

```ts
import { createGfxHeightSampler, buildGfxTerrainGeometry } from '@/features/scene/lib/terrain/GfxHeightSampler'

// 1) получить конфигурацию террейна
const sampler = createGfxHeightSampler(layer.terrain)
const geometry = buildGfxTerrainGeometry(layer.terrain, sampler)
```

- Компонент: `src/features/scene/ui/renderer/landscape/LandscapeLayer.tsx`
- Поведение:
  - при наличии `layer.terrain` используется напрямую;
  - для пустых слоёв создаётся новая `perlin` конфигурация, сохраняемая в store.

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
- Асинхронная загрузка ImageData; на время загрузки sampler может возвращать 0 и триггерить `onHeightmapLoaded`.

---

## Пример создания слоя с heightmap

```ts
import type { GfxTerrainConfig } from '@/entities/terrain'

const terrainConfig: GfxTerrainConfig = {
  worldWidth: 100,
  worldHeight: 100,
  edgeFade: 0.15,
  source: {
    kind: 'heightmap',
    params: {
      assetId: 'dexie-asset-id',
      imgWidth: 1024,
      imgHeight: 1024,
      min: 0,
      max: 10,
      wrap: 'clamp'
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

