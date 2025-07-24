# Фаза 2: генерация имен примитивов

Во второй фазе обновлен системный промпт LangChain агента, чтобы он всегда генерировал осмысленные русские имена примитивов. Схема валидации `PrimitiveSchema` дополнена проверкой `name` и описанием. При создании примитивов теперь используется функция `generatePrimitiveName`, обеспечивающая резервные названия вида `type-index`, если имя не было передано.

Обновленные файлы:
- `src/shared/lib/langchain/chatService.ts`
- `src/shared/lib/langchain/tools/objectTools.ts`
- `agent-tasks/add-primitive-names/AGENT_TASK_SUMMARY.md`

Сборка (`npm run build`) выполнена успешно. Линтер (`npm run lint`) по‑прежнему сообщает о существующих ошибках, не связанных с текущими изменениями.
