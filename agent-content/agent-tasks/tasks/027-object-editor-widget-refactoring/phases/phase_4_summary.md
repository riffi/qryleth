---
id: 27
phase: 4
title: "Фаза 4: Встраивание ObjectEditor в SceneEditor (embedded)"
status: done
created: 2025-09-01
updated: 2025-09-01
filesChanged: 1
---

# Отчёт по фазе 4

- `SceneEditor` теперь использует новый виджет ObjectEditor в embedded‑режиме вместо прямого `ObjectEditorR3F`:
  - Обновлён файл `apps/qryleth-front/src/widgets/SceneEditor/SceneEditor.tsx:1`.
  - Встраивание выполнено через `<ObjectEditor mode="embedded" ... />`.
  - Состояние панелей синхронизируется через `externalLayoutState={globalPanelState}` (глобальный стор панелей ObjectEditor), сохраняя текущее поведение `PanelToggleButtons`.

## Примечания
- Persist размеров панелей ObjectEditor реализован ранее через `object-layout`; embedded‑интеграция использует ту же модель состояния панелей (глобальный zustand‑стор), что и на странице редактора объекта.
- UI сохранения и тулбары SceneEditor не менялись; замена касалась только области встроенного редактора объекта.

