# Фаза 5: Интеграция tools в features

## Выполненные задачи ✅

1. **Автоматическая регистрация инструментов**
   - Добавлены React-хуки `useSceneToolRegistration` и `useObjectEditorToolRegistration`.
   - Хуки регистрируют соответствующие инструменты при монтировании компонента и удаляют их при размонтировании.

2. **Интеграция в UI компонентов**
   - `SceneEditorR3F` теперь вызывает `useSceneToolRegistration` и `useObjectEditorToolRegistration`.
   - `ObjectEditorR3F` использует `useObjectEditorToolRegistration` для собственной регистрации.

3. **Расширение публичного API фичей**
   - Экспорт новых хуков через `src/features/scene/index.ts` и `src/features/object-editor/index.ts`.

## Результат фазы

✅ Инструменты автоматически регистрируются при загрузке нужных фич, что гарантирует их изоляцию и исключает лишние зависимости.

## Следующие шаги

Переход к **Фазе 6** – устранению оставшихся нарушений FSD в слое `shared`.
