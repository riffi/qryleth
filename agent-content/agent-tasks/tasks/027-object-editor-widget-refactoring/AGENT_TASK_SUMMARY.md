---
id: 27
epic: null
title: "Рефакторинг ObjectEditor: виджет, тулбары и унификация раскладки"
status: planned
created: 2025-09-01
updated: 2025-09-01
owner: team-ui
tags: [frontend, architecture, refactoring, FSD]
phases:
  total: 5
  completed: 0
---

# Рефакторинг ObjectEditor: виджет, тулбары и унификация раскладки

## Обязательная информация
!Правила работы с агентскими задачами: [agent-tasks.md](../../../../docs/development/workflows/agent-tasks.md)
**ВАЖНО**: При выполнении каждой из фаз необходимо обязательно сверяться с требованиями и принципами из указанного файла.

## Цели
- Привести фичу `object-editor` к корректному FSD:
  - Выделить виджет `widgets/ObjectEditor` как единственную точку композиции (pages → widgets → features).
  - Вынести управление панелями/ресайзом в обобщённую фичу `features/editor-layout` с отдельными сторами для сцены и объекта (раздельный persist).
  - Создать независимые от сцены тулбары `features/object-toolbar` (Left/Right) с кнопками «чат/свойства» и «менеджер».
  - Удалить использование `PanelToggleButtons` и связанного глобального стейта в пользу тулбаров и layout‑store.
- Обеспечить двухрежимное использование `ObjectEditor`: как страница и как встроенный (embedded) редактор в SceneEditor (модально), без пересечения состояний панелей.

## Контекст

### Текущее состояние
- `features/object-editor/ui/ObjectEditorR3F.tsx` — монолитный компонент, включающий:
  - Отрисовку 3D (`ObjectScene3D`) и наплывающие контролы (grid/render/transform)
  - Левую панель: чат и/или свойства (через `ObjectEditorLayout` и `usePanelState`/`useGlobalPanelState`)
  - Правую панель: менеджер примитивов/материалов
- Страница `pages/ObjectEditorPage.tsx` управляет панелями через `PanelToggleButtons` и `useGlobalPanelState`.
- В `widgets/SceneEditor/SceneEditor.tsx` модально встраивается `ObjectEditorR3F` с внешним `globalPanelState`.

### Проблемы
1. Монолитность и смешение ответственности в `ObjectEditorR3F` и `ObjectEditorLayout`.
2. Дублирование/расхождение логики панелей относительно `scene` редактора.
3. Нарушение FSD‑границ при необходимости переиспользования панелей между разными контекстами.
4. `PanelToggleButtons` дублируют функциональность тулбаров и должны быть удалены.

## Архитектурные решения и ограничения (FSD)

1) Композиция сверху вниз:
- Виджет `widgets/ObjectEditor` — единственная точка сборки редактора объекта.
- Виджет импортирует фичи (`object-toolbar`, `editor-layout`, `object-*`). Фичи не импортируют виджеты и не импортируют другие фичи напрямую.

2) Обобщённый layout:
- Добавляется `features/editor-layout` (универсальная логика панелей/ресайза/persist).
- Для разделения состояний вводятся адаптеры/фасады: `sceneLayoutStore` (уже есть) и `objectLayoutStore` (новый), с разными persist‑ключами в `shared/model/visualSettingsStore`.
- На первом этапе допускается фасад поверх существующего persist‑стора, далее — постепенная миграция без дублирования ключей.

3) Тулбары:
- Создать независимую фичу `features/object-toolbar` (презентационную):
  - `LeftToolbar`: кнопки «чат» и «свойства».
  - `RightToolbar`: кнопка «менеджер».
- Тулбары принимают только пропсы (значения и колбэки), не читают стор напрямую.

4) Разделение ответственностей внутри object-editor:
- `object-renderer`: 3D сцена и оверлеи.
- `object-properties`: панели свойств (примитив/материал/группы).
- `object-manager`: менеджер примитивов/материалов/групп.
- `object-chat`: чат‑интерфейс.
- `object-editor/model`: zustand‑store объекта (renderMode/transformMode/gridVisible/selection и т.п.; доменные типы — в `entities/*`).

5) Persist ключи (обязательно раздельные):
- Добавить в `shared/model/visualSettingsStore` ключи для object‑editor:
  - `objectEditorLeftPanelWidthPx`, `objectEditorRightPanelWidthPx`
  - `objectEditorChatCollapsed`, `objectEditorPropertiesVisible`, `objectEditorObjectPanelCollapsed`
  - `objectEditorLayoutInitialized`

6) Деприкация и удаление:
- Полностью убрать `PanelToggleButtons` и `useGlobalPanelState` после перевода на тулбары и `objectLayoutStore` (если больше нигде не используются — удалить файлы).

## Планируемая новая структура

