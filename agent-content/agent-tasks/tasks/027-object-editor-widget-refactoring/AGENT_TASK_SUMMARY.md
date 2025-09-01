---
id: 27
epic: null
title: "Рефакторинг ObjectEditor: виджет, тулбары и унификация раскладки"
status: done
created: 2025-09-01
updated: 2025-09-01
owner: team-ui
tags: [frontend, architecture, refactoring, FSD]
phases:
  total: 8
  completed: 6
---

# Рефакторинг ObjectEditor: виджет, тулбары и унификация раскладки

## Обязательная информация
!Правила работы с агентскими задачами: [agent-tasks.md](../../../../docs/development/workflows/agent-tasks.md)
**ВАЖНО**: При выполнении каждой из фаз необходимо обязательно сверяться с требованиями и принципами из указанного файла.

## Цели
- Привести фичу `object-editor` к корректному FSD:
  - Выделить виджет `widgets/ObjectEditor` как единственную точку композиции (pages → widgets → features).
  - Вынести управление панелями/ресайзом в обобщённую фичу `features/editor/layout` с отдельными сторами для сцены и объекта (раздельный persist).
  - Создать независимые от сцены тулбары `features/editor/object/toolbar` (Left/Right) с кнопками «чат/свойства» и «Outliner».
  - Удалить использование `PanelToggleButtons` и связанного глобального стейта в пользу тулбаров и layout‑store.
- Обеспечить двухрежимное использование `ObjectEditor`: как страница и как встроенный (embedded) редактор в SceneEditor (модально), без пересечения состояний панелей.
- Реструктурировать `features/*`: сгруппировать редакторские подсистемы под `features/editor/*` (ядро `editor/layout`, поддомены `editor/scene/*` и `editor/object/*`), настроить алиасы и запретить кросс‑импорты между scene↔object.

## Контекст

### Текущее состояние
- `features/object-editor/ui/ObjectEditorR3F.tsx` — монолитный компонент, включающий:
  - Отрисовку 3D (`ObjectScene3D`) и наплывающие контролы (grid/render/transform)
  - Левую панель: чат и/или свойства (через `ObjectEditorLayout` и `usePanelState`/`useGlobalPanelState`)
  - Правую панель: Outliner — состав объекта (примитивы/материалы/группы)
- Страница `pages/ObjectEditorPage.tsx` управляет панелями через `PanelToggleButtons` и `useGlobalPanelState`.
- В `widgets/SceneEditor/SceneEditor.tsx` модально встраивается `ObjectEditorR3F` с внешним `globalPanelState`.

### Проблемы
1. Монолитность и смешение ответственности в `ObjectEditorR3F` и `ObjectEditorLayout`.
2. Дублирование/расхождение логики панелей относительно `scene` редактора.
3. Нарушение FSD‑границ при необходимости переиспользования панелей между разными контекстами.
4. `PanelToggleButtons` дублируют функциональность тулбаров и должны быть удалены.

### Выявленные проблемы и риски (из анализа)
1) Naming collision в `ObjectEditorPage:220` — потенциальная путаница при замене на виджет. Действие: страница будет импортировать `ObjectEditor` (виджет) вместо `ObjectEditorR3F`; корректно разнести имена и импорты, исключить рекурсию.
2) Persist‑ключи — возможные коллизии с `scene` редактором. Действие: вводим уникальные префиксы `objectEditor*` в `shared/model/visualSettingsStore`; проверка и аудит по проекту.
3) Embedded‑режим в `SceneEditor:150` — сейчас использует `globalPanelState`. Действие: ввести переходный адаптер к `objectLayoutStore` и/или поддержать `externalLayoutState` в виджете для плавной миграции.
4) AI‑инструменты (`features/object-editor/lib/ai`) — нет плана миграции. Действие: перенести регистрацию инструментов в `features/editor/object/chat`, обеспечить инициализацию/разинициализацию на уровне виджета без нарушения FSD.
5) Зависимость от `scene-layout` — необходимо чётко определить reuse. Действие: выносим общую логику в `features/editor/layout`, а адаптеры для сцен/объекта делаем тонкими (`features/editor/scene/layout` и `objectLayoutStore`).
6) `ObjectEditorLayout` использует внутренний `usePanelState` — требуется миграция на внешний стор. Действие: заменить внутреннее состояние на `objectLayoutStore` с мостом для обратной совместимости на переходный период.

## Архитектурные решения и ограничения (FSD)

