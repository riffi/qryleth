# Биомы (перечень типов)

Биом — доменная сущность сцены, описывающая область на плоскости XZ и параметры скаттеринга объектов библиотеки внутри этой области. В v2 система опирается на единый параметр плотности — `spacing` — и упрощённую стратификацию без «правил».

Связанные разделы:
- Сцена и Scene API: docs/api/scene-api.md
- Управление сценой (фича): ../../features/scene-management/biomes.md

---

## Состав типов

- `GfxBiome` — биом сцены (uuid, name, area, visible?, scattering, strata?).
- `GfxBiomeArea` — геометрия области (`rect` | `circle` | `polygon`).
- `GfxBiomeScatteringConfig` — конфигурация скаттеринга v2 (algorithm, spacing, seed?, edge?, transform?, source?).
- `GfxScatterAlgorithm` — `'random' | 'poisson'`.
- `GfxBiomeEdgeFalloff` — поведение у границ: fade и bias.
- `GfxBiomePlacementTransform` — рандомизация трансформаций инстансов.
- `GfxBiomeSourceFilter` — фильтр источников из библиотеки.

---

## GfxBiome

- uuid: строка — уникальный идентификатор биома.
- name: строка — обязательное имя (для UI/логов).
- area: `GfxBiomeArea` — геометрия области.
- visible?: boolean — видимость биома (для UI/отладки).
- scattering: `GfxBiomeScatteringConfig` — дефолтные настройки скаттеринга для биома.
- strata?: `GfxBiomeStratum[]` — необязательные страты; каждая — частичный оверрайд `scattering`.

Сериализация: `SceneData.biomes: GfxBiome[]`.

---

## GfxBiomeArea

- Прямоугольник (`rect`): `{ type: 'rect', rect: { x, z, width, depth }, rotationY?: number }`.
- Круг (`circle`): `{ type: 'circle', circle: { x, z, radius } }`.
- Многоугольник (`polygon`): `{ type: 'polygon', points: [ [x,z], ... ], bounds?: { minX, maxX, minZ, maxZ } }`.

Единицы измерения: «единицы сцены» (везде одинаковые для X/Z и `spacing`).

---

## GfxBiomeScatteringConfig

- algorithm: `'random' | 'poisson'` — выбор алгоритма.
- seed?: number — базовый сид биома; страты получают детерминированные производные сиды.
- spacing: number — минимально желаемая дистанция между точками (каноника плотности).
- edge?: `GfxBiomeEdgeFalloff` — опционально; по умолчанию `fadeWidth=0`, `edgeBias=0`, `fadeCurve='linear'`.
- transform?: `GfxBiomePlacementTransform` — опционально; по умолчанию `randomYawDeg=[0,360]`, `randomUniformScale=[1,1]`, `randomOffsetXZ=[0,0]`.
- source?: `GfxBiomeSourceFilter` — опционально; если не задан, используется вся библиотека с равными весами.

Strata: `GfxBiomeStratum = { name: string; scattering?: Partial<GfxBiomeScatteringConfig>; }`.

Детерминизм: для страты с индексом `i` локальный сид вычисляется как `seed_i = hash(biomeSeed, i)` (в реализации — `xfnv1a(`${biomeSeed}:${i}`)`).

---

## Поведение у границ (GfxBiomeEdgeFalloff)

- fadeWidth: number — ширина зоны затухания внутрь области.
- fadeCurve?: `'linear' | 'smoothstep'` — профиль затухания.
- edgeBias?: number — смещение вероятности: `-1` к краям, `+1` к центру, `0` нейтрально.

---

## Трансформации инстансов (GfxBiomePlacementTransform)

