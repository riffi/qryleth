---
epic: null
title: "Биомы: доменная модель, теги библиотеки, скаттеринг и интеграция"
status: in-progress
created: 2025-09-02
updated: 2025-09-02
owner: team-graphics
tags: [gfx, biomes, library, scattering, ui, scripting]
phases:
  total: 8
  completed: 6
---

## Контекст
В рамках сцены требуется поддержать «биомы» — логические области на плоскости XZ, где выполняется скаттеринг объектов из библиотеки по тегам и весам. Биом включает форму области (rect/circle/polygon), параметры плотности и распределения (random/poisson), поведение у границ (fade/bias), seed и настройки случайных трансформаций. Инстансы, созданные биомом, должны ссылаться на `biomeUuid`.

Часть работ уже выполнена:
- создан доменный тип `GfxBiome`, расширен `SceneData` и Zustand‑store сцены;
- реализовано тегирование объектов библиотеки: дублирование в `ObjectRecord.tags` (Dexie индексы) и в `objectData.tags`; добавлено UI редактирования тегов в ObjectEditor и вывод/поиск по тегам в библиотеке.

Дальнейшие фазы — реализация движка скаттеринга по биомам, UI для создания/редактирования биомов и интеграция в `sceneAPI` и `ScriptingPanel`.

Важно: для всех математических вычислений и 2D‑геометрии использовать общие shared типы и функции (`shared/types/geo2d`, `shared/types/vector3`, `shared/lib/math/*`), не дублировать утилиты.

## Цели
- Завершить реализацию биомов: генерация размещений, UI, API и скриптовые инструменты.
- Обеспечить детерминированность по `seed` и отзывчивый UI редактирования.
- Гарантировать консистентность тегов между библиотекой и объектами.

## Список фаз

### ✅ Фаза 1: Доменные типы биомов и расширение сцены
- Добавить `entities/biome` с типами областей и параметров скаттеринга.
- Расширить `SceneData` полем `biomes: GfxBiome[]` и Zustand‑store сценой: CRUD биомов, сохранение/загрузка.
- Добавить `biomeUuid?: string` в `GfxObjectInstance` для связи инстансов с биомом.

Отчёт: [phases/phase_1_summary.md](phases/phase_1_summary.md)

### ✅ Фаза 2: Теги в библиотеке и UI редактирования
- Вынести теги в `ObjectRecord.tags` и проиндексировать `tags` + `*tags` в Dexie.
- Дублировать теги в `objectData.tags`; нормализовать (lowercase, uniq, trim).
- Добавить панель «Свойства» в ObjectEditor с `TagsInput` (редактирование тегов).
- В библиотеке: поиск по тегам, вывод тегов на карточках, кликабельные бейджи, «+N/Свернуть».

Отчёт: [phases/phase_2_summary.md](phases/phase_2_summary.md)

### ✅ Фаза 3: Скаттеринг по биомам (ядро)
- Создать модуль `features/scene/lib/biomes/`:
  - `BiomeAreaUtils.ts` — попадание точки, вычисление расстояния до границы и fade‑коэффициента; поддержать формы: rect (с optional rotationY), circle, polygon; использовать `shared/types/geo2d` и функции из `shared/lib/math` (напр. `clamp`).
  - `RandomSampling.ts` — равномерная выборка точек по площади области с учётом edge‑веса (fade/bias).
  - `PoissonDiskSampler.ts` — выборка по Poisson‑disk (blue noise) с `minDistance`, работающая в пределах произвольной области; архитектурно отделить «кандидат → валидатор площади».
  - `BiomeScattering.ts` — оркестратор: выбор источников из библиотеки по тегам/весам, детерминированный RNG по `seed`, применение трансформаций (yaw, uniform scale, offsetXZ), возврат списка «позиций/поворотов/масштабов + выбранный libraryUuid».
- Выход ядра: чистые функции без побочных эффектов, не модифицируют store (возвращают результат скаттеринга).
- Документация в начале каждого метода на русском языке.

Отчёт: [phases/phase_3_summary.md](phases/phase_3_summary.md)

Критерии приёмки:
- Поддержаны обе схемы распределения: `random` и `poisson`.
- Учитываются `edge.fadeWidth`, `edge.fadeCurve: linear|smoothstep` и `edgeBias (-1..1)`.
- Результаты детерминированы по `seed`.
- Используются shared типы/функции; дублирования математики нет.

