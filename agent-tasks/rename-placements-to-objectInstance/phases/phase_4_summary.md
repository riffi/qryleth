# Фаза 4: UI компоненты

В этой фазе переименование `placement` в `objectInstance` затронуло основные UI-компоненты сцены.

## Изменения
- `SceneEditorR3F.tsx` – используется селектор `objectInstances`, добавление новых экземпляров через `addObjectInstance`.
- `ObjectManager.tsx` – учёт `objectInstances` при построении списка объектов, удаление и поиск экземпляров по новым полям.
- `TransformGizmo.tsx` – обновлены обращения к `objectInstanceIndex` и метод `updateObjectInstance`.
- `SceneObjects.tsx` – отрисовка объектов основана на `objectInstances`; обновлены события трансформации и пропсы `CompositeObject`.
- `CompositeObject.tsx` – пропсы компонента переименованы в `instance`/`instanceIndex`; данные `userData` теперь содержат `objectInstanceUuid` и `objectInstanceIndex`.
- `OptimizedComponents.tsx` – оптимизационный компонент сравнивает `instance` и `instanceIndex`.
- Комментарии и переменные с упоминанием `placement` обновлены или удалены.

Эти изменения перешли UI на новую терминологию, сохраняя совместимость со стором из предыдущих фаз.