1) Композиция сверху вниз:
- Виджет `widgets/ObjectEditor` — единственная точка сборки редактора объекта.
- Виджет импортирует фичи (`editor/object/toolbar`, `editor/layout`, `editor/object/*`). Фичи не импортируют виджеты и не импортируют другие фичи напрямую.

2) Обобщённый layout:
- Добавляется `features/editor/layout` (универсальная логика панелей/ресайза/persist).
- Для разделения состояний вводятся адаптеры/фасады: `sceneLayoutStore` (уже есть) и `objectLayoutStore` (новый), с разными persist‑ключами в `shared/model/visualSettingsStore`.
- На первом этапе допускается фасад поверх существующего persist‑стора, далее — постепенная миграция без дублирования ключей.
 - `features/editor/scene/layout` — тонкий адаптер к `editor/layout` (обратная совместимость страниц/виджетов сцены).

3) Тулбары:
- Создать независимую фичу `features/editor/object/toolbar` (презентационную):
  - `LeftToolbar`: кнопки «чат» и «свойства».
  - `RightToolbar`: кнопка «Outliner» (правая панель состава объекта).
- Тулбары принимают только пропсы (значения и колбэки), не читают стор напрямую.

4) Разделение ответственностей внутри object-editor:
- `editor/object/renderer`: 3D сцена и оверлеи.
- `editor/object/properties`: панели свойств (примитив/материал/группы).
- `editor/object/outliner`: обзор состава объекта (иерархия примитивов/групп, материалы).
- `editor/object/chat`: чат‑интерфейс.
- `editor/object/model`: zustand‑store объекта (renderMode/transformMode/gridVisible/selection и т.п.; доменные типы — в `entities/*`).

5) Persist ключи (обязательно раздельные):
- Добавить в `shared/model/visualSettingsStore` ключи для object‑editor:
  - `objectEditorLeftPanelWidthPx`, `objectEditorRightPanelWidthPx`
  - `objectEditorChatCollapsed`, `objectEditorPropertiesVisible`, `objectEditorOutlinerCollapsed`
  - `objectEditorLayoutInitialized`
 - Провести аудит по проекту на предмет отсутствия коллизий с ключами сцены (`scene*`) и мигрировать существующие ключи если требуется.

6) Деприкация и удаление:
- Полностью убрать `PanelToggleButtons` и `useGlobalPanelState` после перевода на тулбары и `objectLayoutStore` (если больше нигде не используются — удалить файлы в Фазе 4).

## Планируемая новая структура

```
widgets/
└─ ObjectEditor/
   ├─ ObjectEditor.tsx
   └─ index.ts

features/
├─ editor/layout/                 # Универсальная логика панелей/ресайза (ядро)
│  ├─ model/store.ts              # Базовые утилиты/хуки
│  ├─ adapters/
│  │  ├─ sceneLayoutStore.ts      # Тонкий фасад под SceneEditor
│  │  └─ objectLayoutStore.ts     # Тонкий фасад под ObjectEditor
│  └─ index.ts
├─ editor/object/toolbar/         # Тулбары ObjectEditor (презентационные)
│  ├─ ui/LeftToolbar.tsx
│  ├─ ui/RightToolbar.tsx
│  └─ index.ts
├─ editor/object/renderer/        # 3D рендер и оверлеи (бывш. object-renderer)
├─ editor/object/properties/      # Свойства примитива/материала/группы
├─ editor/object/outliner/        # Outliner состава объекта (иерархия/секции)
├─ editor/object/chat/            # Чат/AI‑интеграция
└─ editor/scene/*                 # Специфика SceneEditor (toolbar, play-mode, persistence, layout‑адаптер)
```

## План реструктуризации features (группировка, алиасы, миграция)

Цель: сделать структуру `features/*` более предсказуемой и масштабируемой, сгруппировав всё, что относится к редакторам, под общей зонтичной папкой `editor/`, сохранив FSD‑границы и чистые зависимости.

1) Категории и назначение
- `features/editor/*`: всё, что относится к редакторам (общая логика и поддомены).
  - `features/editor/layout`: общая логика панелей/ресайза/persist (ядро), без привязки к сцене/объекту.
  - `features/editor/scene/*`: всё специфичное для SceneEditor (toolbar, play-mode, persistence, scene‑layout как адаптер к editor/layout).
  - `features/editor/object/*`: всё специфичное для ObjectEditor (toolbar, outliner, properties, renderer, chat/ai).
- `features/library/*`: переиспользуемые библиотеки контента (например, `object-library`).
- `features/common/*`: действительно переиспользуемые фичи, не зависящие от стора сцены/объекта (универсальные модалки, ассет‑браузеры и т.п.).

