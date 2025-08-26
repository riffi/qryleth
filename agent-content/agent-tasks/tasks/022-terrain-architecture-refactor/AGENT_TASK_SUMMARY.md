---
id: 22
epic: null
title: "Рефакторинг архитектуры террейна: GfxHeightSampler, LandscapeLayer, TerrainOps"
status: in_progress
created: 2025-08-26
updated: 2025-08-26
owner: platform-graphics
tags: [terrain, rendering, placement, architecture, refactoring]
phases:
  total: 8
  completed: 4
---

# Рефакторинг архитектуры террейна: GfxHeightSampler, LandscapeLayer, TerrainOps

## Обязательная информация
Правила работы с агентскими задачами: [agent-tasks.md](../../../../docs/development/workflows/agent-tasks.md)
ВАЖНО: При выполнении каждой из фаз необходимо сверяться с требованиями и принципами из указанного файла.

## Контекст

Существующая реализация террейна эволюционировала и стала избыточно «склеенной»:

- В `LandscapeLayer` смешаны обязанности рендера и побочных эффектов (создание `terrain` по умолчанию, взаимодействие со стором, управление прелоадером).
– В коде всё ещё присутствует устаревший (legacy) функционал: поле `noiseData`, источник `'legacy'`, ветки адаптации в `LandscapeLayer`/`ObjectPlacementUtils`. По решению — legacy больше не используется и должен быть полностью удалён.
– В `GfxHeightSampler.ts` сосредоточено слишком много разнородной логики: источники высот (perlin/heightmap), билинейная интерполяция, TerrainOps, edge fade, загрузка ассетов Dexie, кэширование, а также создание геометрии.
- В коде есть «магические» константы (например, `edgeFade=0.15`, `sampleStep=0.01`, `spatialCellSize=10`), не вынесенные в конфиг.
- Решение по количеству сегментов геометрии не учитывает реальное разрешение источника высот (undersampling/oversampling).
- Управление готовностью heightmap (асинхронная загрузка) разнесено и «хрупко»: в UI есть таймауты и ручные закрытия прелоадера.

См. также:
- docs/features/scene-management/terrain-system.md
- docs/api/types/terrain.md
- apps/qryleth-front/src/features/scene/lib/terrain/GfxHeightSampler.ts
- apps/qryleth-front/src/features/scene/ui/renderer/landscape/LandscapeLayer.tsx
- apps/qryleth-front/src/features/scene/lib/placement/ObjectPlacementUtils.ts

## Цели

- Разделить ответственность модулей террейна, сделать код читаемым, тестируемым и расширяемым.
– Полностью выпилить legacy-функционал (тип источника `legacy`, поле `noiseData`, любые адаптеры и ветки) из типов, кода, тестов и документации.
– Убрать дублирование логики (вычисления высот/нормалей, edge fade).
- Ввести явный жизненный цикл у `GfxHeightSampler`: `isReady()`, `ready()`, `dispose()`.
- Централизовать константы и привязать вычисление нормалей/сегментов к реальному разрешению источника.
- Сделать `LandscapeLayer` «чистым» рендер-компонентом (без записи в стор и таймеров для прелоадера).

## Не цели

- Не внедряем новые виды источников террейна.
– Сохранение обратной совместимости со старыми сценами, содержащими `noiseData` (осознанно отказываемся по решению — legacy больше не используется).
- Не меняем UI/UX загрузчика ассетов, кроме связанного со статусом готовности.

## Архитектурные изменения (план структуры)

Разделить `GfxHeightSampler.ts` на модули:

- heightSources/
  - PerlinSource.ts — генерация и выборка базовых высот Perlin.
  - HeightmapSource.ts — выборка из heightmap (через массив высот/или ImageData как фоллбэк).
- sampling/
  - bilinear.ts — билинейная интерполяция: массив высот и ImageData.
  - uv.ts — world→UV и стратегии wrap (`clamp` | `repeat`).
- ops/
  - spatialIndex.ts — построение и выбор релевантных операций.
  - applyOps.ts — применение TerrainOps: `calculateOpContribution`, `applyFalloff`, эллипс/поворот.
- effects/
  - edgeFade.ts — `calculateEdgeFade(x,z,world,edgeFade)`.
- assets/
  - heightmapCache.ts — кэши ImageData и heights field, загрузка из Dexie, инвалидация, TTL.
- GeometryBuilder.ts — `buildGfxTerrainGeometry()`, `decideSegments()` (вынести из сэмплера).
- GfxHeightSampler.ts — тонкая композиция источников/утилит; интерфейс `getHeight`, `getNormal`, `onHeightmapLoaded`, `isReady`, `ready`, `dispose`.

Централизация констант:

