# Chat компоненты

Документация по компонентам чата, созданным в рамках рефакторинга ChatInterface в соответствии с принципами FSD.

## Shared Chat Components

### ChatContainer

**Путь**: `src/shared/entities/chat/ui/ChatContainer/`

Основной контейнер для отображения чата с автоматическим скроллом к новым сообщениям.

**Props:**
```typescript
interface ChatContainerProps {
  messages: ChatMessage[]
  isLoading?: boolean
  className?: string
  height?: string | number
}
```

**Особенности:**
- Автоматический скролл к последнему сообщению
- Индикатор загрузки
- Кастомизируемая высота
- Поддержка всех типов сообщений (user, assistant, system)

### ChatInput

**Путь**: `src/shared/entities/chat/ui/ChatInput/`

Поле ввода сообщений с кнопкой отправки и поддержкой горячих клавиш.

**Props:**
```typescript
interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
  autoFocus?: boolean
}
```

**Особенности:**
- Отправка по Ctrl+Enter или кнопке
- Автоматическая очистка после отправки
- Блокировка во время обработки
- Автофокус при монтировании

### ChatMessageItem

**Путь**: `src/shared/entities/chat/ui/ChatMessageItem/`

Компонент для отображения отдельного сообщения чата.

**Props:**
```typescript
interface ChatMessageItemProps {
  message: ChatMessage
  showTimestamp?: boolean
  compact?: boolean
}
```

**Особенности:**
- Различные стили для ролей (user, assistant, system)
- Отображение времени сообщения
- Компактный режим для модальных окон
- Поддержка tool calls в сообщениях

## Feature-специфичные ChatInterface

### SceneChatInterface

**Путь**: `features/scene/ui/ChatInterface/`

Специализированный чат для работы со сценами.

**Props:**
```typescript
interface SceneChatInterfaceProps {
  onObjectAdded?: (object: GfxObjectWithTransform, toolName: string) => void
  debugMode?: boolean
}
```

**Особенности:**
- Debug-панель с JSON выводом responses и tool calls
- Интеграция с scene-специфичными AI tools
- Полноэкранный режим
- Автоматическая регистрация scene tools

**Компоненты:**
- `SceneDebugPanel` - панель отладки с JSON выводом
- `SceneToolCallbacks` - обработка callbacks от AI tools

### ObjectChatInterface

**Путь**: `features/object-editor/ui/ChatInterface/`

Специализированный чат для редактирования объектов.

**Props:**
```typescript
interface ObjectChatInterfaceProps {
  isVisible: boolean
  onVisibilityChange?: (visible: boolean) => void
  currentObject?: ObjectInfo
  mode: 'page' | 'modal'
}
```

**Особенности:**
- Система переключаемых панелей (чат ⟷ свойства)
- Контекстная помощь на основе редактируемого объекта
- Поддержка режимов страницы и модального окна
- Интеграция с object-editor AI tools
- Автоматическое скрытие при выборе примитива/материала

**Компоненты:**
- `ObjectToolCallbacks` - обработка callbacks от AI tools

## Хуки

### useChat

**Путь**: `src/shared/entities/chat/lib/hooks/useChat.ts`

Базовый хук для управления состоянием чата.

```typescript
interface UseChatReturn {
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
  updateLastMessage: (content: string) => void
}
```

### useChatScroll

**Путь**: `src/shared/entities/chat/lib/hooks/useChatScroll.ts`

Хук для автоматического скролла к новым сообщениям.

```typescript
interface UseChatScrollReturn {
  scrollRef: RefObject<HTMLDivElement>
  scrollToBottom: () => void
  isAtBottom: boolean
}
```

### useSceneChat

**Путь**: `features/scene/ui/ChatInterface/hooks/useSceneChat.ts`

Scene-специфичный хук для работы с чатом.

### useObjectChat

**Путь**: `features/object-editor/ui/ChatInterface/hooks/useObjectChat.ts`

Object-editor специфичный хук для работы с чатом.

## Система панелей ObjectEditor

### PanelToggleButtons

**Путь**: `features/object-editor/ui/PanelToggleButtons/`

Кнопки для переключения между панелями в ObjectEditor.

**Props:**
```typescript
interface PanelToggleButtonsProps {
  panelState: PanelState
  onPanelChange: (panel: PanelType, visible: boolean) => void
  mode?: 'header' | 'modal'
}
```

**Типы панелей:**
- `chat` - панель чата
- `properties` - панель свойств объекта  
- `manager` - панель менеджера объектов

### ObjectEditorLayout

**Путь**: `features/object-editor/ui/ObjectEditorLayout/`

Layout компонент с поддержкой переключаемых панелей.

**Props:**
```typescript
interface ObjectEditorLayoutProps {
  children: React.ReactNode
  panelState: PanelState
  onPanelChange: (panel: PanelType, visible: boolean) => void
  chatComponent?: React.ReactNode
  propertiesComponent?: React.ReactNode
  managerComponent?: React.ReactNode
}
```

**Логика панелей:**
- Левая панель: чат и свойства взаимоисключающие
- Правая панель: менеджер работает независимо
- Автоматика: при выборе примитива/материала → скрыть чат, показать свойства

## Типы данных

### ChatMessage (расширенный)

```typescript
interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  toolCalls?: ToolCall[]
}
```

### PanelState

```typescript
interface PanelState {
  leftPanel: 'chat' | 'properties' | null
  rightPanel: 'manager' | null
  chatVisible: boolean
  propertiesVisible: boolean
  managerVisible: boolean
}
```

## Принципы использования

1. **Переиспользование** - используйте shared компоненты для базовой функциональности
2. **Feature изоляция** - специфичная логика остается в соответствующих features
3. **Типизация** - все компоненты полностью типизированы TypeScript
4. **FSD соответствие** - архитектура полностью соответствует принципам Feature-Sliced Design

## Связанные документы

- [Feature-Sliced Design](../../architecture/feature-sliced-design.md)
- [AI Integration](../../features/ai-integration/llm-integration.md)
- [Object Editing](../../features/object-editing/README.md)