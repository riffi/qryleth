# Взаимодействие LLM-агента с редактором

## Обзор

Документ описывает, как языковая модель взаимодействует с Qryleth и какие правила необходимо соблюдать при использовании системы AI tools в соответствии с архитектурой Feature-Sliced Design.

---

## Принцип работы

Основная коммуникация с LLM построена на сервисе `LangChainChatService` (`src/shared/lib/langchain/chatService.ts`) с системой динамической регистрации инструментов.

### Архитектура AI Tools

- **Shared Layer** - содержит базовую инфраструктуру LangChain (`chatService.ts`, `toolRegistry.ts`, `types.ts`)
- **Features Layer** - каждая feature регистрирует свои AI инструменты независимо:
  - `features/scene/lib/ai/tools/` - инструменты для работы со сценой
  - `features/object-editor/lib/ai/tools/` - инструменты для редактирования объектов

### Процесс работы

- При монтировании `ChatInterface` вызывается `langChainChatService.initialize()`, который читает активное подключение из `openAISettings` и создает модель `ChatOpenAI`.
- **Динамическая регистрация инструментов**: Features автоматически регистрируют свои инструменты через `ToolRegistry` при инициализации компонентов (например, `SceneEditorR3F`, `ObjectEditorR3F`).
- Сам чат выполняется методом `langChainChatService.chat(messages)`, внутри которого используется `createToolCallingAgent` из LangChain. Агент получает доступ к инструментам из реестра.
- Для обратной совместимости сохранена функция `fetchWithTools` из `openAIAPI.ts`; она применяется в debug‑панели и позволяет напрямую отправлять запрос к API без LangChain.
- Результат работы LangChain содержит сообщение ассистента и, при необходимости, сведения о выполненных инструментах. UI обновляет состояние сцены через публичные actions zustand‑стора.
- Агент не изменяет DOM напрямую и не обращается к внутреннему состоянию компонентов.

### Настройка подключений

Подключения к LLM описываются структурой `OpenAISettingsConnection` и хранятся в Dexie базе (`SceneLibraryDB`). Пользователь управляет списком подключений через модальное окно `OpenAISettingsModal`.

- Поддерживаются провайдеры `openrouter`, `openai` и `compatible`.
- Для каждого подключения сохраняются URL сервиса, название модели и API‑ключ.
- При выборе активного подключения `langChainChatService` переинициализируется с новыми параметрами.

Подробнее см. [Настройка подключений](provider-connections.md).

---

## Контракт


Структуры данных для общения с моделью определены в `shared/entities/chat/types`:

- `ChatMessage` – расширенная структура с поддержкой id, роли, текста, времени и toolCalls
- `ChatConfig` – конфигурация чата с указанием feature, tools и systemPrompt
- `Tool` – описание инструмента, который может быть вызван моделью  
- `ToolCall` – фактический вызов с именем функции и аргументами

### Доступные инструменты

**Scene Tools** (регистрируются в `features/scene`):
- `add_new_object` - создание новых объектов в сцене
- `place_instance` - размещение экземпляров объектов
- `search_objects_in_library` - поиск объектов в библиотеке
- `add_object_from_library` - добавление объекта из библиотеки

**Object Editor Tools** (регистрируются в `features/object-editor`):
 - `getObjectData` - получение полных данных текущего объекта
 - `addPrimitives` - добавление одного или нескольких примитивов

### Система регистрации инструментов

**ToolRegistry** (`src/shared/lib/langchain/toolRegistry.ts`):
```typescript
export interface ToolProvider {
  register(): void;
  unregister(): void;
}

export class ToolRegistry {
  registerProvider(provider: ToolProvider): void
  unregisterProvider(provider: ToolProvider): void
  getAllTools(): Array<StructuredTool>
}
```

**Пример регистрации в feature**:
```typescript
// features/scene/lib/ai/index.ts
export const sceneToolProvider: ToolProvider = {
  register: () => {
    toolRegistry.registerTool('scene', sceneTools)
  },
  unregister: () => {
    toolRegistry.unregisterTool('scene')
  }
}

// features/scene/ui/SceneEditorR3F.tsx
export function SceneEditorR3F() {
  useSceneToolRegistration() // Автоматическая регистрация/отмена
  // ...
}
```

**Правила:**
- Модель обязана передавать аргументы в формате JSON, соответствующем схемам параметров инструментов. Неверный формат считается ошибкой
- Все манипуляции со сценой должны выполняться через публичные функции стора или пропсы компонентов (например, `onObjectAdded`)
- Features должны регистрировать свои инструменты при монтировании и отменять регистрацию при размонтировании

