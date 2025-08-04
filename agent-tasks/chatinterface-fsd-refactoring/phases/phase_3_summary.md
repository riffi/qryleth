# Фаза 3: Миграция SceneEditor ChatInterface

**Статус**: ⏳ Планируется  
**Приоритет**: Высокий  
**Предполагаемое время**: 2-3 часа

## Цель фазы
Перенос существующего ChatInterface из widgets в соответствующую фичу scene с сохранением всей функциональности и обеспечением обратной совместимости.

## Контекст
Текущий `src/widgets/ChatInterface.tsx` (480 строк) содержит как общую логику чата, так и специфичные для SceneEditor интеграции:
- Интеграция с `addNewObjectTool` и `createAddNewObjectTool`
- Callbacks для успешного добавления объектов в сцену
- Debug-панель с JSON выводом для создания объектов
- Специфичные промпты для scene-контекста

## Подзадачи

### 3.1 Анализ существующего ChatInterface
**Время**: 30 минут

**Задачи анализа:**
- Выделить scene-специфичную логику из общей
- Определить зависимости от SceneEditor компонентов
- Найти все места использования ChatInterface в scene фиче
- Проанализировать tool calls и callbacks

**Файлы для анализа:**
- `src/widgets/ChatInterface.tsx` - основной компонент
- `src/features/scene/lib/ai/tools/` - AI tools для scene
- `src/features/scene/ui/` - компоненты scene, использующие ChatInterface

### 3.2 Создание SceneChatInterface
**Время**: 1.5-2 часа

**Файлы для создания:**
```
src/features/scene/ui/ChatInterface/
├── SceneChatInterface.tsx
├── index.ts
├── components/
│   ├── SceneDebugPanel/
│   │   ├── SceneDebugPanel.tsx
│   │   └── index.ts
│   └── SceneToolCallbacks/
│       ├── SceneToolCallbacks.tsx
│       └── index.ts
└── hooks/
    └── useSceneChat.ts
```

**SceneChatInterface.tsx - основные требования:**

```typescript
interface SceneChatInterfaceProps {
  isCollapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
  debugMode?: boolean
}
```

**Функциональность:**
- Использование базовых компонентов из `shared/entities/chat`
- Интеграция с scene-специфичными AI tools
- Обработка callbacks для добавления объектов в сцену
- Поддержка существующего API (isCollapsed, onCollapse)
- Интеграция debug-панели

**useSceneChat.ts:**
```typescript
export const useSceneChat = () => {
  const { addObjectToScene, currentScene } = useSceneStore()
  
  // Конфигурация чата для scene
  const chatConfig: ChatConfig = {
    feature: 'scene',
    tools: sceneAITools,
    systemPrompt: SCENE_SYSTEM_PROMPT,
    debugMode: true
  }
  
  // Scene-специфичные callbacks
  const handleObjectAdded = useCallback((objectData: any) => {
    // Логика добавления объекта в сцену
    addObjectToScene(objectData)
  }, [addObjectToScene])
  
  // Использование базового хука
  const chatState = useChat(chatConfig)
  
  return {
    ...chatState,
    onObjectAdded: handleObjectAdded,
  }
}
```

### 3.3 Создание SceneDebugPanel
**Время**: 45 минут

**SceneDebugPanel.tsx - требования:**
- Отображение JSON объектов для создания
- Кнопки для копирования/сохранения JSON
- Интеграция с существующим debug-режимом
- Стилизация в соответствии с существующим дизайном

**Основная функциональность:**
```typescript
interface SceneDebugPanelProps {
  messages: ChatMessage[]
  isVisible: boolean
  onToggle: () => void
}
```

- Парсинг tool calls из сообщений чата
- Форматирование JSON для удобного чтения
- Подсветка синтаксиса JSON
- Экспорт в файл или копирование в буфер обмена

### 3.4 Обновление импортов и интеграций
**Время**: 30 минут

**Файлы для обновления:**
- `src/features/scene/ui/index.ts` - добавить экспорт SceneChatInterface
- `src/pages/SceneEditorPage.tsx` - обновить импорт ChatInterface
- Все компоненты в `src/features/scene/ui/`, использующие ChatInterface

**Шаблон замены импортов:**
```typescript
// Было:
import { ChatInterface } from '../../widgets/ChatInterface'

// Стало:
import { SceneChatInterface } from '../features/scene/ui/ChatInterface'
```