2) Правила FSD и зависимостей (не нарушать при переносе)
- Виджеты (`widgets/*`) импортируют фичи. Фичи не импортируют виджеты и не импортируют другие фичи напрямую, кроме разрешённых «общих» (`features/editor/layout`, `features/common/*`, `features/library/*`) через стабильные публичные API.
- Фичи `editor/scene/*` и `editor/object/*` не ссылаются друг на друга. Общие части идут через `editor/layout` или `shared/*`.
- Переиспользуемые фичи не читают сторы сцены/объекта напрямую — только пропсы и свои локальные store/хуки.

3) Алиасы и линтинг
- Добавить алиасы в `tsconfig` и/или Vite:
  - `@/features/editor/*`, `@/features/common/*`, `@/features/library/*`.
  - Сохранить существующие `@/features/*` на переходный период с реэкспортами.
- Добавить ESLint правило/плагин (или локальное правило) для запрета кросс‑импортов между `editor/scene/*` и `editor/object/*`.

Чек‑лист правок конфигурации (Фаза 2):
- `apps/qryleth-front/tsconfig.app.json` — убедиться, что пути добавлены:
  ```jsonc
  {
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@/*": ["src/*"],
        "@/features/editor/*": ["src/features/editor/*"],
        "@/features/common/*": ["src/features/common/*"],
        "@/features/library/*": ["src/features/library/*"]
      }
    }
  }
  ```
- `apps/qryleth-front/vite.config.ts` — alias уже настроен на `@ → ./src`. Дополнительных настроек не требуется, но проверить, что сборщик разрешает новые пути из `tsconfig` (Vite читает tsconfig paths через плагин TS — в нашем пресете ок).
- `apps/qryleth-front/eslint.config.js` — добавить проверку границ импортов:
  ```js
  import importPlugin from 'eslint-plugin-import'

  export default tseslint.config([
    // ...
    {
      files: ['**/*.{ts,tsx}'],
      plugins: { import: importPlugin },
      settings: {
        'import/resolver': {
          typescript: true,
        },
      },
      rules: {
        // Запрет сценовым фичам импортировать объектные и наоборот
        'import/no-restricted-paths': ['error', {
          zones: [
            { target: './src/features/editor/object', from: './src/features/editor/scene' },
            { target: './src/features/editor/scene', from: './src/features/editor/object' },
          ]
        }],
      }
    }
  ])
  ```

4) Переиспользуемые фичи (common)
- Критерии помещения в `features/common/*`:
  - Не зависят от `sceneStore`/`objectStore`.
  - Экспортируют компоненты/хуки с чистыми контрактами через пропсы/колбэки.
  - Общая полезность (могут использоваться и страницами, и виджетами, и разными редакторами).
- UI‑только элементы предпочтительно располагать в `shared/ui`; headless‑утилиты — `shared/lib`. Если есть собственный UI + локальная логика/стор — это фича `features/common/*`.

5) Пошаговая миграция (чтобы не ронять сборку)
- Шаг 1 (в рамках Фазы 2): создать новые директории `features/editor/layout`, `features/editor/scene/*`, `features/editor/object/*` и добавить индекс‑реэкспорты.
- Шаг 2: перенести логику `scene-layout` в `editor/layout` (ядро) и оставить `features/editor/scene/layout` как тонкий адаптер (реэкспорт/хелперы под сцены).
- Шаг 3: создать `features/editor/object/toolbar` и подключить из виджета ObjectEditor. Затем последовательно переносить из `features/object-editor/*` в `features/editor/object/*`: `renderer`, `properties`, `outliner`, `chat`, `model`.
- Шаг 4: обновить импорты в коде на новые алиасы. На переходный период оставить реэкспорты в старых путях, затем удалить их в завершающей фазе.
- Шаг 5: провести аудит зависимостей и удалить старые каталоги после переключения всех импортов.

6) Риски и смягчение
- Много правок импортов → делить на подфазы, использовать реэкспорты и алиасы для плавного переключения.
- Нарушение FSD при переносе → ручной аудит импортов, запрет кросс‑импортов правилами ESLint.
- Регрессия persist ключей → не менять схему ключей одновременно с перемещением логики; переносить ключи отдельно (см. Фазу 2).

7) Включение в фазы задачи
- Фаза 2: старт реструктуризации — ввод `features/editor/layout`, адаптер `editor/scene/layout`, настройка алиасов и реэкспортов.
- Фаза 3: перенос объектных подсистем (`object-*`) в `features/editor/object/*`.
- Фаза 5: удаление старых директорий, финальный аудит импортов и обновление документации.