- apps/qryleth-front/src/features/scene/config/terrain.ts
  - `EDGE_FADE_DEFAULT`
  - `SAMPLE_STEP_DEFAULT`
  - `SPATIAL_CELL_SIZE_DEFAULT`

Подстройка под разрешение источника:

– `sampleStep` для нормалей: завязать на шаг сетки источника (Perlin/heightmap).
- `decideSegments`: учитывать реальное разрешение источника (ограничивать `TERRAIN_MAX_SEGMENTS`).

Управление готовностью/прелоадером:

- `GfxHeightSampler`: `isReady()`, `ready()` — промис, закрывающийся после загрузки heights/ImageData.
- В UI убрать таймауты-заглушки, использовать `ready()`.

## Список фаз

### ✅ Фаза 1: Полное удаление legacy
- Типы: удалить ветку `'legacy'` из `GfxTerrainSource` и связанные интерфейсы.
- Слои/сцена: удалить поле `noiseData` отовсюду (типы, использование, сохранение/загрузка).
- `GfxHeightSampler.ts`: удалить `createLegacySource` и все ветки `source.kind === 'legacy'`.
- UI/Utils: удалить `createLegacyTerrainConfig` и весь код обхода в `LandscapeLayer.tsx`, `ObjectPlacementUtils.ts`.
- Перлин‑геометрия: удалить файл `perlinGeometry.ts` и все импорты (deprecated).
- Тесты: удалить/обновить тесты, завязанные на legacy.
- Документация: убрать упоминания legacy/`noiseData`.
Результат: по коду/докам нет ссылок на `legacy` и `noiseData`; сборка зелёная.

Отчёт: [phases/phase_1_summary.md](./phases/phase_1_summary.md)

### ✅ Фаза 2: Вынесение построения геометрии
- Создать `apps/qryleth-front/src/features/scene/lib/terrain/GeometryBuilder.ts`:
  - Перенести `buildGfxTerrainGeometry(cfg, sampler)` из `GfxHeightSampler.ts`.
  - Перенести `decideSegments(worldW, worldH, sourceResolution)` с учётом источника:
    - Для heightmap: использовать `(imgWidth-1, imgHeight-1)` или сохранённую сетку `heightsField`.
    - Для perlin: использовать `(gridW-1, gridH-1)` сетки шума.
    - Ограничить `TERRAIN_MAX_SEGMENTS`, нижняя граница ≥10.
  - Подробные русские комментарии к методам.
- Обновить импорты в `LandscapeLayer.tsx` и тестах.
Результат: геометрия строится прежним образом; сегменты ближе к реальному разрешению источника.

Отчёт: [phases/phase_2_summary.md](./phases/phase_2_summary.md)

### ✅ Фаза 3: Распил GfxHeightSampler на модули
- Структура каталогов `apps/qryleth-front/src/features/scene/lib/terrain/`:
  - `heightSources/PerlinSource.ts` — `createPerlinSource(params, world) => (x,z)=>y`.
  - `heightSources/HeightmapSource.ts` — `createHeightmapSource(params, world, assets)` с приоритетом массива высот.
  - `sampling/bilinear.ts` — билинейная интерполяция по Float32Array и ImageData.
  - `sampling/uv.ts` — world→UV, wrap: `clamp|repeat`.
  - `ops/spatialIndex.ts` — построение индекса по ячейкам (конфигурируемый `cellSize`).
  - `ops/applyOps.ts` — `applyTerrainOps(baseHeight,x,z,ops,index)`; `calculateOpContribution`, `applyFalloff`.
  - `effects/edgeFade.ts` — `calculateEdgeFade(x,z,world,edgeFade)`.
  - `assets/heightmapCache.ts` — кэш `ImageData` и `heightsField` + `load...`, `invalidate(assetId)`, TTL.
- Упростить `GfxHeightSampler.ts` до композиции модулей + публичные методы: `getHeight`, `getNormal`, `onHeightmapLoaded`.
- Обеспечить отсутствие циклических зависимостей; обновить barrel-экспорты.
Результат: читаемая модульная архитектура; поведение эквивалентно.

Отчёт: [phases/phase_3_summary.md](./phases/phase_3_summary.md)

### ✅ Фаза 4: Нормали и шаг выборки
- Динамический `sampleStep`:
  - `step = clamp(min(worldW/(gridW-1), worldH/(gridH-1)), stepMin, stepMax)`.
  - `stepMin` выбрать эмпирически (например, `worldMin/1000`), `stepMax` — чтобы не терять рельеф.
- Обновить `getNormal`: центральные разности, гарантировать нормализацию, обработать вырожденные случаи.
- Русский комментарий к методу: формулы, сложность, граничные условия.
Результат: стабильные нормали на разных масштабах.

Отчёт: [phases/phase_4_summary.md](./phases/phase_4_summary.md)