**Обновление использования:**
```typescript
// Было:
<ChatInterface 
  isCollapsed={chatCollapsed}
  onCollapse={setChatCollapsed}
/>

// Стало:
<SceneChatInterface 
  isCollapsed={chatCollapsed}
  onCollapse={setChatCollapsed}
  debugMode={true}
/>
```

## Критерии готовности

### Функциональные критерии
- [ ] SceneChatInterface работает идентично старому ChatInterface
- [ ] Все AI tools для scene интегрированы и функционируют
- [ ] Debug-панель отображает JSON объектов корректно
- [ ] Callbacks для добавления объектов в сцену работают
- [ ] Сохранена поддержка collapse/expand функциональности

### Технические критерии
- [ ] Все импорты в scene фиче обновлены
- [ ] TypeScript компилируется без ошибок
- [ ] Нет console.error или предупреждений
- [ ] Существующие тесты (если есть) проходят
- [ ] Hot reload работает корректно

### Критерии качества
- [ ] Код хорошо структурирован и читаем
- [ ] Используются созданные в Фазе 1 базовые компоненты
- [ ] Нет дублирования логики
- [ ] Соблюдаются принципы FSD архитектуры

## Технические детали реализации

### Интеграция с scene AI tools
```typescript
// src/features/scene/lib/ai/tools/index.ts
export const sceneAITools: ToolDefinition[] = [
  {
    name: 'addNewObjectTool',
    description: 'Добавить новый объект в сцену',
    parameters: addNewObjectToolSchema
  },
  {
    name: 'createAddNewObjectTool', 
    description: 'Создать и добавить объект в сцену',
    parameters: createAddNewObjectToolSchema
  }
]
```

### Обработка tool calls
```typescript
const handleToolCall = useCallback(async (toolCall: ToolCall) => {
  switch (toolCall.name) {
    case 'addNewObjectTool':
      const result = await addNewObjectTool(toolCall.arguments)
      onObjectAdded(result)
      return result
      
    case 'createAddNewObjectTool':
      const objectData = await createAddNewObjectTool(toolCall.arguments)
      onObjectAdded(objectData)
      return objectData
      
    default:
      throw new Error(`Unknown tool: ${toolCall.name}`)
  }
}, [onObjectAdded])
```

### Миграция debug функциональности
```typescript
// Извлечение debug данных из сообщений
const extractDebugData = useCallback((messages: ChatMessage[]) => {
  return messages
    .filter(msg => msg.role === 'assistant' && msg.toolCalls)
    .flatMap(msg => msg.toolCalls || [])
    .filter(call => ['addNewObjectTool', 'createAddNewObjectTool'].includes(call.name))
    .map(call => ({
      toolName: call.name,
      arguments: call.arguments,
      result: call.result,
      timestamp: new Date()
    }))
}, [])
```

## Потенциальные проблемы и решения

**Проблема**: Breaking changes в API при миграции  
**Решение**: Сохранить полную обратную совместимость, создать alias для старого API если необходимо

**Проблема**: Потеря функциональности debug-панели  
**Решение**: Тщательно протестировать все debug функции, создать unit тесты для критичной логики

**Проблема**: Проблемы с hot reload после изменения импортов  
**Решение**: Поэтапное обновление импортов, перезапуск dev сервера после каждого этапа

**Проблема**: Конфликт стилей с базовыми компонентами чата  
**Решение**: Использовать CSS modules с scene-специфичными префиксами

## Тестирование

### Ручное тестирование
1. Открыть SceneEditor
2. Протестировать отправку сообщений в чат
3. Проверить работу AI tools (добавление объектов)
4. Протестировать debug-панель (отображение JSON)
5. Проверить collapse/expand функциональность
6. Убедиться в корректности callbacks

### Автоматическое тестирование
- Unit тесты для useSceneChat хука
- Тесты для компонентов SceneDebugPanel
- Integration тесты для AI tools callbacks

## Следующая фаза
После завершения переходим к **Фазе 4: Создание ObjectEditor ChatInterface**, где будет создан ChatInterface для ObjectEditor с интеграцией в новый layout.

## Связанные файлы
- `src/shared/entities/chat/` - базовые компоненты из Фазы 1
- `src/widgets/ChatInterface.tsx` - исходный код для миграции
- `src/features/scene/lib/ai/tools/` - AI tools для интеграции
- `src/features/scene/model/sceneStore.ts` - стейт для callbacks