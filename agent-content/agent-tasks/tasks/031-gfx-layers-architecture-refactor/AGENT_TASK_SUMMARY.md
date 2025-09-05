---
id: 31
epic: null
title: "Рефакторинг архитектуры слоёв GFX: тонкие слои и раздельное содержимое"
status: in-progress
created: 2025-09-05
updated: 2025-09-05
tags: [frontend, data-model, breaking-change]
phases:
  total: 7
  completed: 2
---

# Рефакторинг архитектуры слоёв GFX: тонкие слои и раздельное содержимое

## Обязательная информация
Правила работы с агентскими задачами: [agent-tasks.md](../../../../docs/development/workflows/agent-tasks.md)
ВАЖНО: При выполнении каждой из фаз необходимо сверяться с архитектурными принципами [design-principles.md](../../../../docs/architecture/design-principles.md). Каждая фаза должна оставлять репозиторий в рабочем состоянии.

## Цели
- Отделить сущность «слой» от его содержимого: сделать слой «тонкой» сущностью (только `id`, `name`, `type`).
- Хранить содержимое слоёв в отдельных структурах, связанных через `layerId` (вариант A из обсуждения).
- Установить канонические типы слоёв: `object`, `landscape`, `water` (без `environment`).
- Зафиксировать единственность: один `Landscape`‑слой на сцену; окружение вне слоёв.
- Вынести параметры неба/тумана/экспозиции в `environmentContent` (перенос из текущего `lighting`).
- Облака: перенести из «слоя облаков» в `environmentContent` как наборы `GfxCloudSet`.
- Вода: обобщить сущность до `GfxWaterBody` с `kind: 'sea' | 'lake' | 'river'`.
- Объекты: оставить глобально (`objects`, `objectInstances`) с привязкой к слою через `layerId`.
- Сразу ввести breaking changes: обратная совместимость не требуется (сцены старого формата не поддерживаются без миграции).

## Контекст
Текущий тип `GfxLayer` смешивает группировку, вид и параметризацию (например, `shape`, `terrain`, `water`, `clouds`, цвет/градиенты). Это затрудняет развитие и повторное использование. Нужно перейти к тонким слоям‑контейнерам и вынести конкретное содержимое (ландшафты, водоёмы, наборы облаков, параметры окружения) в отдельные доменные модели, привязанные по `layerId`. Также «облака» — часть окружения, а не отдельный тип слоя. Водный слой в текущем виде — по сути «море», а надо обобщить до разных типов водоёмов через `GfxWaterBody`.

## Миграции (breaking changes)
Обратная совместимость не требуется; внедряем новую схему сразу. Ниже — точные маппинги старых типов в новые.

- Типы и перечисления:
  - Удалить `GfxLayerType.Environment`. Тип `Clouds` считается устаревшим и будет удалён на этапе обновления рендера.
  - Сократить `GfxLayer` до базы: `id: string`, `name: string`, `type: 'object' | 'landscape' | 'water' | 'environment'`.
  - Удалить из `GfxLayer`: `shape`, `width`, `depth`/`height`, `terrain`, `water`, `clouds`, `color`, `multiColor` и любые параметры содержимого.

- Новые доменные сущности содержимого:
  - `GfxLandscape`: описывает одну ландшафтную площадку (террейн/плоскость), включает размеры, центр, материалы, `terrain: GfxTerrainConfig` и т.д.
  - `GfxWaterBody`: `{ id, kind: 'sea' | 'lake' | 'river', surface: <геометрия XZ>, altitudeY, water: GfxWaterConfig }`.
  - `GfxCloudSet`: `{ id, items: GfxCloudItem[], meta?: { seed?: number, appearance?: GfxCloudAppearanceMeta } }`.

- Новые контейнеры содержимого в `SceneData` (раздельно от слоёв):
  - `landscapeContent?: { layerId: string; items: GfxLandscape[] } | null` — единственный контейнер для единственного `Landscape`‑слоя.
  - `waterContent?: Array<{ layerId: string; items: GfxWaterBody[] }>` — допускает несколько слоёв воды.
  - `environmentContent: { cloudSets: GfxCloudSet[]; sky?: <параметры неба>; fog?: <параметры тумана>; exposure?: number; wind?: { direction: [number, number]; speed: number } }` — обязательный контейнер окружения без привязки к слою.

