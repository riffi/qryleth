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
  - Добавлены поля и сеттеры для ObjectEditor: `objectLeftPanelWidthPx`, `objectRightPanelWidthPx`, `objectEditorLayoutInitialized` в `apps/qryleth-front/src/shared/model/visualSettingsStore.ts:24` и методы управления на `:147`.
- Создано мини‑хранилище object‑layout:
  - `apps/qryleth-front/src/features/object-layout/model/store.ts:1` — обёртка над VisualSettingsStore (get/set и initialized).
  - `apps/qryleth-front/src/features/object-layout/hooks/useObjectPanelLayout.ts:1` — хук ресайза/инициализации (левая/правая панели, ограничения, beginResize).
- Интеграция в ObjectEditorLayout:
  - Подключён `useObjectPanelLayout` и синхронизированы ширины при ресайзе с persist‑хранилищем: `apps/qryleth-front/src/features/object-editor/ui/ObjectEditorLayout/ObjectEditorLayout.tsx:18`, `:74`.
  - Left/Right панель по‑прежнему управляются через текущее состояние панелей (chat/properties/manager), логика панели не менялась.

## Примечания
- ESLint‑правило `import/no-restricted-paths` не добавлялось, так как в проекте нет `eslint-plugin-import`. Рекомендовано включить его позже, чтобы формализовать границы scene/object.
- Обёртка для `features/editor/scene/layout` уже реализована ранее в `features/scene-layout/*`; текущая фаза сфокусирована на ObjectEditor.

