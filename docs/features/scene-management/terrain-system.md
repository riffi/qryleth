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

## 🆕 Процедурная генерация ландшафта

Система процедурной генерации строит террейн по спецификации (`GfxProceduralTerrainSpec`), используя:
- базовый источник Perlin с параметрами шума;
- пул рецептов (`GfxTerrainOpPool`) с алгоритмами размещения центров операций и bias-фильтрацией;
- детерминированный PRNG (одинаковый seed → идентичный результат).

Главный движок: `src/features/scene/lib/terrain/ProceduralTerrainGenerator.ts`.

Использование через SceneAPI:
- `generateProceduralTerrain(spec)` — собрать `GfxTerrainConfig`;
- `generateTerrainOpsFromPool(pool, seed, opts)` — только операции `ops[]`;
- `createProceduralLayer(spec, layerData?)` — создать слой и выровнять инстансы.

Поддерживаемые значения:
- `recipe.kind`: hill | basin | ridge | valley | crater | plateau | terrace | dune
- `placement.type`: uniform | poisson | gridJitter | ring
- `falloff`: smoothstep | gauss | linear

Валидация: при неверных значениях полей будет выброшена понятная ошибка с указанием проблемного поля (например, неизвестный `placement.type` или `recipe.kind`).

Пример (JavaScript):
```javascript
const spec = {
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
const res = await SceneAPI.createProceduralLayer(spec, { name: 'Процедурный ландшафт', visible: true })
```

Подробнее о типах см. `docs/api/types/terrain.md` (раздел «Процедурная генерация»).

---

## Детальная семантика процедурной генерации

### recipe.kind — типы рецептов рельефа

- hill:
  - Режим по умолчанию: add (поднимает рельеф).
  - Одна эллиптическая операция. `radius` — базовый радиус по X, `aspect` задаёт отношение по Z (radiusZ = radius * aspect). `rotation` поворачивает эллипс.
  - `intensity` — высота подъёма. Отрицательные значения приводятся к модулю, знак задаётся режимом.

- basin:
  - Режим по умолчанию: sub (понижает рельеф).
  - Семантика и параметры как у hill, но эффект «выемки».

- ridge:
  - Режим по умолчанию: add.
  - Если `step > 0` — создаётся серия из нескольких эллипсов («штрихов») вдоль линии через `center` с шагом `step` и углом `rotation` (или случайным, если `rotation` не задан). Иначе — один эллипс как у hill.
  - Используйте небольшой `aspect` (например, 0.2–0.4) для вытянутых хребтов.

- valley:
  - Режим по умолчанию: sub.
  - Поведение аналогично ridge (серия при `step > 0`), но понижает высоту (долина).

- crater:
  - Составной рецепт: центральная выемка (sub) + внешний вал (add) большего радиуса и меньшей интенсивности.
  - `falloff` управляет мягкостью стенок кратера.

- plateau:
  - Режим по умолчанию: set (приподнятая плоская площадка с плавным краем).
  - Рекомендуется `falloff: 'linear'` для более «плоской» вершины.

- terrace:
  - Составной рецепт: несколько концентрических «колец‑ступеней» с чередованием режимов (set/add) и уменьшающейся интенсивностью к краям.

- dune:
  - Режим по умолчанию: add.
  - Одна эллиптическая «дюна». Для барханов используйте `aspect < 1` и `rotation`/диапазон `rotation`.

Примечания:
- Для `valley`/`basin` не задавайте отрицательную `intensity` — знак определяется режимом.
- `jitter.center` добавляет случайный сдвиг центров в метрах.

### placement.type — алгоритмы размещения центров

- uniform:
  - Равномерное случайное размещение по миру или указанной области (`area`). Для круглой области выполняется повторная выборка до попадания внутрь.

- poisson:
  - Разрежённое размещение с минимальной дистанцией `minDistance` между точками (dart throwing). Избегает скучивания.

- gridJitter:
  - Сетка с ячейкой `cell`. В каждую ячейку — одна точка вблизи центра с дрожанием `jitter` (0..1) от половины cell. Возвращает до `count` точек.

- ring:
  - Аннулюс вокруг `center: [x, z]` с радиусом из `[rMin..rMax]`. Углы распределяются равномерно; недобор добирается случайными попытками.
  - Для «центрального» размещения используйте `rMin≈0, rMax≈2`.

### falloff — функции затухания