## Список фаз (план)

### Фаза 1: Виджет ObjectEditor и независимые тулбары
- Работы:
  - Создать `widgets/ObjectEditor` с пропсами: `{ mode: 'page'|'embedded'; objectData?; onChange?; onRequestSave?; externalLayoutState? }`.
  - Реализовать UI‑контракты тулбаров и панелей через пропсы (без доступа к сторам внутри тулбаров).
  - Создать `features/editor/object/toolbar` (LeftToolbar: «чат/свойства», RightToolbar: «Outliner»).
  - Интегрировать виджет на странице `ObjectEditorPage` (пока использовать текущий state панелей через адаптер).
  - Исправить naming collision: заменить прямой рендер `ObjectEditorR3F` на `ObjectEditor` (виджет), откорректировать импорты.
  - Обновить заголовок/кнопки страницы на использование тулбаров (оставить `PanelToggleButtons` для переходного периода).
- Критерии приёмки:
  - Страница рендерит виджет и новые тулбары, функциональность панелей не деградирует.

### Фаза 2: Обобщённый editor/layout и objectLayoutStore
- Работы:
  - Добавить `features/editor/layout` (ядро) и фасад `objectLayoutStore` с раздельными persist‑ключами в `shared/model/visualSettingsStore` (`objectEditor*`).
  - Перевести `ObjectEditorLayout` на `objectLayoutStore` (ширины/коллапс/ресайз, init‑флаг), удалить дубль логики.
  - Ввести `features/editor/scene/layout` как тонкий адаптер над `editor/layout` (для SceneEditor).
  - Добавить tsconfig‑алиасы `@/features/editor/*`, `@/features/common/*`, `@/features/library/*`; оставить реэкспорты в старых путях.
  - Добавить ESLint‑правило `import/no-restricted-paths` для запрета кросс‑импортов scene↔object.
  - В `widgets/SceneEditor` внедрить переходный адаптер embedded‑режима (`externalLayoutState`/bridge к `objectLayoutStore`).
- Критерии приёмки:
  - Состояния панелей объекта независимы от сценовых, persist работает.
  - Импорты начинают использовать новые алиасы; сборка и линт зелёные.

### Фаза 3: Декомпозиция object-editor на подфичи
- Работы:
  - Перенести подсистемы из `features/object-editor/*` в `features/editor/object/*`: `renderer`, `properties`, `outliner`, `chat`, `model`.
  - Обновить `index.ts` публичных API для каждой подфичи; обеспечить стабильные импорты.
  - Навести порядок импорта типов: доменные — `entities/*`; UI‑режимы — `shared/types/ui`.
  - Мигрировать AI‑инструменты: перенести регистрацию/разрегистрацию из `features/object-editor/lib/ai` в `features/editor/object/chat`, инициализацию/очистку вызывать из виджета.
- Критерии приёмки:
  - Нет кросс‑импортов между фичами; контракты через пропсы/хуки.

### Фаза 4: Интеграция в SceneEditor (embedded) и удаление PanelToggleButtons
- Работы:
  - В `widgets/SceneEditor` заменить модальный `ObjectEditorR3F` на `widgets/ObjectEditor` (`mode='embedded'`).
  - Убедиться, что состояния панелей редакторов не пересекаются (разные persist‑ключи).
  - Полностью удалить `PanelToggleButtons` и `useGlobalPanelState` из кода, почистить импорты.
  - Убрать переходные адаптеры embedded‑режима.
- Критерии приёмки:
  - Модальный объектный редактор работает через виджет; следов старых кнопок нет.

### Фаза 5: Чистка, документация и верификация FSD
- Работы:
  - Обновить README/доки по структуре и контрактам (новые пути/публичные API).
  - Удалить реэкспорты и старые директории после переключения всех импортов.
  - Финально проверить FSD‑границы: виджеты → фичи; отсутствие фич→виджет и фич→фич (кроме editor/layout/common/library).
  - Провести аудит persist‑ключей (`objectEditor*` vs `scene*`), UX панелей (чат/свойства/Outliner), ресайз, восстановление ширин.
  - Удалить старые каталоги `features/object-editor/*`, `features/scene-layout/*`, `features/scene-toolbar/*` после полного переноса.
- Критерии приёмки:
  - Репозиторий в консистентном состоянии; сборка/линт зелёные; доки актуальны.

## Критерии приёмки (DoD)
- Страницы и модальные сценарии используют только `widgets/ObjectEditor`.
- В коде отсутствует `PanelToggleButtons` и его стор/хуки.
- `features/editor/object/toolbar` изолирован от стор(ов), принимает пропсы.
 - `features/editor/layout` предоставляет `objectLayoutStore` с независимыми persist‑ключами; состояния с `sceneLayoutStore` не пересекаются.
