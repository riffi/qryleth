### Фаза 7: Обновление документации — отчёт

В рамках фазы 7 обновлена документация по новой системе процедурной генерации:

- Обновлён справочник SceneAPI (`docs/api/scene-api.md`):
  - Добавлены разделы для методов `generateProceduralTerrain`, `generateTerrainOpsFromPool`, `createProceduralLayer`.
  - Приведены примеры использования на JavaScript и примечания по валидации.

- Дополнены типы террейна (`docs/api/types/terrain.md`):
  - Новый раздел «Процедурная генерация (spec/pool/recipes)» с типами `GfxProceduralTerrainSpec`, `GfxTerrainOpPool`, `GfxTerrainOpRecipe`, `GfxPlacementSpec`, `GfxBiasSpec`.
  - Best practices и примеры спецификаций.

- Обновлена функциональная документация террейн‑системы (`docs/features/scene-management/terrain-system.md`):
  - Добавлен раздел «Процедурная генерация ландшафта» с обзором, поддерживаемыми значениями и примером через SceneAPI.

Примечание: Все примеры в документации приведены на JavaScript, в соответствии с унификацией Scripting Panel под один язык.