---

## ChatInterface архитектура

### Общая структура (после рефакторинга)

ChatInterface была полностью перестроена в соответствии с принципами FSD:

1. **Shared entities** (`src/shared/entities/chat/`):
   - **types/** - базовые типы ChatMessage, ChatConfig
   - **ui/** - переиспользуемые компоненты (ChatContainer, ChatInput, ChatMessageItem)
   - **lib/** - базовые хуки (useChat, useChatScroll) и утилиты

2. **Feature-специфичные ChatInterface**:
   - **SceneChatInterface** (`features/scene/ui/ChatInterface/`)
   - **ObjectChatInterface** (`features/object-editor/ui/ChatInterface/`)

### SceneChatInterface

Специализированный чат для работы со сценами:

**Особенности:**
- Debug-панель с JSON выводом responses и tool calls
- Интеграция с scene-специфичными AI tools  
- Полноэкранный режим для детального анализа
- Автоматическая регистрация scene tools при монтировании

**Структура:**
```
features/scene/ui/ChatInterface/
├── SceneChatInterface.tsx      # Главный компонент
├── components/
│   ├── SceneDebugPanel/        # Debug-панель с JSON
│   └── SceneToolCallbacks/     # Обработка tool callbacks
└── hooks/
    └── useSceneChat.ts         # Scene-специфичная логика
```

### ObjectChatInterface

Специализированный чат для редактирования объектов:

**Особенности:**
- Система переключаемых панелей (чат ⟷ свойства объекта)
- Контекстная помощь на основе текущего редактируемого объекта
- Поддержка режимов страницы и модального окна
- Интеграция с object-editor AI tools
- Автоматическое скрытие при выборе примитива/материала

**Структура:**
```
features/object-editor/ui/ChatInterface/
├── ObjectChatInterface.tsx     # Главный компонент
├── components/
│   └── ObjectToolCallbacks/    # Обработка tool callbacks
└── hooks/
    ├── useObjectChat.ts        # Object-editor логика
    └── useObjectContextPrompt.ts  # Контекстные промпты
```

**Система панелей ObjectEditor:**
```
features/object-editor/ui/
├── PanelToggleButtons/         # Кнопки переключения панелей
├── ObjectEditorLayout/         # Layout с поддержкой панелей
└── ChatInterface/              # ChatInterface для объектов
```

### Принципы использования ChatInterface

1. **Автоматическая регистрация tools** - каждый ChatInterface автоматически регистрирует свои AI инструменты при монтировании компонента
2. **Контекстная адаптация** - интерфейс адаптируется под редактируемые данные
3. **Переиспользование базовых компонентов** - все ChatInterface используют общие UI компоненты из shared/entities/chat
4. **Feature изоляция** - каждая feature управляет своим ChatInterface независимо

---

##  Пример последовательности

1. Пользователь отправляет запрос в чат
2. `ChatInterface` передаёт полный список сообщений в `langChainChatService.chat()`
3. LangChain агент анализирует историю, при необходимости вызывает инструменты и возвращает текстовый ответ
   - При создании объектов агент добавляет поле `name` для каждого примитива. Если имя не задано, оно генерируется автоматически.
4. Если был выполнен инструмент `add_new_object`, сервис вызывает callback `onObjectAdded`, и UI отображает дополнительное системное сообщение

---

##  Соответствие архитектуре


Такой подход гарантирует, что агенты работают предсказуемо и не нарушают архитектурные границы приложения.

## Связанные файлы

**Shared Layer:**
- `src/shared/entities/chat/` - Базовая chat функциональность (типы, UI, хуки)
- `src/shared/lib/langchain/chatService.ts` - Основной сервис LangChain
- `src/shared/lib/langchain/toolRegistry.ts` - Реестр AI инструментов
- `src/shared/lib/langchain/types.ts` - Типы для AI системы

**Features Layer:**
- `src/features/scene/ui/ChatInterface/` - ChatInterface для сцен
- `src/features/scene/lib/ai/` - AI инструменты для работы со сценой
- `src/features/object-editor/ui/ChatInterface/` - ChatInterface для объектов
- `src/features/object-editor/ui/PanelToggleButtons/` - Система панелей
- `src/features/object-editor/ui/ObjectEditorLayout/` - Layout с панелями
- `src/features/object-editor/lib/ai/` - AI инструменты для редактирования объектов

**Документация:**
- [Design Principles](../../architecture/design-principles.md) - Принципы архитектуры
- [Feature-Sliced Design](../../architecture/feature-sliced-design.md) - Руководство по FSD