- randomYawDeg?: `[min,max]` — поворот вокруг Y (градусы).
- randomUniformScale?: `[min,max]` — равномерный масштаб.
- randomOffsetXZ?: `[min,max]` — локальные случайные смещения по XZ.
- alignToSurfaceNormal?: `{ maxDeviationDeg?: number; curvatureInfluence?: number }` — автоповорот по нормали поверхности террейна (наклоны вокруг X/Z):
  - maxDeviationDeg: максимальный наклон в градусах при 90° исходной нормали. Фактический наклон масштабируется линейно: 0° нормали → 0°, 90° → `maxDeviationDeg`. Если не задан — берётся значение по умолчанию подсистемы (≈30°).
  - curvatureInfluence: влияние кривизны поверхности [0..1] на наклон. 0 — игнорировать кривизну; 1 — максимально подавлять наклон на сильно изогнутых участках. Эффективный предел: `maxDegRad * (1 - curvature * curvatureInfluence)`.

Примечания:
- Поворот вокруг Y, заданный генератором скаттеринга (`rotationYDeg`), сохраняется. Автоповорот добавляет только наклоны по X/Z.
- Вычисления используют `GfxHeightSampler.getNormal(x,z)` и функцию `normalToRotation` (мягкое ограничение наклона без «упора в максимум»).

Пример:
```ts
transform: {
  randomYawDeg: [0, 360],
  randomUniformScale: [0.9, 1.3],
  randomOffsetXZ: [0, 0.3],
  alignToSurfaceNormal: { maxDeviationDeg: 20, curvatureInfluence: 0.4 }
}
```

---

## Источники (GfxBiomeSourceFilter)

- requiredTags?: string[] — объект должен содержать все теги.
- anyTags?: string[] — объект должен содержать хотя бы один из тегов.
- excludeTags?: string[] — исключающие теги.
- includeLibraryUuids?: string[] — явное включение по UUID (приоритетнее тегов).
- weightsByLibraryUuid?: Record<string, number> — веса по UUID.
- weightsByTag?: Record<string, number> — веса по тегам.

Примечание: сравнение тегов ведётся в нижнем регистре; рекомендуется нормализовать теги библиотеки.

---

## Алгоритмы скаттеринга и spacing

Общая оценка верхней границы количества точек `N_max` по площади `S` и `spacing` — по шестиугольной упаковке:
- Плотность упаковки: η≈0.9069.
- Площадь «зоны влияния» точки: `A = π · (spacing/2)^2`.
- Оценка: `N_max = round(η · S / A)`.

Random:
- Генерируются кандидаты равномерно по области с учётом `edge` (вероятность принятия = fade · bias).
- Мягкий постфильтр: отбраковка кандидатов ближе, чем `spacing * t` к уже принятым (`t=0.9` по умолчанию).
- Остановка: при достижении `N_max` или исчерпании бюджета попыток.

Poisson:
- Использует `spacing` как `minDistance` в Poisson‑disk семплинге.
- Целевое количество ограничивается `N_max`.

Ограничение: на текущем этапе межстратные коллизии по `spacing` не учитываются (страты независимы).

---

## Пример: прямоугольный биом со стратами

```ts
import type { GfxBiome } from '@/entities/biome'

const biome: GfxBiome = {
  uuid: 'auto-or-guid',
  name: 'Лесной биом',
  visible: true,
  area: { type: 'rect', rect: { x: -100, z: -100, width: 200, depth: 200 }, rotationY: 0 },
  scattering: {
    algorithm: 'poisson',
    spacing: 1.5,
    seed: 12345,
    edge: { fadeWidth: 8, fadeCurve: 'smoothstep', edgeBias: 0 },
    transform: { randomYawDeg: [0,360], randomUniformScale: [0.9,1.3], randomOffsetXZ: [0,0.6] },
    source: { anyTags: [] }
  },
  strata: [
    { name: 'Деревья', scattering: { spacing: 2.2, source: { requiredTags: ['дерево'] } } },
    { name: 'Кустарники', scattering: { spacing: 1.6, source: { anyTags: ['куст'] } } },
    { name: 'Трава', scattering: { spacing: 1.0, source: { anyTags: ['трава'] } } }
  ]
}
```

---

## См. также

- Scene API: методы `getBiomes()`, `addBiome()`, `updateBiome()`, `removeBiome()`, `scatterBiome()`, `regenerateBiomeInstances()`, `getInstancesByBiomeUuid()`: ../scene-api.md
- Фича «Биомы»: ../../features/scene-management/biomes.md
