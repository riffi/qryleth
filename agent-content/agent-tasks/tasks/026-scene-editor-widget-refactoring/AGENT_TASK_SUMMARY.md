---
id: 26
epic: null
title: "Рефакторинг SceneEditor: выделение виджета и реорганизация фич"
status: in-progress
created: 2025-09-01
updated: 2025-09-01
owner: team-ui
tags: [frontend, architecture, refactoring, FSD]
phases:
  total: 4
  completed: 3
---

# Рефакторинг SceneEditor: выделение виджета и реорганизация фич

## Обязательная информация
!Правила работы с агентскими задачами: [agent-tasks.md](../../../../docs/development/workflows/agent-tasks.md)
**ВАЖНО**: При выполнении каждой из фаз необходимо обязательно сверяться с требованиями и принципами из указанного файла.

## Цели
Реорганизовать архитектуру SceneEditor согласно принципам FSD, выделив монолитный компонент SceneEditorR3F в виджет и разбив его функциональность на отдельные фичи.

## Контекст

### Текущие проблемы архитектуры:
1. **SceneEditorR3F** (1000+ строк) находится в фиче `scene`, что нарушает принципы FSD
2. **Нарушение FSD**: фича `scene` импортирует другую фичу `object-editor`, что создает неправильные зависимости между фичами
3. **Монолитность**: один компонент отвечает за рендер, UI панели, состояние панелей, сохранение, Play режим
4. **Фича object-library неполная**: содержит только UI-компоненты (`LibraryObjectCard`, `VirtualizedObjectGrid`), но используется на двух страницах

### Анализ текущей структуры:
- `SceneEditorPage.tsx` - просто обертка, импортирует `SceneEditorR3F` из фичи `scene`
- `SceneEditorR3F.tsx` - монолитный компонент (1000+ строк) в `features/scene/ui/`
- Компонент содержит смешанные ответственности:
  - Управление панелями (chat, scripting, object manager)
  - Ресайз панелей
  - Сохранение/загрузка сцен
  - Play режим
  - Интеграция с object-editor
  - 3D рендер

## Архитектурные ограничения FSD (обязательны)

1) Композиция сверху вниз:
- Виджет `widgets/SceneEditor` является единственной точкой композиции. Он может импортировать фичи.
- Фичи не импортируют другие фичи и не импортируют `widgets/*`.

2) Граница ответственности `features/scene` (оставляем в сцене):
- Все состояния, влияющие на рендер и инструменты сцены, остаются в `features/scene`: `uiMode`, `renderProfile`, `viewMode`, `renderMode`, `transformMode`, `gridVisible`, `autoOrbitTargetOnSelect`, параметры/поза камеры, а также данные сцены и история.
- Эти состояния НЕ переносятся в другие фичи, чтобы не возникла необходимость обратных импортов в сцену.

3) Фича `scene-layout`:
- Отвечает только за состояние и поведение панелей (видимость левой/правой панели, переключение чат/скриптинг, ресайз и т.п.).
- Не читает и не мутирует стор сцены.
- Миграция из `shared/model/visualSettingsStore` должна быть согласованной: либо продолжаем использовать существующий persist‑store (предпочтительно на первом шаге), либо переносим ключи в `features/scene-layout/model/store.ts` с деприкацией старых ключей и обновлением всех импортов в рамках фазы. Дублирования не допускается.

4) Фича `scene-toolbar` — презентационная:
- Принимает значения (`renderMode`, `transformMode`, `gridVisible`, `autoOrbitTargetOnSelect`, подпись выбранного инстанса) и колбэки через пропсы.
- Не импортирует стор сцены напрямую.

5) Фича `scene-persistence` — чистые операции:
- Не импортирует стор сцены. Экспортирует чистые функции/хуки для сохранения/загрузки (работа с Dexie/HTTP).
- Виджет `SceneEditor` сам читает данные из `useSceneStore.getState()` и передает их в `scene-persistence`, а также сам вызывает `setSceneMetadata`/`markSceneAsModified`.

6) Фича `scene-play-mode` — управление UI Play режима:
- Не импортирует стор сцены напрямую. Виджет передает колбэк `onTogglePlay` и другие необходимые пропсы.
- Визуальные элементы (панель камер, подсказки, кнопка выхода) инкапсулированы в фиче, но переключение режима идет через пропсы/события.

7) Общие типы:
- Типы домена сцены (например, `SceneStatus`) выносим в `entities/scene` (предпочтительно, т.к. сцена — доменная сущность). Только если тип действительно UI‑общий и не доменный — тогда `shared/types`.

8) Chat‑интерфейсы:
- Остаются в своих фичах (`features/scene/ui/ChatInterface`, `features/object-editor/ui/ChatInterface`) и не приводят к `feature → feature` импортам.

