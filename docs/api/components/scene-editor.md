# Компоненты редактора сцены

Документ описывает ключевые компоненты интерфейса редактора сцен.

- `SceneHeader` — панель с названием и действиями над сценой
- `SceneObjectManager` — список объектов и слоёв сцены
  - расположен в каталоге `src/features/scene/ui/objectManager/SceneObjectManager.tsx`
  - использует `SceneObjectManagerContext` для передачи общих данных
- `SceneEditorR3F` — Canvas на базе Three.js для визуализации

Компоненты расположены в каталоге `src/features/scene/ui/` и экспортируются через `index.ts`.
