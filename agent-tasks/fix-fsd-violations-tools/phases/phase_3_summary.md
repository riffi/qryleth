# Фаза 3: Перемещение тула создания объекта

## Выполненные задачи ✅

1. **Перемещение objectTools.ts**
   - Источник: `src/shared/lib/langchain/tools/objectTools.ts`
   - Назначение: `src/features/scene/lib/ai/tools/objectTools.ts`
   - Файл перенесен без изменений логики.

2. **Обновление экспортов**
   - `src/features/scene/lib/ai/tools/index.ts` теперь экспортирует `createAddNewObjectTool` и `addNewObjectTool`.

3. **Расширение провайдера sceneToolProvider**
   - В `src/features/scene/lib/ai/index.ts` добавлен импорт и регистрация `addNewObjectTool`.

## Результат фазы

✅ Инструмент создания объектов перенесён в слой feature `scene`, что устранило нарушение FSD.
✅ Провайдер scene теперь регистрирует новый tool через реестр.

## Следующие шаги

Можно переходить к **Фазе 4**, в которой будет создана инфраструктура для object-editor tools.