9) ScriptingPanel:
- Это содержательное UI для работы со сценой (выполнение JS‑скриптов над текущей сценой) и тесно связано с `SceneAPI` и `useSceneStore`.
- Оставляем `ScriptingPanel` внутри `features/scene` (например, `features/scene/ui/ScriptingPanel`) — это не часть layout, а предметная панель сцены.
- `scene-layout` управляет только показом/скрытием/размерами панели, но не её бизнес‑логикой.
- Если в будущем потребуется вынести в отдельную фичу (`features/scene-scripting`), использовать инъекцию зависимостей: определить `ISceneScriptingApi` в `shared/types`, передавать реализацию через пропсы из виджета. Прямые импорты `features/scene` из новой фичи недопустимы.

## Список фаз

### ✅ Фаза 1: Виджет SceneEditor и выделение scene-layout — done ([отчёт](./phases/phase_1_summary.md))
- Создать `widgets/SceneEditor/` (координатор): принимает/пробрасывает пропсы/колбэки, читает сцену через `useSceneStore`, собирает фичи без прямых `feature → feature` импортов.
- Создать фичу `features/scene-layout/` для управления панелями (видимость, чат/скриптинг, ресайз).
- Перенести из `SceneEditorR3F` только логику панелей в `scene-layout`. Все состояния, влияющие на рендер/инструменты, оставить в `features/scene`.
- На первом шаге допускается оставить использование `useVisualSettingsStore` (persist) без миграции. Зафиксировать список ключей и места использования.
- Обновить `SceneEditorPage` для импорта виджета вместо фичи.

### ✅ Фаза 2: scene-toolbar (презентационная) и scene-persistence (чистая) — done ([отчёт](./phases/phase_2_summary.md))
- Создать `features/scene-toolbar/` для тулбаров (Main/Left/Right/SceneEditorToolBar). Тулбары не знают о сторах — только пропсы/колбэки.
- Создать `features/scene-persistence/` для сохранения/загрузки сцен. Экспортировать чистые функции/хуки; не импортировать стор сцены.
- Перенести модалки сохранения и операции работы с Dexie/HTTP в `scene-persistence`. Виджет управляет их вызовом и синхронизацией со сценой.
- Обновить виджет `SceneEditor` для подключения тулбаров и persistence через пропсы/обработчики.
  
  Примечание по `ScriptingPanel`:
  - Не переносить `ScriptingPanel` в `scene-layout`. Он остаётся в `features/scene/ui/ScriptingPanel` и подключается виджетом как содержимое левой панели.
  - В `scene-layout` хранится только состояние видимости/ресайза; логика скриптинга и зависимости от `SceneAPI` остаются в `features/scene`.

### ✅ Фаза 3: scene-play-mode и доработка object-library — done ([отчёт](./phases/phase_3_summary.md))
- Создать `features/scene-play-mode/` для Play‑режима (панель камер, подсказки, хоткеи). Не импортировать стор сцены — всё через пропсы/колбэки (`onTogglePlay`, текущая камера и т.п.).
- Расширить `features/object-library/` до полноценной фичи:
  - Добавить `model/libraryStore.ts` (если требуется локальное состояние библиотеки).
  - Добавить `lib/api.ts`, хуки поиска/фильтрации.
  - Создать `ui/LibraryBrowser.tsx` как основной компонент.
- Обновить использование object-library в `LibraryPage` и `SceneEditor` через публичное API фичи.

### ⏳ Фаза 4: Очистка фичи scene, типы, документация
- Очистить `features/scene/` от перенесенной функциональности (панели/модалки/тулбары/Play‑UI), сохранив только данные/рендер и состояния, влияющие на рендер и инструменты.
- Убрать импорт `object-editor` из `scene` (импорт выполняет только виджет).
- Вынести доменные типы (например, `SceneStatus`) в `entities/scene` и обновить импорты; UI‑общие типы — в `shared/types`.
- Обновить документацию в `docs/` (архитектура, компоненты, FSD) и схемы связей.
- Провести аудит импортов на предмет `feature → feature` и `features → widgets` (см. «Критерии приёмки»).

#### Перенос доменных типов: список и чек‑лист

Перенести доменные типы сцены из фичи в `entities/scene` и обновить импорты.

- Что переносим (доменные типы):
  - `SceneStatus` — статусы сцены: `'draft' | 'saved' | 'modified'`.
  - `SceneMetaData` — метаданные сцены: `{ uuid?: string; name: string; status: SceneStatus }`.

- Куда:
  - `apps/qryleth-front/src/entities/scene/types.ts` (добавить новые экспортируемые типы рядом с `SceneObject`, `SceneObjectInstance`, `SceneLayer`, `SceneData`).
  - При необходимости — реэкспорт через `apps/qryleth-front/src/entities/index.ts`.

- Где используются и что правим (импорты):
  - `apps/qryleth-front/src/features/scene/model/store-types.ts`
    - Импортировать `SceneMetaData` и `SceneStatus` из `@/entities/scene/types`.
    - Удалить локальные определения этих типов.
  - `apps/qryleth-front/src/features/scene/model/sceneStore.ts`
    - Импортировать `SceneMetaData` из `@/entities/scene/types`.
  - `apps/qryleth-front/src/features/scene/ui/SceneEditorR3F.tsx`
    - Импортировать `SceneStatus` из `@/entities/scene/types` (для функций `getStatusColor`/`getStatusText`).
  - `apps/qryleth-front/src/features/scene/ui/objectManager/SceneHeader.tsx`
    - Удалить локальное дублирование `type SceneStatus = ...` и импортировать `SceneStatus` и `SceneMetaData` из `@/entities/scene/types`.

