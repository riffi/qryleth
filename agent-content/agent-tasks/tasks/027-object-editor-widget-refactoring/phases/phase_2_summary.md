---
id: 27
phase: 2
title: "Фаза 2: Выделение editor/layout и objectLayoutStore"
status: done
created: 2025-09-01
updated: 2025-09-01
filesChanged: 4
---

# Отчёт по фазе 2

- Раскладка ObjectEditor вынесена в persist‑хранилище через VisualSettingsStore.
  - Добавлены поля и сеттеры для ObjectEditor: `objectLeftPanelWidthPx`, `objectRightPanelWidthPx`, `objectEditorLayoutInitialized` в `apps/qryleth-front/src/shared/model/visualSettingsStore.ts`.
- Создана фича `features/editor/object/layout`:
  - `apps/qryleth-front/src/features/editor/object/layout/model/panelLayoutStore.ts` — фасад над VisualSettingsStore (get/set/initialized).
  - `apps/qryleth-front/src/features/editor/object/layout/hooks/useObjectPanelLayout.ts` — хук ресайза/инициализации (левая/правая панели, ограничения, beginResize).
  - `apps/qryleth-front/src/features/editor/object/layout/model/panelVisibilityStore.ts` — глобальный zustand‑стор видимости панелей.
- Интеграция в ObjectEditorLayout:
  - Подключены хуки layout‑фичи; ширины панелей синхронизируются с persist‑хранилищем.
  - Left/Right панель по‑прежнему управляются через текущее состояние панелей (chat/properties/manager), логика панели не менялась.

## Примечания
- ESLint‑правило `import/no-restricted-paths` не добавлялось, так как в проекте нет `eslint-plugin-import`. Рекомендовано включить его позже, чтобы формализовать границы scene/object.
- Обёртка для `features/editor/scene/layout` планируется отдельно; текущая фаза сфокусирована на ObjectEditor.