- Монолит `ObjectEditorR3F` разбит: рендерер, свойства, Outliner, чат — отдельные подфичи.
- Документация обновлена, FSD‑границы соблюдены.
 - AI‑инструменты перенесены в рамках новой архитектуры; инициализация происходит на уровне виджета, без нарушения FSD.

## Оценка рисков и митигирование
- Риск 1: Коллизии persist‑ключей — использовать префикс `objectEditor*`, аудит ключей, миграция без дублирования.
- Риск 2: Незаметные импорты между фичами — статический анализ импорта и ручная проверка.
- Риск 3: Регрессии UI при ресайзе панелей — этапная интеграция и сравнение с текущим поведением.
- Риск 4: Встроенный режим (embedded) — `externalLayoutState?` и/или bridge к `objectLayoutStore`.
- Риск 5: AI‑инструменты — выделение зоны ответственности и точек инициализации на уровне виджета, покрыть сценарии регистрации/очистки.

## Что не входит в объём
- Доработки доменных типов и форматов данных объектов за рамками разбиения по FSD.
- Глубокая переработка рендера 3D сцены (только выделение и перемещение в подфичу).

## Верификация
- Ручные сценарии: переключение чат/свойства, коллапс/открытие Outliner, ресайз левой/правой панелей, возврат после перезагрузки.
- Проверка в контексте страницы и модального редактора (SceneEditor).
- Поиск по проекту: отсутствие `PanelToggleButtons` и глобальных хуков старых панелей.


**Отчёт**: [phases/phase_1_summary.md](phases/phase_1_summary.md)

**Отчёт (фаза 2):** [phases/phase_2_summary.md](phases/phase_2_summary.md)

**Отчёт (фаза 3):** [phases/phase_3_summary.md](phases/phase_3_summary.md)

**Отчёт (фаза 4):** [phases/phase_4_summary.md](phases/phase_4_summary.md)

**Отчёт (фаза 5):** [phases/phase_5_summary.md](phases/phase_5_summary.md)

**Отчёт (фаза 6):** [phases/phase_6_summary.md](phases/phase_6_summary.md)

### Фаза 6: Перенос исходников в новый неймспейс (object-editor → editor/object)
- Задачи:
  - Перенести исходники `features/object-editor/*` в `features/editor/object/*`:
    - `ui/` (включая `renderer/` и панели свойств, ChatInterface),
    - `model/`,
    - `lib/ai`, `lib` (saveUtils, offscreen-renderer, objectEditorApi),
    - `lib/hooks`.
  - Обновить внутренние импорты у перенесённых файлов на новые относительные/alias пути.
  - Обновить barrel-экспорты (`index.ts`) в новом неймспейсе; при необходимости оставить совместимые реэкспорты для стабильности API.
  - Массово заменить оставшиеся импорты в репозитории на `@/features/editor/object/*`.
  - Удалить временные реэкспорты, если они дублируют перенесённые исходники.
  - Проверить сборку/типы, зафиксировать изменения в отчёте.
- DoD:
  - Нет прямых импортов из `@/features/object-editor/*` (кроме, возможно, временных совместимых экспортов).
  - Билд успешен, отсутствуют регрессии типов.

### Фаза 7: ESLint правила импортов и финальная чистка
- Задачи:
  - Подключить `eslint-plugin-import` в `apps/qryleth-front` и включить `import/no-restricted-paths`:
    - Запретить использование `@/features/object-editor/*` вне самого пакета (требовать `@/features/editor/object/*`).
    - Зафиксировать границы доменов `scene/*` ↔ `editor/object/*` по FSD.
  - (Опционально) Настроить `import/order` и pathGroups для единообразия импортов.
  - Обновить документацию (getting-started, scene-management) — пути и примеры кода под новый неймспейс.
- DoD:
  - Lint проходит без ошибок, правила применяются.
  - Документация соответствует актуальной структуре.

### Фаза 8 (опционально): Оптимизация чанков и размера бандла
- Задачи:
  - Проанализировать предупреждения Vite/Rollup по размерам чанков.
  - Добавить `dynamic import()`/`manualChunks` там, где уместно (offscreen‑renderer, AI‑инструменты и т.п.).
  - Проверить влияние на UX (ленивая подгрузка), измерить метрики.
- DoD:
  - Сокращено количество предупреждений по размеру чанков; критичные подсистемы загружаются лениво.