### ⏳ Фаза 5: UI/Store — чистый LandscapeLayer и ready()
- `LandscapeLayer`:
  - Удалить логику создания default terrain и любые вызовы `updateLayer` из рендера.
  - В эффекте инициализации использовать `await sampler.ready()` вместо таймаутов; скрывать прелоадер по факту готовности.
  - Убрать принудительный `key` у `<mesh>`; добавить корректный `dispose` геометрии в `useEffect`.
- `SceneLayerModals`/`SceneAPI`:
  - При создании Terrain-слоя всегда сохранять валидный `terrain` (перлин по умолчанию, если иной не выбран).
Результат: UI без побочных эффектов при рендере; предсказуемая загрузка.

### ⏳ Фаза 6: Кэши и инвалидация ассетов
- В `assets/heightmapCache.ts` реализовать:
  - `get/set` для ImageData и heights field.
  - `invalidate(assetId)` и глобальную `clear()`.
  - Soft TTL (LRU или по времени бездействия).
- В `HeightmapUtils` вызывать `invalidate` при `deleteTerrainAsset/rename`.
Результат: контроль памяти и консистентности кэшей.

### ⏳ Фаза 7: Тестирование
- Unit-тесты:
  - `sampling/bilinear.test.ts`: корректность интерполяции по контрольной матрице.
  - `sampling/uv.test.ts`: wrap `clamp|repeat` на краевых значениях.
  - `GeometryBuilder.test.ts`: варианты источников, лимиты сегментов.
  - `GfxHeightSampler.test.ts`: `ready()/isReady()`, кэш, инвалидация, стабильность нормалей.
- Интеграционные тесты:
  - `LandscapeLayer` не изменяет стор на маунте.
  - Прелоадер закрывается по `ready()` без таймеров.
Результат: зелёные тесты, базовое покрытие ключевой логики.

### ⏳ Фаза 8: Обновить документацию
- Обновить `docs/features/scene-management/terrain-system.md`: новая структура модулей, кэши, `ready()`.
- Обновить `docs/api/types/terrain.md`: ссылки на модули, примеры использования `ready()`/`buildGfxTerrainGeometry`.
- Уточнить в `docs/README.md` и API-обзорах единый источник высот.
- Подчеркнуть требование: «к каждому методу — подробный комментарий на русском».
Результат: документация согласована с кодом.

— После выполнения каждой фазы обновить этот файл: отметить статус ✅ и добавить ссылку на отчёт `phases/phase_N_summary.md`.

## Критерии приёмки

- Все вычисления высот и нормалей проходят через `GfxHeightSampler` (без альтернативных путей).
- `LandscapeLayer` не создаёт/не изменяет слой или terrain-конфиг в рендере.
- `GfxHeightSampler` предоставляет `isReady()` и `ready()`; UI не использует таймауты-заглушки.
- Нормали устойчивы при разных размерах мира и разрешении источника.
- Количество сегментов геометрии соответствует источнику; нет заметного undersampling/oversampling.
- В репозитории отсутствуют упоминания `legacy`, `noiseData`, `createLegacySource`, `createLegacyTerrainConfig`, `createPerlinGeometry`.
- Тесты зелёные; покрытие базовых сценариев: bilinear, uv, ops, ready(), geometry.

## Риски и смягчения

- Разбиение файла может повлиять на импорты — последовательное PR-деление по этапам.
- Память: кэши могут расти — добавить TTL/инвалидацию, использовать WeakRef при необходимости (браузерная поддержка).
- Производительность: динамический `sampleStep` и инкрементальная регенерация нормалей — профилировать перед/после; оставить кэш высот.


# Правила реализации

- Все новые/изменённые методы документировать подробными комментариями на русском языке: назначение, параметры, алгоритм, сложность, пограничные случаи.
- Сохранять стиль проекта, избегать «шумных» переименований.
- Не менять несвязанный код. Про дефиксы — только если блокируют задачу (с пометкой в PR).

# Контрольный список (Check-list)

- [ ] Legacy-функционал удалён: нет `legacy`/`noiseData`/`createLegacy*`/`createPerlinGeometry` в коде/доках/тестах.
- [ ] Вынесены константы в `config/terrain.ts`.
- [ ] Перенесены `buildGfxTerrainGeometry`/`decideSegments` в `GeometryBuilder.ts` с улучшениями.
- [ ] `GfxHeightSampler` распилен по модулям; добавлены `isReady/ready/dispose`.
- [ ] `sampleStep` завязан на разрешение источника.
- [ ] UI использует `ready()`; прелоадер без таймеров.
- [ ] Реализована инвалидация кэшей ассетов.
- [ ] Добавлены unit/интеграционные тесты.
- [ ] Обновлена документация.
