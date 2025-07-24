# Фаза 1: Рефакторинг chatService для динамической регистрации tools

## Выполненные задачи ✅

### 1. Анализ текущей архитектуры
- Проанализирован код `chatService.ts` и выявлена проблема с хардкод импортом `getAllSceneTools`
- Изучена текущая структура инструментов в папке `shared/lib/langchain/tools/`
- Определены требования для динамической регистрации tools

### 2. Расширение типизации
**Файл**: `src/shared/lib/langchain/types.ts`

Добавлены новые интерфейсы:
- `ToolProvider` - интерфейс для провайдеров инструментов из features
- `ToolRegistrationEvent` - события регистрации/отмены регистрации инструментов  
- `ToolRegistry` - интерфейс реестра инструментов с методами управления

### 3. Создание системы динамической регистрации
**Файл**: `src/shared/lib/langchain/toolRegistry.ts` (новый)

Реализована система `ToolRegistryImpl` с возможностями:
- Регистрация/отмена регистрации провайдеров инструментов
- Получение всех инструментов или инструментов конкретной feature
- Подписка на события изменения набора инструментов
- Обработка ошибок при получении инструментов от провайдеров

### 4. Модификация chatService
**Файл**: `src/shared/lib/langchain/chatService.ts`

Внесены изменения:
- ❌ Удален хардкод импорт `import { getAllSceneTools } from './tools'`
- ✅ Добавлен импорт `import { toolRegistry } from './toolRegistry'`
- ❌ Убран метод `registerSceneTools()`
- ✅ Добавлен метод `loadToolsFromRegistry()` для загрузки всех инструментов из реестра
- ✅ Добавлена подписка на события изменения реестра в `initialize()`
- ✅ Добавлен метод `getToolRegistry()` для внешнего доступа к реестру

## Архитектурные изменения

### До изменений (нарушение FSD)
```typescript
// chatService.ts
import { getAllSceneTools } from './tools' // ❌ хардкод зависимость от scene tools

class LangChainChatService {
  registerSceneTools() {
    const sceneTools = getAllSceneTools() // ❌ прямая зависимость от конкретной feature
  }
}
```

### После изменений (соответствие FSD)
```typescript  
// chatService.ts
import { toolRegistry } from './toolRegistry' // ✅ зависимость от абстракции

class LangChainChatService {
  loadToolsFromRegistry() {
    const allTools = toolRegistry.getAllTools() // ✅ работа через абстракцию
  }
}
```

## Результат фазы

✅ **shared слой больше не зависит напрямую от конкретных features**
✅ **Создана гибкая система регистрации инструментов**
✅ **Подготовлена архитектура для перемещения tools в соответствующие features**

## Следующие шаги

Теперь можно переходить к **Фазе 2**, где:
1. Scene-специфичные tools будут перемещены в `features/scene-editor/lib/ai/tools/`
2. Будет создан провайдер инструментов для scene-editor
3. Scene-editor будет регистрировать свои инструменты через новую систему

## Измененные файлы

1. `src/shared/lib/langchain/types.ts` - расширена типизация
2. `src/shared/lib/langchain/toolRegistry.ts` - новый файл с реестром
3. `src/shared/lib/langchain/chatService.ts` - убрана зависимость от конкретных tools