- smoothstep:
  - Плавная полиномиальная функция t^2 (3 − 2t). Значение по умолчанию. Даёт сглаженные края.

- gauss:
  - Экспоненциальное затухание вокруг вершины. Выше пик, быстрее спад к краям. Подходит для «острых» форм.

- linear:
  - Линейное затухание. Края более «жёсткие». Полезно для плато/ступеней.

### Справочник параметров спецификации

Общие единицы измерения:
- Длины (radius, radiusZ, minDistance, cell, rMin/rMax, step) — в мировых единицах (метрах);
- Углы (rotation) — в радианах; диапазоны rotation — [min, max] в радианах;
- Высоты/интенсивности — в метрах (амплитуда изменения рельефа);
- Все диапазоны указываются как [min, max] и выбираются детерминированно на основе seed.

spec.world:
- width, height: размеры мира (X/Z). Используются всеми алгоритмами размещения и при построении геометрии.
- edgeFade?: доля (0..1), на которую затухает высота к краям мира (мягкая рамка).

base (Perlin):
- seed: зерно шума; одинаковое значение даёт одинаковую базовую карту высот.
- octaveCount: количество октав (детализация). Больше = сложнее и «шумнее» рельеф; обычно 3–6.
- amplitude: максимальная амплитуда базового рельефа (в метрах).
- persistence: затухание амплитуды между октавами (0..1). Меньше → более гладкий рельеф.
- width/height: размеры решётки для генерации шума (в сегментах). Меньше → крупнее детали.
- offset?: [dx, dz] (опционально) — сдвиг узора шума без смены seed.

pool.global:
- intensityScale?: глобальный множитель интенсивности для всех операций из recipes.
  - Применяется после выбора локальной intensity рецепта. Полезно для «общего усиления/ослабления» рельефа.
- maxOps?: верхний предел количества операций, которое попадёт в итоговую конфигурацию (после развёртки рецептов и bias‑фильтрации).

recipe (основные поля):
- kind: тип рельефа (см. выше); задаёт режим по умолчанию через mode='auto'.
- mode?: 'auto' | 'add' | 'sub' | 'set' — вручную переопределяет режим, иначе берётся из kind.
- count: число центров для рецепта. Может быть числом или диапазоном [min, max] (целое выбирается детерминированно).
- placement: спецификация размещения центров (см. ниже).
- radius: базовый радиус вдоль X. Может быть числом или диапазоном.
- aspect?: отношение радиусов по Z/X. Может быть диапазоном. radiusZ = radius * aspect.
- intensity: амплитуда изменения высоты (м). Может быть числом или диапазоном.
  - Знак определяется mode (движок использует абсолютное значение); для valley/basin указывайте положительные числа.
- rotation?: угол или диапазон углов (радианы). Для одиночных эллипсов определяет ориентацию; для ridge/valley — направление штриха, если указан step.
- falloff?: 'smoothstep' | 'gauss' | 'linear' — функция затухания по краям влияния (см. выше).
- bias?: предпочтения по рельефу (см. ниже).
- jitter?: { center?: number } — случайный сдвиг центров (м) вокруг исходной точки размещения.
- step?: число (м) — для ridge/valley создаёт серию эллипсов вдоль линии через center; при отсутствии step создаётся один эллипс.

placement (параметры):
- uniform: без параметров — равномерное случайное по миру/области.
- poisson: { minDistance } — минимально допустимое расстояние между центрами (м).
- gridJitter: { cell, jitter? } — размер ячейки (м) и дрожание 0..1 (смещение до ±cell/2 по каждой оси).
- ring: { center: [x, z], rMin, rMax } — центр и диапазон радиусов (м). rMax ≥ rMin ≥ 0.

bias:
- preferHeight?: { min?, max?, weight? } — предпочитаемый интервал высот (м). weight ∈ [0..1] — сила влияния.
- preferSlope?: { min?, max?, weight? } — предпочитаемый интервал уклонов (радианы). Требует sampler для оценки нормалей.
- avoidOverlap?: boolean — исключать пересечения между уже выбранными и существующими операциями (жадный выбор по убыванию веса).

Дополнительные опции генерации (для generateTerrainOpsFromPool):
- worldWidth/worldHeight: обязательны, если нельзя автоматически взять из слоя.
- area?: ограничение области генерации: { kind: 'rect' | 'circle', ... }.
- sampler?: внешний GfxHeightSampler — позволяет учитывать preferHeight/preferSlope и избегать пересечений с существующим рельефом точнее.

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

