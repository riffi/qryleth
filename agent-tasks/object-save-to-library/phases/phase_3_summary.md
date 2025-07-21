# Фаза 3: Save Dialog Component

Создан переиспользуемый компонент `SaveObjectDialog` в `src/shared/ui`.
Он предоставляет модальное окно для ввода названия и описания объекта
и вызывает переданный колбэк `onSave`.
`SceneObjectManager.tsx` обновлён для использования нового компонента
вместо локально определённого `SaveObjectModal`.

## Изменения
- Новый файл `src/shared/ui/SaveObjectDialog.tsx` с модальным диалогом.
- Экспорт компонента через `src/shared/ui/index.ts`.
- Компонент `SaveObjectModal` удалён из `SceneObjectManager.tsx`,
  вместо него подключается `SaveObjectDialog`.
- Обновлён `AGENT_TASK_SUMMARY.md` и добавлена ссылка на этот файл.