- Что не переносим (UI‑уровень остаётся в `shared/types/ui`):
  - `UiMode`, `RenderProfile`, `ViewMode`, `RenderMode`, `TransformMode`, `CameraPose` — это UI/режимы, они не доменные.

- Верификация:
  - Полный поиск `SceneStatus` и `SceneMetaData` по коду; все импорты должны идти из `@/entities/scene/types`.
  - Удалено любое локальное дублирование этих типов в компонентах.

## Планируемая новая структура:

```
widgets/
└─ SceneEditor/           # Главный виджет-координатор
   ├─ SceneEditor.tsx     # Основной компонент ~200 строк
   └─ index.ts

features/
├─ object-editor/         # Остается как есть
├─ object-library/        # Расширенная фича библиотеки
   ├─ model/
   │  ├─ libraryStore.ts  # Состояние библиотеки
   │  └─ index.ts
   ├─ lib/
   │  ├─ api.ts           # API работы с библиотекой
   │  └─ hooks/
   │     ├─ useLibrarySearch.ts
   │     └─ useLibraryFilters.ts
   ├─ ui/
   │  ├─ LibraryBrowser.tsx     # Полный браузер библиотеки
   │  ├─ LibraryObjectCard.tsx  # Существующий
   │  ├─ VirtualizedObjectGrid.tsx # Существующий
   │  ├─ LibrarySearchBar.tsx   # Поиск/фильтры
   │  └─ index.ts
   └─ index.ts
├─ scene-layout/          # Управление панелями  
   ├─ model/store.ts      # Состояние панелей, ресайз
   ├─ ui/PanelManager.tsx # Логика показа/скрытия панелей
   ├─ hooks/useResize.ts  # Хуки ресайза
   └─ index.ts
├─ scene-toolbar/         # Тулбары
   ├─ ui/MainToolbar.tsx  # Верхний тулбар (SceneEditorToolBar)
   ├─ ui/LeftToolbar.tsx  # Боковые тулбары  
   ├─ ui/RightToolbar.tsx
   └─ index.ts
├─ scene-persistence/     # Сохранение сцен
   ├─ model/store.ts      # Состояние сохранения
   ├─ ui/SaveModal.tsx    # Модалки сохранения
   ├─ lib/persistence.ts  # API сохранения
   └─ index.ts
├─ scene-play-mode/       # Play режим
   ├─ model/store.ts      # Состояние Play
   ├─ ui/PlayControls.tsx # Панель камер
   ├─ hooks/usePlayMode.ts
   └─ index.ts
└─ scene/                 # Очищенная фича - только 3D сцена
   ├─ model/sceneStore.ts # Только данные сцены (без UI состояния)
   ├─ ui/Scene3D.tsx      # Рендер
   ├─ ui/SceneObjectManager.tsx
   └─ index.ts            # БЕЗ экспорта SceneEditorR3F
```

### Преимущества новой архитектуры:
1. **Соблюдение FSD**: виджет импортирует фичи, фичи не импортируют друг друга
2. **Модульность**: каждая фича отвечает за одну область ответственности
3. **Переиспользование**: фичи можно использовать независимо
4. **Масштабируемость**: легко добавлять новые возможности в отдельные фичи
5. **Тестируемость**: каждая фича может тестироваться изолированно

### Поток данных:
- Виджет `SceneEditor` координирует взаимодействие между фичами и читает/мутирует стор сцены там, где это уместно.
- Каждая фича имеет свой store только для своей области (например, `scene-layout`, `object-library`).
- Общение между фичами — исключительно через пропсы/события на уровне виджета.
- `object-editor` импортируется только виджетом, а не фичей `scene`.

## Критерии приёмки (FSD‑чек)

- Нет импортов из `widgets/*` внутри `features/*`.
- Нет импортов из других фич внутри любой `features/*` (исключение — типы/утилиты, вынесенные в `shared`/`entities`).
- Состояния `uiMode/renderProfile/viewMode/renderMode/transformMode/gridVisible/autoOrbitTargetOnSelect/камера` находятся в `features/scene` и не используются через прямые импорты в других фичах.
- `scene-persistence` не импортирует стор сцены; получение данных/сохранение метаданных выполняет виджет.
- `scene-play-mode` не импортирует стор сцены; управление через пропсы/колбэки.
- Общие типы вынесены в `shared`/`entities`; импорты обновлены.
- Документация обновлена: `docs/architecture/feature-sliced-design.md`, `docs/api/components/scene-editor.md`.

## Риски и миграции

- Миграция визуальных настроек: если переносим ключи из `useVisualSettingsStore` в `features/scene-layout`, необходимо:
  - исключить дублирование состояний;
  - обновить все места использования;
  - обеспечить совместимость с persist‑данными (очистка/миграция ключей localStorage);
  - добавить заметку в документацию о миграции.
- Проверить, что `Scene3D` и контролы (гизмосы) продолжают читать состояние из `features/scene` без кросс‑фича зависимостей.
