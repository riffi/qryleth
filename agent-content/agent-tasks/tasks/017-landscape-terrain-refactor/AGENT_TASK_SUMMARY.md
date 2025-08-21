---
id: 17
epic: null
title: "Рефакторинг системы ландшафтных слоев с HeightSampler и TerrainConfig"
status: in-progress
created: 2025-08-21
updated: 2025-08-21
owner: claude-agent
tags: [landscape, terrain, refactor, heightmap, perlin]
phases:
  total: 6
  completed: 1
---

# Рефакторинг системы ландшафтных слоев с HeightSampler и TerrainConfig

## Обязательная информация
!Правила работы с агентскими задачами: [agent-tasks.md](../../../../docs/development/workflows/agent-tasks.md)
**ВАЖНО**: При выполнении каждой из фаз необходимо обязательно сверяться с требованиями и принципами из указанного файла.

## Цели
Полностью заменить текущую архитектуру ландшафтных слоев на унифицированную систему с `HeightSampler`, добавить поддержку PNG heightmaps и системы модификаций террейна (TerrainOps). Устранить дублирование логики вычисления высот между компонентами.

## Контекст

### Текущее состояние (As Is)
- Геометрия слоя Landscape создаётся через `createPerlinGeometry`, результатом является geometry + noiseData
- В `LandscapeLayer` noiseData сохраняется в слой при первом рендере  
- В `ObjectPlacementUtils` высота для размещения объектов вычисляется независимо, но похожим образом
- В `GfxLayer` хранится `noiseData?: number[]`

### Проблемы текущей архитектуры
1. **Дублирование логики**: Вычисление высот реализовано дважды - в `perlinGeometry.ts` и `ObjectPlacementUtils.ts` 
2. **Ограниченные источники данных**: Поддерживается только Perlin noise, нет возможности загружать heightmaps
3. **Отсутствие модификаций**: Нет системы для локальных изменений рельефа (холмы, впадины)
4. **Жесткая привязка к noiseData**: Структура `GfxLayer.noiseData?: number[]` не расширяема

### Целевая архитектура (To Be)

**Единый источник высоты через GfxHeightSampler**:
```typescript
export interface GfxHeightSampler {
  getHeight(x: number, z: number): number;                  // мировые координаты
  getNormal(x: number, z: number): [number, number, number];// конечные разности
}
```

**Типы данных террейна**:
```typescript
// Данные perlinNoise
export interface GfxPerlinParams {
  seed: number;
  octaveCount: number;
  amplitude: number;
  persistence: number;
  width: number; // в сегментах сетки, а не мировых координатах!
  height: number; // в сегментах сетки, а не мировых координатах!
}

// Данные heightmap
export interface GfxHeightmapParams {
  assetId: string;        // ключ blob PNG в Dexie
  imgWidth: number;
  imgHeight: number;
  min: number;            // нормализация уровня моря/нуля
  max: number;            // максимальная высота
  wrap?: 'clamp'|'repeat';
}

// Данные геометрии слоя
export type GfxTerrainSource =
| { kind: 'perlin'; params: GfxPerlinParams }
| { kind: 'heightmap'; params: GfxHeightmapParams }
| { kind: 'legacy'; data: Float32Array; width: number; height: number }; // для миграции

// Одна «добавка» (операция модификации рельефа)
export interface GfxTerrainOp {
  id: string;                 // для редактирования/удаления
  mode: 'add' | 'sub' | 'set';// как применять смещение
  center: [number, number];   // мировые координаты (x,z)
  radius: number;             // сферический радиус влияния (в мировых единицах)
  intensity: number;          // амплитуда изменения высоты (+/-)
  falloff?: 'smoothstep' | 'gauss' | 'linear';
  // Дополнительно (опционально):
  radiusZ?: number;           // если указан → эллипс rx=radius, rz=radiusZ
  rotation?: number;          // поворот эллипса (рад)
}

export interface GfxTerrainConfig {
  worldWidth: number;
  worldHeight: number;
  edgeFade?: number;          // плавный спад к краю (0..1 доля от края)
  source: GfxTerrainSource;
  ops?: GfxTerrainOp[];       // МАССИВ «добавок» (если одна, то только она)
}
```

**Принципы работы GfxHeightSampler**:
1. **База**: берём высоту из source:
   - perlin: адаптер seed-friendly шума (simplex/open-simplex + свой PRNG)
   - heightmap: bilinear из ImageData (UV→px,py)
   - legacy: bilinear из сохранённого массива (для миграции)

2. **Применяем ops**: для каждой GfxTerrainOp вычисляем вклад:
   - расстояние r от center с учётом эллипса (и rotation), нормируем t = clamp(1 - r, 0, 1)
   - falloff(t): linear=t, smoothstep=t*t*(3-2*t), gauss=exp(-3*r*r)
   - delta = intensity * falloff
   - mode: add → h+=delta, sub → h-=delta, set → h = base + delta

3. **Края**: edgeFade (плавный спад высоты к 0 по периметру)
4. **Нормаль**: центральные/встречные разности через 2–4 вызова getHeight

**Генерация геометрии**:
```typescript
export function buildGfxTerrainGeometry(cfg: GfxTerrainConfig, sampler: GfxHeightSampler) {
  const segments = decideSegments(cfg.worldWidth, cfg.worldHeight) // 10..200
  const geom = new THREE.PlaneGeometry(cfg.worldWidth, cfg.worldHeight, segments, segments)
  geom.rotateX(-Math.PI/2)
  const arr = geom.attributes.position.array as Float32Array
  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i], z = arr[i+2]
    arr[i+1] = sampler.getHeight(x, z)
  }
  geom.attributes.position.needsUpdate = true
  geom.computeVertexNormals()
  geom.computeBoundingBox()
  return geom
}
```

