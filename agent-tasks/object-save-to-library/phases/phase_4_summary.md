# Фаза 4: Error Handling & Notifications

В этой фазе реализована обработка возможных ошибок при сохранении объектов
в библиотеку и добавлен единый хук `useErrorHandler`.

## Изменения
- Создан `src/shared/hooks/useErrorHandler.ts` и индексный файл с экспортом.
  Хук выводит уведомление через `notifications` и пишет ошибку в консоль.
- В `database.ts` методы `saveObject` и `updateObject` проверяют уникальность
  имени и валидность данных, при ошибках бросают исключения `DuplicateNameError`
  и `ValidationError`.
- `SceneObjectManager.tsx` теперь использует `useErrorHandler` и выводит
  подробные сообщения об ошибках при сохранении объекта.
- `AGENT_TASK_SUMMARY.md` обновлён, добавлена ссылка на текущую фазу.