### ✅ Фаза 4: Стратифицированные биомы — Итерация 1 (GfxBiomeStratum & GfxBiomePlacementRule)

Что сделать:
- Расширить модель `GfxBiome` массивом `strata: GfxBiomeStratum[]`.
- Определить доменные типы `GfxBiomeStratum` и более конкретный `GfxBiomePlacementRule` (вместо абстрактного RuleSet) в `entities/biome` и экспортировать их через barrel.
- Обновить оркестратор: проход по всем `strata`, внутри — по всем `rules: GfxBiomePlacementRule[]` с агрегацией результатов в единый список placements.

Отчёт: [phases/phase_4_summary.md](phases/phase_4_summary.md)

Вход:
- Биом в новом формате (`strata: GfxBiomeStratum[]`, у страты `rules: GfxBiomePlacementRule[]`).
- Параметры сцены: `seed`, библиотека (список `{ libraryUuid, tags[] }`).

Выход:
- Единый список placements (формат как ранее: `{ position, rotationYDeg, uniformScale, libraryUuid }`).

Критерии приёмки:
- Биом с 2–3 стратами/правилами даёт совокупный список точек.
- В логах/отладке видно, какая страта и какое правило сработало.

### ✅ Фаза 5: Стратифицированные биомы — Итерация 2 (Локальные параметры GfxBiomePlacementRule)

Отчёт: [phases/phase_5_summary.md](phases/phase_5_summary.md)

Что сделать:
- В каждом `GfxBiomePlacementRule` задать локальные параметры (переопределяют параметры биома):
  - `densityPer100x100`, `edgeFalloff` (`fadeWidth`, `curve`, `bias`), `transform` (`yawDeg[min,max]`, `uniformScale[min,max]`, `offsetXZ[min,max]`).
- Сэмплинг и трансформации должны читать параметры из `GfxBiomePlacementRule`.
- Детерминизм: `seed = hash(biomeSeed, stratumIndex, ruleIndex)` (использовать `xfnv1a`/`createRng` из shared).

Критерии приёмки:
- Разные слои (например, деревья и трава) в одном биоме имеют разную плотность и fade.
- Разные диапазоны scale/yaw визуально заметны на сцене.
- Один и тот же seed → стабильный результат.

### ✅ Фаза 6: Стратифицированные биомы — Итерация 3 (Выбор источников per GfxBiomePlacementRule)

Отчёт: [phases/phase_6_summary.md](phases/phase_6_summary.md)

Что сделать:
- В `GfxBiomePlacementRule` добавить `sourceSelection`:
  - `requiredTags[]`, `anyTags[]`, `excludeTags[]`, `includeLibraryUuids[]`.
  - `weightsByTag{ tag->weight }`, `weightsByUuid{ uuid->weight }`.
- Выбор источников выполнять локально в рамках `GfxBiomePlacementRule`: фильтрация → нормализация весов → weighted random.

Критерии приёмки:
- Разные правила (`GfxBiomePlacementRule`) выбирают разные группы объектов (деревья ≠ кусты ≠ трава).
- Изменение весов меняет распределение выбранных моделей.
- Если фильтры обнулили пул — оркестратор возвращает явную ошибку (и пропускает конкретное правило или весь стратиум — по настройке).

### ◻️ Фаза 7: Интеграция в sceneAPI и ScriptingPanel

— sceneAPI
- Методы: `getBiomes()`, `addBiome()`, `updateBiome()`, `removeBiome()`, `scatterBiome(biomeUuid)`, `regenerateBiomeInstances(biomeUuid)`, `getInstancesByBiomeUuid(biomeUuid)`.
- Сохранение/загрузка `biomes` уже поддерживаются через `SceneData`; проверить сериализацию и совместимость.
- Размещение инстансов: создавать `SceneObjectInstance` с `biomeUuid`; реиспользовать существующие `SceneObject` по `libraryUuid` или добавлять при необходимости.
 - Автоподстройка высоты по террейну (обязательно): после создания инстансов из placements выровнять их Y через `ObjectPlacementUtils`:
   - Использовать `adjustAllInstancesForTerrainAsync(instances, terrainLayer, objectsWithBBoxes)` или синхронный вариант `adjustInstancesForTerrain(...)`.
   - Файлы: `features/editor/scene/lib/placement/ObjectPlacementUtils.ts`, `features/editor/scene/lib/placement/terrainAdapter.ts` (GfxHeightSampler).
   - Важно: передавать массив объектов сцены с `boundingBox`, чтобы нижняя грань объекта корректно становилась на поверхность. Террейн‑слой брать из активного landscape `SceneLayer`.
   - Математика/высоты — через унифицированный `GfxHeightSampler`; никаких локальных реализаций в скаттеринге.

