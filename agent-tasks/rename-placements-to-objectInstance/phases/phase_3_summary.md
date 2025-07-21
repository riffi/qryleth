# Фаза 3: Хуки

В этой фазе обновлены все R3F‑хуки, чтобы использовать термин `objectInstance` вместо `placement`.

## Изменения
- `useKeyboardShortcuts.ts` переименованы локальные переменные и обращения к стору. Используются `objectInstanceIndex` и методы `updateObjectInstance`. Старые названия больше не встречаются.
- `useUISync.ts` использует селектор `useSceneObjectInstancesOptimized`, передаёт данные как `objectInstances` и `objectInstanceCount`. Слушатели и realtime‑события тоже обновлены.
- `useObjectSelection.ts` теперь ищет `objectInstanceUuid` в `userData` объектов с поддержкой старого `placementUuid` для совместимости.
- `useSceneEvents.ts` отправляет `objectInstanceUuid` и `objectInstanceIndex`, оставаясь совместимым с устаревшими полями.

Эти правки не затрагивают UI‑компоненты — они будут обновлены в следующих фазах.
