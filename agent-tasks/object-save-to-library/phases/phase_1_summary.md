# Фаза 1: Database Layer

В этой фазе добавлены методы работы с таблицей `objects` в `SceneLibraryDB`.

## Изменения
- Реализованы `saveObject` и `updateObject` в `src/shared/lib/database.ts`.
  - `saveObject` создаёт запись `ObjectRecord` и возвращает uuid.
  - `updateObject` частично обновляет существующий объект и выставляет `updatedAt`.

База данных теперь поддерживает сохранение и обновление объектов, что подготовило основу для интеграции в UI.
