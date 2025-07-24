# Фаза 3: отображение имен примитивов в ObjectEditorR3F

В этой фазе реализовано корректное отображение названий примитивов в выпадающем списке редактора объекта. Добавлена утилита `getPrimitiveDisplayName`, возвращающая имя примитива либо резервное значение вида `type-index`. MultiSelect теперь отображает эти названия вместо "Примитив N".

Измененные файлы:
- `src/entities/primitive/model/names.ts` (новый)
- `src/entities/primitive/index.ts`
- `src/shared/lib/langchain/tools/objectTools.ts`
- `src/features/object-editor/ui/ObjectEditorR3F.tsx`
- `agent-tasks/add-primitive-names/AGENT_TASK_SUMMARY.md`

Сборка проекта (`npm run build`) прошла успешно. Линтер (`npm run lint`) по-прежнему сообщает о существующих ошибках, не связанных с текущей фазой.
