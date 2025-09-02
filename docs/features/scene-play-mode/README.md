# Режим воспроизведения (features/scene-play-mode)

Фича предоставляет презентационный overlay для Play‑режима и хук горячих клавиш, не завязанные на внутренности стора редактора сцены.

## Публичные сущности

Импорт: `import { PlayControls, usePlayHotkeys } from '@/features/scene-play-mode'`

### Компонент PlayControls

Путь: `apps/qryleth-front/src/features/scene-play-mode/ui/PlayControls.tsx`

Назначение: панель управления камерой в Play‑режиме и выход из Play.

Пропсы:
- `viewMode: 'orbit' | 'walk' | 'fly'` — текущий режим камеры.
- `onChangeViewMode: (mode) => void` — смена режима камеры.
- `onExitPlay: () => void` — выход из Play.
- `flySpeed?: number` — необязательная скорость полёта для отображения в UI.

Особенности:
- Чистый презентационный компонент; всю бизнес‑логику получает через пропсы.
- Рекомендовано передавать поверх Canvas внутри `SceneEditorR3F`.

### Хук usePlayHotkeys

Путь: `apps/qryleth-front/src/features/scene-play-mode/hooks/usePlayHotkeys.ts`

Назначение: обработка хоткеев Play‑режима без привязки к конкретному zustand‑стору.

Параметры:
- `uiMode: UiMode` — режим UI (ожидается `'play'` для активации обработчика).
- `onExitPlay: () => void` — колбэк выхода из Play.
- `onSetViewMode: (mode: 'orbit' | 'walk' | 'fly' | 'flyover') => void` — установка режима камеры.

Хоткеи:
- `1` — Orbit, `2` — Walk, `3` — Fly, `4` — Flyover
- `Esc` — выход из Play

Особенности:
- Игнорирует ввод в `<input>`, `<textarea>` и CodeMirror.
- Не обрабатывает клавиши во время ресайза панелей (по курсору `col-resize`).
- Глобальный toggle Play по `P` реализуется в `features/editor/scene/lib/hooks/useKeyboardShortcuts.ts`.

## Подключение в виджете SceneEditor

Путь: `apps/qryleth-front/src/widgets/SceneEditor/SceneEditor.tsx`

- Передаётся как `PlayOverlayComponent` в `SceneEditorR3F`.
- Хук `usePlayHotkeys` вызывается на уровне виджета, чтобы работать с единым источником состояния `uiMode` и действиями стора сцены.