```
widgets/
└─ ObjectEditor/
   ├─ ObjectEditor.tsx
   └─ index.ts

features/
├─ editor-layout/              # Универсальная логика панелей/ресайза (новая)
│  ├─ model/store.ts           # Базовые утилиты/хуки
│  ├─ adapters/
│  │  ├─ sceneLayoutStore.ts   # Уже есть (как фасад) или перенести
│  │  └─ objectLayoutStore.ts  # Новый фасад под object‑editor + persist ключи
│  └─ index.ts
├─ object-toolbar/             # Независимые тулбары для ObjectEditor (новая)
│  ├─ ui/LeftToolbar.tsx
│  ├─ ui/RightToolbar.tsx
│  └─ index.ts
├─ object-renderer/            # 3D рендер и оверлеи (выделить из object-editor)
├─ object-properties/          # Свойства примитива/материала/группы
├─ object-manager/             # Менеджер примитивов/материалов/групп
├─ object-chat/                # Чат‑интерфейс
└─ object-editor/              # Публичное API фичи (минимум импорта)
```

## Список фаз (план)

### Фаза 1: Виджет ObjectEditor и независимые тулбары
- Создать `widgets/ObjectEditor` с пропсами: `{ mode: 'page'|'embedded'; objectData?; onChange?; onRequestSave?; externalLayoutState? }`.
- Создать `features/object-toolbar` (LeftToolbar: «чат/свойства», RightToolbar: «менеджер»).
- Интегрировать виджет на странице `ObjectEditorPage` (без изменения существующего layout‑состояния; на переходный период — адаптер к старому состоянию панелей).
- Критерий: страница работает через виджет и новые тулбары, без регрессий.

### Фаза 2: Обобщённый editor-layout и objectLayoutStore
- Добавить `features/editor-layout` и фасад `objectLayoutStore` с отдельными persist‑ключами в `shared/model/visualSettingsStore`.
- Перевести `ObjectEditorLayout` на `objectLayoutStore` (лево/право/ресайз/коллапс), удалить внутренние дубли логики ресайза.
- Критерий: состояние панелей объекта независимо от сцены; размеры сохраняются между сессиями.

### Фаза 3: Декомпозиция object-editor на подфичи
- Вынести в отдельные фичи: `object-renderer`, `object-properties`, `object-manager`, `object-chat`.
- Навести порядок импорта типов: доменные — из `entities/*`; UI‑режимы — из `shared/types/ui`.
- Критерий: фичи изолированы, импорты соответствуют FSD.

### Фаза 4: Интеграция в SceneEditor (embedded) и удаление PanelToggleButtons
- В `widgets/SceneEditor` заменить модальный `ObjectEditorR3F` на `widgets/ObjectEditor` (`mode='embedded'`).
- Убедиться, что состояния панелей редакторов не пересекаются.
- Полностью удалить `PanelToggleButtons` и `useGlobalPanelState` из кода, если не используются.
- Критерий: модальный объектный редактор работает через виджет; следов старых панельных кнопок нет.

### Фаза 5: Чистка, документация и верификация FSD
- Обновить README/доки по структуре и контрактам.
- Проверить, что виджеты не импортируются фичами; фичи не импортируют друг друга и виджеты.
- Произвести финальный аудит зависимостей и persist‑ключей.

## Критерии приёмки (DoD)
- Страницы и модальные сценарии используют только `widgets/ObjectEditor`.
- В коде отсутствует `PanelToggleButtons` и его стор/хуки.
- `features/object-toolbar` изолирован от стор(ов), принимает пропсы.
- `features/editor-layout` предоставляет `objectLayoutStore` с независимыми persist‑ключами; состояния с `sceneLayoutStore` не пересекаются.
- Монолит `ObjectEditorR3F` разбит: рендерер, свойства, менеджер, чат — отдельные подфичи.
- Документация обновлена, FSD‑границы соблюдены.

## Оценка рисков и митигирование
- Риск 1: Коллизии persist‑ключей — использовать префикс `objectEditor*`, мигрировать аккуратно.
- Риск 2: Незаметные импорты между фичами — статический анализ импорта и ручная проверка.
- Риск 3: Регрессии UI при ресайзе панелей — этапная интеграция и сравнение с текущим поведением.
- Риск 4: Встроенный режим (embedded) — предусмотреть `externalLayoutState?` для совместимости и плавной миграции.

## Что не входит в объём
- Доработки доменных типов и форматов данных объектов за рамками разбиения по FSD.
- Глубокая переработка рендера 3D сцены (только выделение и перемещение в подфичу).

## Верификация
- Ручные сценарии: переключение чат/свойства, коллапс/открытие менеджера, ресайз левой/правой панелей, возврат после перезагрузки.
- Проверка в контексте страницы и модального редактора (SceneEditor).
- Поиск по проекту: отсутствие `PanelToggleButtons` и глобальных хуков старых панелей.