- Перенос из старых полей:
  - Слой с `type: Landscape`:
    - Старые поля `shape`, `width`, `depth`/`height`, `terrain`, `color`, `multiColor` переносим в один элемент `GfxLandscape` внутри `landscapeContent.items[0]` с соответствующим `layerId`.
  - Слой с `type: Water`:
    - Старое поле `water` переносим в `GfxWaterBody` с `kind: 'sea'` по умолчанию и помещаем в `waterContent` по `layerId`.
  - Слой с `type: Clouds` (устаревший):
    - Поле `clouds.items` переносим в `environmentContent.cloudSets = [{ id, items }]` и создаём/используем единственный `Environment`‑слой. Тип `Clouds` удаляем.

- Перенос освещения/окружения:
  - Параметры неба/тумана/экспозиции переносим из `lighting` в `environmentContent` (каждый проектный параметр — 1:1 перенос; точные поля будут специфицированы при реализации).
  - Глобальный `environment.wind` переносим в `environmentContent.wind`.
  - При создании новой сцены `environmentContent` заполняется значениями по умолчанию (ветер, пустые cloudSets; по мере миграции — sky/fog/exposure).

- Жёсткие инварианты сцены:
  - Ровно один слой `type: 'landscape'` в `layers` и одна запись `landscapeContent`.
  - `environmentContent` всегда присутствует и не привязан к слоям.
  - Объекты остаются глобальными (`objects`, `objectInstances`) и продолжают ссылаться на слой через `layerId`.

## Список фаз

### ✅ Фаза 1: Типы и модель данных (entities)
- Ввести `GfxLayerBase` (тонкая база: `id`, `name`, `type`).
- Обновить `GfxLayerType`: удалить `Clouds`, добавить `Environment`.
- Удалить из старого `GfxLayer` все поля содержимого; перевести `SceneLayer` на расширение базы только мета‑полями сцены (`visible`, `position`).
- Добавить `GfxLandscape`, `GfxWaterBody`, `GfxCloudSet`.
- Добавить новые контейнеры в `SceneData`: `landscapeContent`, `waterContent[]`, `environmentContent`.
- Зафиксировать единственность `Landscape` и `Environment` через валидаторы/типы.

### ✅ Фаза 2: Хранилище сцены и SceneAPI (CRUD)
- Перестроить `sceneStore` под новые контейнеры, удалить глобальный `environment` из store (перенос ветра в `environmentContent`).
- Обновить `SceneAPI`: CRUD для `landscapeContent`, `waterContent`, `environmentContent`.
- Перенести `generateProceduralClouds` на работу с `environmentContent.cloudSets` (вместо слоя `Clouds`).
- Все методы снабдить подробными комментариями на русском языке.

### ⏳ Фаза 3: Рендеринг (Clouds/Water/Landscape)
- Обновить рендер облаков: читать `environmentContent.cloudSets` и единственный `Environment`‑слой.
- Обновить рендер воды: чтение из `waterContent` по `layerId`.
- Обновить рендер ландшафта: чтение из `landscapeContent.items`.
- Сохранить поведение анимации/ветра через `environmentContent.wind`.

### ⏳ Фаза 4: UI и ScriptingPanel
- Модалки/редакторы слоёв: оставить только базовые поля слоя (имя/тип), редакторы параметров перенести в редакторы содержимого.
- Добавить UI для редактирования: `Landscape` (несколько террейнов), `Water` (массив водоёмов), `Environment` (небо/туман/экспозиция, наборы облаков, ветер).
- Доработать шаблоны и автокомплит в `scriptingPanel`: новые типы, API, примеры скриптов по CRUD содержимого и генерации облаков.

### ⏳ Фаза 5: Миграция данных (односторонняя)
- CLI/скрипт для конвертации старых сцен в новый формат по описанным правилам (без обратной совместимости).
- Обновить демо‑сцены, сиды и фикстуры под новый формат.

### ⏳ Фаза 6: Документация
- Обновить документацию архитектуры слоёв и схемы `SceneData`.
- Описать правила инвариантов (единственность слоёв), взаимодействие с содержимым по `layerId`.
- Обновить разделы про окружение/освещение, перенести примеры.
- Подготовить гайд по миграции (кратко, как пользоваться конвертером).

### ⏳ Фаза 7: Тестирование и проверка
- Обновить/написать тесты для `SceneAPI`, генерации облаков, рендера содержимого.
- Пройти чек‑лист сборки и регрессии UI.
- Верифицировать сценарии: создание слоёв, редактирование содержимого, генерация облаков, сохранение/загрузка.
