# Фаза 5: Утилиты и API

В этой фазе переименование `placement` в `objectInstance` затронуло утилиты и взаимодействие с LLM.

## Изменения
- `InstancedObjects.tsx` теперь использует селектор `useSceneObjectInstancesOptimized` и переменные `instance`/`instances`. Интерфейс `ConditionalInstancedObjectProps` переименован соответственно.
- `openAIAPI.ts` возвращает `objectInstances` вместе с устаревшим полем `placements` для совместимости. При разборе ответов API учитываются оба варианта.
- `systemPrompt.ts` обновлён: в описании формата вместо `placements` используется `objectInstances`.
- Интерфейс `SceneResponse` поддерживает новое поле `objectInstances`.
