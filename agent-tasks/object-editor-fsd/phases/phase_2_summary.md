# Фаза 2

Перемещён zustand-store в сегмент `model` и обновлены импорты.

## Выполненные действия

- Файл `store/objectStore.ts` перемещён в `model/objectStore.ts`
- Создан `model/index.ts` для экспорта стора
- В файлах фичи обновлены пути импортов стора
- Хук `useOEPrimitiveSelection` теперь использует публичный API фичи
- Добавлены русские комментарии к методам в `objectStore.ts`
