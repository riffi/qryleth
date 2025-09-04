---
id: 29
epic: null
title: "Биомы: скаттеринг с учётом поверхности террейна (высота/склон/кривизна)"
status: planned
created: 2025-09-04
updated: 2025-09-04
owner: team-graphics
tags: [gfx, biomes, terrain, scattering, sampling, performance]
phases:
  total: 7
  completed: 5
---

# Биомы: скаттеринг с учётом поверхности террейна (высота/склон/кривизна)

## Обязательная информация
Правила работы с агентскими задачами: docs/development/workflows/agent-tasks.md
Соблюдать принципы архитектуры: docs/architecture/design-principles.md

## Цели
- Добавить параметризацию скаттеринга по параметрам поверхности террейна: высота (absolute world Y), наклон (slope), кривизна (curvature).
- Поддержать гибкие режимы применения: reject, weight, spacing (возможна комбинация).
- Определять террейн-слой динамически по координате (x,z); вне террейна — жёсткий reject.
- Сохранить детерминизм (seed) и обратную совместимость API (всё — опционально).
- Обеспечить производительность для слоя 300×300 (сегменты) и ≈1000 инстансов.

## Контекст
Текущий скаттеринг биомов (apps/qryleth-front/src/features/scene/lib/biomes/BiomeScattering.ts) генерирует точки в XZ и не учитывает рельеф при выборе позиций. Выравнивание по высоте и автоповорот по нормали применяются постфактум в SceneAPI (adjustAllInstancesForTerrainAsync, applySurfaceNormalRotation). Требуется добавить возможность управлять отбором и локальной плотностью уже на этапе генерации точек с учётом параметров поверхности: абсолютная высота, наклон, кривизна.

Ключевые требования (подтверждены пользователем):
- Источник высот выбирать по координате (x,z): брать тот landscape/terrain слой, в чьи мировые границы попадает точка; если точка вне всех террейнов — жёстко отбрасывать.
- Нужны обе возможности: и строгая фильтрация (reject), и плавное взвешивание вероятности (weight), и адаптивный spacing (spacing), с возможностью комбинирования.
- Единицы высоты — абсолютный world Y (референс seaLevel допускается для смещения, но по умолчанию — абсолют).
- Производительность — ориентироваться на террейн ~300×300 и ≈1000 деревьев: кэширование и ограничение выборок.

Задействованные модули:
- Типы биомов: apps/qryleth-front/src/entities/biome/model/types.ts
- Генераторы точек: apps/qryleth-front/src/features/scene/lib/biomes/{RandomSampling.ts,PoissonDiskSampler.ts}
- Оркестратор: apps/qryleth-front/src/features/scene/lib/biomes/BiomeScattering.ts
- Сэмплер высот: apps/qryleth-front/src/entities/terrain/model/types.ts (GfxHeightSampler)
- Доступ к сэмплеру слоя: apps/qryleth-front/src/features/editor/scene/lib/placement/terrainAdapter.ts
- Утилиты поверхности: apps/qryleth-front/src/features/editor/scene/lib/terrain/colorUtils.ts (calculateCurvature, slope)
- Интеграция: apps/qryleth-front/src/features/editor/scene/lib/sceneAPI.ts

Дефолты для «из коробки» (ориентиры):
- combine: mul; равные веса факторов
- height.range: [seaLevel, seaLevel+60], soft: 0.2
- slopeDeg.range: [0, 28], soft: 0.3
- curvature.range: [0, 0.4], soft: 0.2, step: 1.0 (world units)
- spacingScale: minFactor: 0.75, maxFactor: 1.6

Критерии приёмки:
- При активированной маске «высота/склон/кривизна» точки вне террейна не генерируются (reject).
- Режимы reject/weight/spacing корректно влияют на распределение и количество точек в обоих алгоритмах (random, poisson).
- Детально задокументированные комментарии на русском в добавленных методах.
- Детерминированность сохранена при одинаковом seed.
- Производительность не деградирует заметно на 300×300/≈1000 инстансов (время скаттеринга — приемлемое, без подвисаний UI).

## Список фаз

### ✅ Фаза 1: Расширение доменной модели биома (типизация)
- Добавить в `GfxBiomeScatteringConfig` поле `surface?: GfxBiomeSurfaceMask`.
- Описать `GfxBiomeSurfaceMask`:
  - `height?: { range?: [number, number]; soft?: number; reference?: 'world' | 'seaLevel' | number }`
  - `slopeDeg?: { range?: [number, number]; soft?: number }`
  - `curvature?: { range?: [number, number]; soft?: number; step?: number }`
  - `mode?: Array<'reject' | 'weight' | 'spacing'>` (комбинируемый)
  - `combine?: 'mul' | 'min' | 'max' | 'avg'`
  - `weight?: { byHeight?: number; bySlope?: number; byCurvature?: number }`
  - `spacingScale?: { minFactor?: number; maxFactor?: number }`