**Размещение объектов**: ObjectPlacementUtils использует только:
```typescript
const y = sampler.getHeight(x, z)
const n = sampler.getNormal(x, z)
```

**Импорт heightmap**:
- UI: «Загрузить PNG» → сохраняем blob в Dexie (assets) → получаем assetId
- Без воркера: createImageBitmap(blob) → Canvas → ImageData (RGBA)
- GfxHeightSampler для heightmap делает bilinear из яркости Y = 0.2126R+0.7152G+0.0722B, маппит в [min..max]

**Новая структура слоя**:
```typescript
export interface GfxLayer {
  // ...
  terrain?: GfxTerrainConfig
}
```

**Критичные файлы для изменения**:
- `src/features/scene/lib/geometry/perlinGeometry.ts` - заменить на новую архитектуру
- `src/features/scene/lib/placement/ObjectPlacementUtils.ts` - убрать дублирование логики
- `src/features/scene/ui/renderer/landscape/LandscapeLayer.tsx` - интегрировать GfxHeightSampler
- `src/entities/layer/model/types.ts` - добавить GfxTerrainConfig, убрать noiseData
- `src/features/scene/ui/objectManager/SceneLayerModals.tsx` - добавить UI загрузки heightmaps

**Breaking Changes**: Старые сохраненные сцены с `noiseData` перестанут работать (это допустимо по требованию).

## Список фаз

### ✅ Фаза 1: Создание типов и интерфейсов GfxTerrainConfig
- Создать новые доменные типы согласно постановке: `GfxPerlinParams`, `GfxHeightmapParams`, `GfxTerrainSource`, `GfxTerrainOp`, `GfxTerrainConfig`
- Определить интерфейс `GfxHeightSampler` с методами `getHeight()` и `getNormal()`
- Создать файл `src/entities/terrain/model/types.ts` для доменных типов террейна
- Создать файл `src/entities/terrain/index.ts` для экспорта типов
- Обновить `src/entities/layer/model/types.ts` - добавить `terrain?: GfxTerrainConfig` в `GfxLayer`, пометить `noiseData` как deprecated
- Настроить Dexie схему для хранения PNG blobs в таблице `terrainAssets`

**Отчёт**: [phases/phase_1_summary.md](phases/phase_1_summary.md)

### ⏳ Фаза 2: Реализация GfxHeightSampler и базовых источников
- Создать `src/features/scene/lib/terrain/GfxHeightSampler.ts` с реализацией интерфейса
- Реализовать `createGfxHeightSampler(cfg: GfxTerrainConfig): GfxHeightSampler`
- Поддержать источники: `perlin` (с seed-friendly генерацией), `legacy` (для миграции), заготовка для `heightmap`
- Реализовать обработку edgeFade для плавного спада к краям
- Добавить методы вычисления нормалей через центральные разности
- Покрыть тестами основные сценарии использования

### ⏳ Фаза 3: Интеграция GfxTerrainOps системы
- Реализовать применение массива `GfxTerrainOp[]` в GfxHeightSampler
- Поддержать все режимы: `add`, `sub`, `set`
- Реализовать различные функции затухания: `smoothstep`, `gauss`, `linear`
- Добавить поддержку эллиптических операций с `radiusZ` и `rotation`
- Оптимизировать производительность: пространственный индекс для GfxTerrainOps, кэширование результатов
- Протестировать комбинации различных операций

### ⏳ Фаза 4: Поддержка PNG heightmaps и Dexie интеграция
- Реализовать загрузку PNG в Dexie через `terrainAssets` таблицу
- Создать функции для конвертации PNG в ImageData без воркеров
- Реализовать bilinear интерполяцию для источника `heightmap` в GfxHeightSampler
- Добавить нормализацию высот через параметры `min`/`max` в GfxHeightmapParams
- Реализовать различные режимы UV wrapping: `clamp`, `repeat`
- Создать утилиты для валидации размеров и форматов PNG файлов

### ⏳ Фаза 5: Обновление компонентов рендеринга и размещения объектов
- Заменить логику в `LandscapeLayer.tsx`: убрать `createPerlinGeometry`, использовать `GfxHeightSampler` + `buildGfxTerrainGeometry`
- Обновить `ObjectPlacementUtils.ts`: заменить `queryHeightAtCoordinate` и `calculateSurfaceNormal` вызовами GfxHeightSampler
- Создать новую функцию `buildGfxTerrainGeometry(cfg: GfxTerrainConfig, sampler: GfxHeightSampler)` 
- Убрать сохранение `noiseData` в стор, заменить на `terrain: GfxTerrainConfig`
- Обеспечить совместимость: legacy слои должны продолжать работать через `kind: 'legacy'`
- Протестировать генерацию геометрии и размещение объектов на всех типах источников

### ⏳ Фаза 6: UI для управления heightmaps и обновление документации
- Добавить в `SceneLayerModals.tsx` интерфейс загрузки PNG файлов
- Создать превью загруженных heightmaps с настройками min/max высот
- Реализовать управление GfxTerrainOps через UI: добавление/редактирование/удаление операций
- Добавить валидацию файлов и обработку ошибок при загрузке
- Обновить типы и интерфейсы в соответствии с новой архитектурой
- Обновить основную проектную документацию: описать новую архитектуру террейна, GfxHeightSampler API, примеры использования GfxTerrainOps