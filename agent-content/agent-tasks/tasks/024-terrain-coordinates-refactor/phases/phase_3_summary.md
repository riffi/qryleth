# Фаза 3 — Исправление примеров в Scripting Panel (выполнено)

Дата: 2025-08-27

Цели фазы:
- Найти и исправить все примеры процедурной генерации для новой координатной системы (центр мира, ось Z = depth).
- Заменить height → depth в `world` и `area.rect` примерах.
- Исправить ошибочные координаты (выход за границы мира) и некорректные поля `placement`.
- Добавить поясняющие комментарии к примерам.

Сделано:
- Scripting Panel — шаблоны:
  - Файл: `apps/qryleth-front/src/features/scene/ui/ScriptingPanel/constants/scriptTemplates.ts`.
  - Обновлены все `world: { width, depth }` и `area: { kind: 'rect', ..., depth }`.
  - Исправлены зоны на центрированные координаты: X ∈ [-W/2..+W/2], Z ∈ [-D/2..+D/2].
  - Неверные примеры `placement: { type: 'uniform', center: [...] }` заменены на корректные `ring` с `center`.
  - Добавлены поясняющие комментарии про центр мира и допустимые диапазоны координат.
- Подсказки/комплишены:
  - `apps/qryleth-front/src/features/scene/ui/ScriptingPanel/constants/completionData.ts` — примеры теперь используют `depth`; опции для `generateTerrainOpsFromPool` — `worldDepth`.
  - `apps/qryleth-front/src/features/scene/ui/ScriptingPanel/hooks/useAIScriptGenerator.ts` — обновлены строки в системном промпте и сниппетах.
- Документация Scripting Panel:
  - `docs/features/scene-management/terrain-in-scripting-panel.md` — заменено на `depth`, приведены зоны и центры к допустимым значениям; добавлены пояснения.
  - `docs/api/scene-api.md`, `docs/api/types/terrain.md` — точечные правки примеров спецификации (только `world.depth`).

Совместимость:
- Примеры ориентированы на новое поле `depth`; в рантайме поддержан fallback на устаревшее `height`, описанный в фазах 1–2.

Замечания:
- Общая миграция структуры `GfxTerrainConfig` (worldWidth/worldHeight) обсуждается отдельно; текущая фаза правит только примеры спецификации и Scripting Panel.