- Экспорт типов из `entities/biome/index.ts`.
- Обновить док-блоки типов (RU) и краткую справку в docs (если требуется).

Отчёт: [phases/phase_1_summary.md](phases/phase_1_summary.md)

### ✅ Фаза 2: Выбор террейн-слоя по координате
- Реализовать `getTerrainSamplerAt(x,z): GfxHeightSampler | null` на базе списка `SceneLayer`:
  - Приоритет: `shape=Terrain` → другие `Landscape`; затем по порядку слоёв.
  - Проверять AABB слоя по `terrain.worldWidth/worldDepth` и `terrain.center`.
- Вернуть `seaLevel` для слоя (если потребуется для reference='seaLevel').
- Документировать функцию и ограничения. Вне террейна — считать «нет слоя».

Отчёт: [phases/phase_2_summary.md](phases/phase_2_summary.md)

### ✅ Фаза 3: Поверхностная маска — расчёт локального веса/фактора
- Ввести чистые утилиты расчёта `W(x,z)∈[0..1]` и `spacingFactor(x,z)`:
  - Высота: `Y = sampler.getHeight(x,z)` (absolute world Y; опционально `Y - seaLevel`).
  - Наклон: из `sampler.getNormal(x,z)` → угол в градусах.
  - Кривизна: `calculateCurvature(sampler, x, z, step)`.
  - Комбинация по `combine` + `weight`.
- Политика вне террейна: `reject` (W=0).
- Минимальные кэши: сетка 64×64 внутри bounds биома, билинейная интерполяция значений.

Отчёт: [phases/phase_3_summary.md](phases/phase_3_summary.md)

### ✅ Фаза 4: Интеграция маски в генераторы точек
- RandomSampling:
  - После проверки области — применять `surface.mode`:
    - `reject`: отбраковка при `W < threshold` (например, 0.5 при `soft=0`).
    - `weight`: принять с вероятностью `W`.
    - `spacing`: масштабировать локальный `minDist` через `spacingScale` и `W`.
  - Скорректировать оценку целевого количества точек (E[W^2], влияние spacing).
- PoissonDiskSampler:
  - Использовать `localR = baseSpacing * spacingFactor(x,z)` при генерации кандидатов и проверке соседей.
  - Применять `reject/weight` после теста дистанции.
  - Скорректировать `targetCount` аналогично Random.
- Детальные комментарии (RU) в изменённых методах.

Отчёт: [phases/phase_4_summary.md](phases/phase_4_summary.md)

### ✅ Фаза 5: Оркестрация и интеграция SceneAPI
- В `BiomeScattering.scatterBiomePure` и вызовы семплеров добавить опциональный `surfaceCtx`.
- В `SceneAPI.scatterBiome` сформировать `surfaceCtx` через `getTerrainSamplerAt(x,z)` и передать в скаттеринг.
- Для heightmap-источников — убедиться, что данные готовы (при необходимости дождаться `sampler.ready?.()`).
- Сохранить текущий этап выравнивания по высоте и наклон по нормали как пост-этап.

Отчёт: [phases/phase_5_summary.md](phases/phase_5_summary.md)

### ⏳ Фаза 6: Обновление шаблонов ScriptingPanel (группа «Биомы»)
- Обновить шаблоны и примеры скриптов для работы с биомами так, чтобы демонстрировать новый `surface`:
  - Примеры включения `surface.mode` в разных комбинациях: `['reject']`, `['weight']`, `['spacing']`, и комбинированные варианты.
  - Пресеты для деревьев/камней/травы с рекомендуемыми диапазонами `height/slopeDeg/curvature` и `spacingScale`.
  - Использование «выбора слоя по (x,z)» в комментариях и подсказках.
- Обновить methodDocs/подсказки: описать новые поля `GfxBiomeSurfaceMask`, единицы измерения (absolute world Y), политику «вне террейна = reject».
- Проверить автодополнение и валидацию параметров в шаблонах (дефолтные значения не задавать, если `surface` не указан).

### ⏳ Фаза 7: Документация, дефолты и валидация
- Описать новые поля в конфиге биома (README по биомам или соответствующий раздел UI).
- Задать дефолты под сценарий 300×300 / ≈1000 точек (см. «Дефолты…» выше).
- Краткий набор тестов/сценариев ручной проверки: равнина/склон/хребет/вне области террейна.
- Отчёт о производительности и выбранных параметрах кэша.