— ScriptingPanel
- Инструменты для управления биомами: создание/обновление/удаление, запуск скаттеринга/регенерации, выборка сводок.
- Обновить `methodDocs` и примеры: особое внимание к различию `libraryUuid` и scene `uuid` (object/instance).
- Строго использовать shared типы (geo2d, vector, transform) и математику из `shared/lib`.

Критерии приёмки:
- Полный набор API в `sceneAPI` и инструменты в `ScriptingPanel` работают согласованно.
- Все математические функции используют shared типы/утилиты; дублирования нет.

### ◻️ Фаза 8: UI «Биомы» в SceneObjectManager (SceneEditor)

— UI в правой панели SceneEditor (SceneObjectManager)
- Раздел «Биомы»:
  - Заголовок «Биомы», кнопка `+` (создать), счётчик «N биомов» (опционально).
  - Список биомов: имя, тип области (rect/circle/polygon), распределение (random/poisson), видимость, «M инстансов» (подсчёт по `objectInstances` с `biomeUuid`).
  - Действия: ЛКМ — выделить/подсветить область, ДКЛ — открыть редактирование, ПКМ — контекстное меню.
- Модалка «Создать/Редактировать биом» (вкладки):
  - Область: выбор `rect|circle|polygon`; поля для `Rect2D` (x,z,width,depth, rotationY°), `Circle2D` (x,z,radius), `Polygon` (список точек `[x,z]`, импорт/копирование JSON). Валидация: размеры > 0, ≥3 точки.
  - Источники: `requiredTags`, `anyTags`, `excludeTags` (TagsInput), `includeLibraryUuids` (мультиселект), `weightsByLibraryUuid`, `weightsByTag` (редактируемые таблицы; подсказки тегов — из индекса `*tags`).
  - Скаттеринг: `densityPer100x100`, `distribution (random|poisson)`, `minDistance` (для poisson), `seed`, (опц.) `maxInstances`.
  - Края: `edge.fadeWidth`, `edge.fadeCurve (linear|smoothstep)`, `edge.edgeBias [-1..1]`.
  - Трансформации: `randomYawDeg [min,max]`, `randomUniformScale [min,max]`, `randomOffsetXZ [min,max]`.
  - Кнопки: «Сохранить», «Отмена», при редактировании — «Удалить».
  - Все вычисления предпросмотра/проверок — на shared типах/функциях.
- Контекстное меню на биоме:
  - «Редактировать…», «Переименовать…», «Дублировать», «Сгенерировать», «Регенерировать», «Скрыть/Показать», «Выбрать инстансы биома», «Очистить инстансы», «Удалить биом».
  - Все операции с биомами из UI (создание/обновление/удаление, генерация/регенерация, выборка инстансов) выполнять через `sceneAPI` (см. фазу 7), не изменяя store напрямую.
- 3D‑оверлей областей (R3F):
  - Выделение выбранного биома; отрисовка контура/заливки для rect (с rotationY), circle, polygon; отображение fade‑зоны.
  - Математика — строго через shared (`shared/types/geo2d`, `shared/types/vector3`, `shared/lib/math/*`).

Критерии приёмки:
- Раздел «Биомы» в SceneObjectManager реализован: список, модалка, контекстное меню, связь со store.
- 3D‑оверлей корректен для всех поддерживаемых областей и fade‑зоны.

## Технические ограничения и принципы
- Следовать [design-principles.md](../../../../docs/architecture/design-principles.md).
- ≤ 15 файлов на фазу, сборка/линт/тесты — зелёные.
- Чистые функции в ядре скаттеринга; UI и API — тонкие слои над ядром.
- Общие математические утилиты — только из shared; при нехватке добавить в `shared/lib/math`.

---
