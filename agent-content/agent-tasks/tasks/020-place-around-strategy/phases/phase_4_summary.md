# Фаза 4 — Обновление AI tools чата в SceneEditor

## Результат фазы
- Добавлена полная поддержка стратегии размещения `PlaceAround` в AI-инструментах чата SceneEditor:
  - Валидация входных параметров через `zod` для `PlaceAroundMetadata` (проверки на взаимную исключаемость `targetInstanceUuid`/`targetObjectUuid`, неотрицательные расстояния, `minDistance < maxDistance`).
  - Поддержка выбора стратегии размещения и передачи `metadata` во все соответствующие вызовы `SceneAPI`.
  - Экспорт обновлённых инструментов в общем индексе AI-инструментов.

## Внесённые изменения (файлы)
- apps/qryleth-front/src/features/scene/lib/ai/tools/objectTools.ts
  - Добавлена схема `PlaceAroundMetadataSchema` для валидации метаданных стратегии PlaceAround.
  - Инструмент `add_new_object`:
    - Требует `placementMetadata` при выборе стратегии `PlaceAround` (возвращает понятную ошибку при отсутствии).
    - Формирует `placementConfig = { strategy: PlacementStrategy.PlaceAround, metadata }` и передаёт в `SceneAPI.createObject(...)`.
  - Подробные комментарии на русском языке к каждой части валидации и выполнению инструмента уже присутствуют.

- apps/qryleth-front/src/features/scene/lib/ai/tools/instanceTools.ts
  - Добавлена идентичная `PlaceAroundMetadataSchema` с проверками:
    - Требование указать `targetInstanceUuid` ИЛИ `targetObjectUuid`.
    - Проверка `minDistance < maxDistance`.
  - Инструмент `add_object_instance`:
    - При стратегии `PlaceAround` требует `placementMetadata`.
    - Формирует корректный `placementConfig` и вызывает `SceneAPI.addInstances(...)` с поддержкой множественного размещения.

- apps/qryleth-front/src/features/scene/lib/ai/tools/index.ts
  - Экспортирует обновлённые инструменты из `objectTools` и `instanceTools` (в т.ч. с поддержкой PlaceAround).

## Интеграция и поведение
- Оба инструмента (создание нового объекта и добавление инстансов существующего) корректно прокидывают конфигурацию размещения в `SceneAPI`, где далее используется новая логика размещения `PlaceAround` из `ObjectPlacementUtils`.
- При ошибках валидации возвращаются структурированные сообщения об ошибках на русском языке, пригодные для отображения в чате.

## Мини-примеры использования (чат)
1) Добавить новый объект с размещением вокруг всех инстансов другого объекта:
```
add_new_object({
  name: "Куст",
  materials: [{ uuid: "m1", name: "Листва", properties: { color: "#228B22" } }],
  primitives: [{ type: "sphere", geometry: { radius: 0.6 }, objectMaterialUuid: "m1" }],
  count: 8,
  placementStrategy: "PlaceAround",
  placementMetadata: {
    targetObjectUuid: "tree-object-uuid",
    minDistance: 0.5,
    maxDistance: 2.0,
    distributeEvenly: true,
    onlyHorizontal: true
  }
})
```

2) Добавить инстансы существующего объекта вокруг конкретного инстанса:
```
add_object_instance({
  objectUuid: "rock-object-uuid",
  count: 6,
  placementStrategy: "PlaceAround",
  placementMetadata: {
    targetInstanceUuid: "house-instance-uuid",
    minDistance: 1.5,
    maxDistance: 3.0,
    distributeEvenly: false,
    angleOffset: 0
  }
})
```

## Вывод
- Функциональность фазы 4 реализована: схема валидации добавлена, инструменты обновлены, экспорт настроен. AI-инструменты корректно поддерживают стратегию `PlaceAround` и возвращают понятные сообщения об ошибках при некорректном вводе.

