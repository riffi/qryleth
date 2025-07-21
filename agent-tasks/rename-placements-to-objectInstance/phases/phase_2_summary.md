# Фаза 2: Основной стор

В этой фазе переименование `placement` в `objectInstance` затронуло стор сцены и связанные селекторы.

## Изменения
- В `src/features/scene/store/sceneStore.ts` введено основное поле `objectInstances`. Старое `placements` сохранено как устаревшее и синхронизируется с новым полем.
- Реализованы методы `setObjectInstances`, `addObjectInstance`, `updateObjectInstance`, `removeObjectInstance`. Старые методы-алиасы помечены `@deprecated`.
- Все внутренние ссылки на `placements` заменены на `objectInstances`.
- Селекторы `useSceneObjectInstances` и `useSceneObjectInstancesOptimized` добавлены в стор и файл оптимизированных селекторов.
- Старые селекторы и методы сохранены как обёртки для совместимости.

Эти изменения подготовили код к дальнейшему обновлению хуков и компонентов.
