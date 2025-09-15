# Сохранение сцен (features/scene-persistence)

Фича отвечает за операции сохранения сцен и предоставляет презентационный модал `SaveModal`.

## Публичный API

Импорт: `import { saveNewScene, updateExistingScene, SaveModal } from '@/features/scene-persistence'`

### saveNewScene(name, data, description?)

Назначение: сохранить НОВУЮ сцену в библиотеку и вернуть её UUID.

Подробности:
- Аргументы:
  - `name: string` — название сцены.
  - `data: SceneData` — сериализованные данные сцены.
  - `description?: string` — опциональное описание.
- Возвращает: `Promise<string>` — UUID созданной записи сцены в БД.
- Реализация: `apps/qryleth-front/src/features/scene-persistence/lib/persistence.ts`.

### updateExistingScene(uuid, name, data, description?)

Назначение: обновить СУЩЕСТВУЮЩУЮ сцену по UUID и вернуть тот же UUID.

Подробности:
- Аргументы:
  - `uuid: string` — идентификатор сцены в библиотеке.
  - `name: string` — новое (или текущее) имя сцены.
  - `data: SceneData` — сериализованные данные сцены.
  - `description?: string` — опциональное описание.
- Возвращает: `Promise<string>` — UUID (тот же, что и на входе).
- Реализация: `apps/qryleth-front/src/features/scene-persistence/lib/persistence.ts`.

## UI: SaveModal

Путь: `apps/qryleth-front/src/features/scene-persistence/ui/SaveModal.tsx`

Назначение: презентационное модальное окно сбора имени/описания и вызова `onSave`.

Пропсы:
- `opened: boolean` — открыт ли модал.
- `onClose: () => void` — закрыть модал.
- `onSave: (name: string, description?: string) => Promise<boolean> | boolean` — обработчик сохранения; возвращает `true`, если сохранение прошло успешно.
- `currentSceneName?: string` — предзаполненное имя.

Особенности:
- Не содержит бизнес‑логики сохранения, только UI и валидацию.
- Сообщает об ошибках через `@mantine/notifications`.

## Использование в виджете SceneEditor

Путь: `apps/qryleth-front/src/widgets/SceneEditor/SceneEditor.tsx`

- Встроено через локальное состояние `saveOpened/pendingSave`.
- Для новой сцены открывает `SaveModal`; для существующей сцены вызывает `updateExistingScene` напрямую.

## Процедурные объекты (деревья)

- Сцены сериализуются с учётом процедурных объектов: для `GfxObject` с `objectType: 'tree'` сохраняются только `treeData` и материалы, массив `primitives` опускается.
- При загрузке сцены примитивы таких объектов восстанавливаются детерминированно на лету по `treeData`, что сохраняет компактность данных и повторяемость результата.
