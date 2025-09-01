---
id: 26
epic: null
title: "Рефакторинг SceneEditor: выделение виджета и реорганизация фич"
status: planned
created: 2025-09-01
updated: 2025-09-01
owner: team-ui
tags: [frontend, architecture, refactoring, FSD]
phases:
  total: 4
  completed: 0
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

## Список фаз

### ⏳ Фаза 1: Создание виджета SceneEditor и выделение фичи scene-layout
- Создать `widgets/SceneEditor/` с основным компонентом виджета
- Создать фичу `features/scene-layout/` для управления панелями
- Перенести логику ресайза панелей и их состояния из SceneEditorR3F в scene-layout
- Обновить импорты в SceneEditorPage

### ⏳ Фаза 2: Выделение фич scene-toolbar и scene-persistence
- Создать фичу `features/scene-toolbar/` для тулбаров (LeftToolbar, RightToolbar, SceneEditorToolBar)
- Создать фичу `features/scene-persistence/` для сохранения/загрузки сцен
- Перенести SaveSceneModal и связанную логику в scene-persistence
- Обновить виджет SceneEditor для использования новых фич

### ⏳ Фаза 3: Выделение фичи scene-play-mode и доработка object-library
- Создать фичу `features/scene-play-mode/` для Play режима и управления камерой
- Расширить фичу `features/object-library/` до полноценной библиотеки:
  - Добавить model/libraryStore.ts
  - Добавить lib/api.ts и хуки поиска/фильтрации
  - Создать LibraryBrowser.tsx как основной компонент
- Обновить использование object-library в LibraryPage и SceneEditor

### ⏳ Фаза 4: Очистка фичи scene и обновление документации
- Очистить фичу `features/scene/` от перенесенной функциональности
- Убрать импорт object-editor из scene (теперь это делает виджет)
- Обновить основную проектную документацию docs
- Проверить соответствие принципам FSD во всех новых фичах

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
- Виджет `SceneEditor` координирует взаимодействие между фичами
- Каждая фича имеет свой store для своей области ответственности
- Общение между фичами происходит через props виджета или события
- `object-editor` импортируется только виджетом, а не фичей `scene`