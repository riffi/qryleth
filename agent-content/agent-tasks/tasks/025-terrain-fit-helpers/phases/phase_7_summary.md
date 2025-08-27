---
id: 25
phase: 7
title: "Фаза 7: Обновление шаблонов ScriptingPanel под fit‑хелперы"
status: done
created: 2025-08-27
updated: 2025-08-27
filesChanged: 1
notes:
  - templates: scripting-panel
  - added: fit-helpers-group
---

# Фаза 7: Обновление шаблонов ScriptingPanel под fit‑хелперы

## Изменения
- Файл: `apps/qryleth-front/src/features/scene/ui/ScriptingPanel/constants/scriptTemplates.ts`
  - Переписан пример «Долина с горами» на fit‑подход: генерация только рецептов через `sceneApi.terrainHelpers.*`, сборка `spec.pool` и вызов `createProceduralLayer(...)`.
  - Добавлена новая группа «Fit‑хелперы» с двумя шаблонами:
    - «Долина (fit)» — долина через весь мир.
    - «Северная гряда (fit)» — гряда по северной кромке.
  - В примерах показана работа с бюджетом: `suggestGlobalBudget`, `autoBudget`.

## Результат
- [x] В меню шаблонов появился раздел «Fit‑хелперы».
- [x] Пример «Долина с горами» использует fit‑подход, код проще и предсказуемей.
- [x] Пользователи видят, как работать с бюджетом прямо в шаблонах.

