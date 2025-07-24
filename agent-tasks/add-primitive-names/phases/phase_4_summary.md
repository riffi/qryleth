# Фаза 4: обновление существующих примитивов

В данной фазе реализована миграция старых примитивов без поля `name`.
Добавлена функция `ensurePrimitiveNames`, которая присваивает отсутствующие
имена на основе типа и порядкового номера. Хранилища `objectStore` и
`sceneStore` теперь используют эту функцию при установке и обновлении
списков примитивов. При сохранении объектов в `ObjectEditorPage` данные
берутся из состояния стора, что позволяет сохранять сгенерированные имена.

Изменённые файлы:
- `src/entities/primitive/model/names.ts`
- `src/features/object-editor/model/objectStore.ts`
- `src/features/scene/model/sceneStore.ts`
- `src/pages/ObjectEditorPage.tsx`
