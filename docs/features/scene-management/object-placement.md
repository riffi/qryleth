# Управление объектами

Краткое руководство по размещению и перемещению объектов на сцене.

- Добавление объектов из библиотеки
- Перемещение, поворот и масштабирование инстансов
- Удаление объектов со сцены

Логика расположена в `src/features/scene` и хранилищах Zustand. Для деталей смотрите `SceneObjectManager` и контекст `SceneObjectManagerContext`.

## Добавление объектов из библиотеки

`AddObjectFromLibraryModal` скрывает записи, которые уже присутствуют в сцене. При добавлении используется метод `SceneAPI.addObjectFromLibrary`, а в поле `libraryUuid` объекта сцены сохраняется UUID записи библиотеки. Благодаря этому контекстное меню не предлагает повторно сохранять такой объект.

## Стратегии размещения

Работы с размещением сведены к дискретным стратегиям через `PlacementStrategyConfig`.

- `Random` — случайное размещение без учёта коллизий.
- `RandomNoCollision` — случайное размещение с проверкой пересечений.
- `PlaceAround` — размещение вокруг целевого инстанса или всех инстансов заданного объекта.

Пример (вокруг конкретного инстанса):

```ts
SceneAPI.addInstances('rock-uuid', 'objects', 6, {
  strategy: PlacementStrategy.PlaceAround,
  metadata: {
    targetInstanceUuid: 'house-instance-uuid',
    minDistance: 1.5,
    maxDistance: 3.0,
    distributeEvenly: false,
    angleOffset: 0,
    onlyHorizontal: true
  }
})
```

Полная спецификация — в docs/api/scene-api.md (раздел Placement Strategies).
