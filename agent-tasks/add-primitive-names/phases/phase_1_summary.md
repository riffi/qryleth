# Фаза 1: добавление имени примитива

В рамках первой фазы интерфейс `GfxPrimitive` расширен полем `name`. Схема валидации примитивов в `objectTools.ts` дополнена новым свойством, а функция формирования примитива теперь передаёт значение `name` в объект. Также обновлена документация задачи.

Внесены изменения в файлы:
- `src/entities/primitive/model/types.ts`
- `src/shared/lib/langchain/tools/objectTools.ts`
- `src/entities/primitive/model/normalize.ts`
- `agent-tasks/add-primitive-names/AGENT_TASK_SUMMARY.md`

Проведена сборка проекта (`npm run build`) — успешно. Линтинг (`npm run lint`) выявил существующие ошибки, не связанные с текущими изменениями.
