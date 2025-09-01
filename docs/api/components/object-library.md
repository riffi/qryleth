# Браузер библиотеки

`LibraryBrowser` — презентационный компонент вкладок «Сцены/Объекты» с поиском и списками.

- Путь: `apps/qryleth-front/src/features/object-library/ui/LibraryBrowser.tsx`
- Назначение: показать библиотечные записи без обращения к БД — данные и обработчики приходят извне.
- Связанные части фичи:
  - `useLibraryStore` — zustand‑store для строки поиска (`searchQuery`).
  - `useLibrarySearch(items, query, selector)` — хук фильтрации по строке.
  - `lib/api.ts` — обёртки `loadScenes()/loadObjects()` (опционально для страниц/виджетов).

## Пропсы

- `scenes: SceneRecord[]`: список сцен для вкладки «Сцены».
- `objects: ObjectRecord[]`: список объектов для вкладки «Объекты».
- `isLoading?: boolean`: флаг загрузки для кнопок/карточек.
- `onEditScene(scene: SceneRecord)`: обработчик «Редактировать сцену».
- `onDeleteScene(scene: SceneRecord)`: обработчик удаления сцены.
- `onCreateScene()`: обработчик создания новой сцены.
- `onEditObject(obj: ObjectRecord)`: обработчик «Редактировать объект».
- `onDeleteObject(obj: ObjectRecord)`: обработчик удаления объекта.
- `onCreateObject()`: обработчик создания нового объекта.

## Особенности

- Поиск выполняется через `useLibraryStore().searchQuery` и `useLibrarySearch(...)`.
- Для карточек используется `LibraryObjectCard`.
- Компонент не вызывает БД напрямую — загрузку данных делает страница/виджет.

## Использование

Пример подключения на странице (упрощённо):

```
import { LibraryBrowser, useLibrarySearch } from '@/features/object-library'

// ... загрузили scenes/objects через API фичи
const filteredScenes = useLibrarySearch(scenes, searchQuery, s => `${s.name} ${s.description ?? ''}`)
const filteredObjects = useLibrarySearch(objects, searchQuery, o => `${o.name} ${o.description ?? ''}`)

<LibraryBrowser
  scenes={filteredScenes}
  objects={filteredObjects}
  isLoading={isLoading}
  onEditScene={handleEditScene}
  onDeleteScene={handleDeleteScene}
  onCreateScene={() => navigate('/scenes/new')}
  onEditObject={handleEditObject}
  onDeleteObject={handleDeleteObject}
  onCreateObject={() => navigate('/objects/new')}
/>
```

