# Рефакторинг ChatInterface для соответствия архитектуре FSD

**Ссылка на правила**: [agent-tasks.md](../../docs/development/workflows/agent-tasks.md)

> ⚠️ **ВАЖНО**: При выполнении каждой фазы обязательно сверяйтесь с требованиями из документа правил агентских задач.

## Контекст задачи

В настоящее время ChatInterface, который является частью фичи sceneEditor, находится в папке widgets, что не соответствует архитектуре Feature-Sliced Design (FSD). 

### Текущие проблемы

1. **Нарушение принципов FSD** - ChatInterface находится в widgets вместо соответствующей фичи
2. **Отсутствие переиспользования** - аналогичная функциональность нужна для objectEditor
3. **Монолитная структура** - общая и специфичная логика смешаны в одном компоненте
4. **Отсутствие системы управления панелями** в objectEditor для размещения нового чата

### Текущая архитектура

**Проблемный компонент:**
- `src/widgets/ChatInterface.tsx` (480 строк) - содержит как общую логику чата, так и специфичные для sceneEditor интеграции

**Ключевые зависимости:**
- LangChain сервисы для AI интеграции
- `addNewObjectTool` и `createAddNewObjectTool` (специфично для scene)
- UI компоненты для отображения сообщений и ввода
- Debug-панель с JSON выводом

**Текущие фичи, использующие ChatInterface:**
- `features/scene` - SceneEditor с полной интеграцией чата
- `features/object-editor` - требует добавления аналогичной функциональности

## План выполнения по фазам

### Фаза 1: Создание базовой инфраструктуры ✅ **Выполнено**
**Цель:** Создание общих компонентов и типов для chat-функциональности с новым типом ChatMessage

**Задачи:**
1. Создать новый тип `ChatMessage` в `shared/entities/chat` с расширенной функциональностью
2. Создать `shared/entities/chat` с базовой функциональностью на основе нового типа
3. Создать `features/object-editor/ui/PanelToggleButtons` для управления панелями ObjectEditor  
4. Создать типы для состояния панелей (`PanelState`, `PanelType`)

**Критерии готовности:**
- [x] Новый тип ChatMessage создан в shared/entities/chat/types/ с полями id, content, role, timestamp, toolCalls?
- [x] Базовые типы ChatConfig созданы в shared/entities/chat/types/
- [x] UI компоненты ChatContainer, ChatMessageItem, ChatInput созданы в shared/entities/chat/ui/
- [x] Хуки useChat, useChatScroll созданы в shared/entities/chat/lib/hooks/
- [x] PanelToggleButtons компонент создан в features/object-editor/ui/
- [x] Типы для управления состоянием панелей определены

**Детали выполнения:** [phase_1_summary.md](phases/phase_1_summary.md)

### Фаза 2: Рефакторинг ObjectEditor layout ✅ **Выполнено**
**Цель:** Подготовка UI ObjectEditor для интеграции системы переключаемых панелей

**Задачи:**
1. Создать `ObjectEditorLayout` компонент для управления панелями
2. Интегрировать toggle buttons в header (страница) и modal header  
3. Реализовать логику взаимоисключающего отображения левых панелей

**Критерии готовности:**
- [x] ObjectEditorLayout компонент создан с поддержкой переключаемых панелей
- [x] Toggle buttons интегрированы в header страницы редактирования объекта
- [x] Toggle buttons интегрированы в header модального окна редактирования
- [x] Реализована логика: чат и свойства взаимоисключающие (левая панель), менеджер независимый (правая панель)
- [x] Автоматическое скрытие чата при выборе примитива/материала работает корректно

**Детали выполнения:** [phase_2_summary.md](phases/phase_2_summary.md)

### Фаза 3: Миграция SceneEditor ChatInterface ✅ **Выполнено**
**Цель:** Перенос существующего ChatInterface в соответствующую фичу scene с переходом на новый тип ChatMessage

**Задачи:**
1. Перенести специфичную логику в `features/scene/ui/ChatInterface`
2. Обновить все импорты ChatInterface в sceneEditor на новый тип из shared/entities/chat
3. Заменить все использования старого типа ChatMessage из @src/shared/lib/openAIAPI.ts на новый
4. Провести тестирование обратной совместимости

**Критерии готовности:**
- [x] SceneChatInterface создан в features/scene/ui/ChatInterface/
- [x] Специфичная логика (addNewObjectTool, debug-панель) перенесена
- [x] Все импорты в sceneEditor обновлены на новый тип ChatMessage
- [x] Старые импорты из @src/shared/lib/openAIAPI.ts заменены на новые из shared/entities/chat
- [x] Функциональность sceneEditor работает без изменений
- [x] Debug-панель с JSON выводом сохранена и работает

**Детали выполнения:** [phase_3_summary.md](phases/phase_3_summary.md)

### Фаза 4: Создание ObjectEditor ChatInterface ✅ **Выполнено**
**Цель:** Реализация chat-функциональности для objectEditor с интеграцией в новый layout

**Задачи:**
1. Создать `features/object-editor/ui/ChatInterface/ObjectChatInterface`
2. Интегрировать чат в новый layout с toggle системой
3. Добавить специфичные для object-editor AI tools

**Критерии готовности:**
- [x] ObjectChatInterface создан и интегрирован в ObjectEditorLayout
- [x] Чат корректно отображается в левой панели при активации соответствующей toggle кнопки
- [x] Система переключения панелей работает корректно (чат скрывается при выборе свойств)
- [x] AI tools специфичные для object-editor интегрированы (15 инструментов)
- [x] Чат функционирует в обоих режимах: страница редактирования и модальное окно

**Детали выполнения:** [phase_4_summary.md](phases/phase_4_summary.md)

### Фаза 5: Финализация и тестирование
**Цель:** Завершение миграции, удаление старого типа ChatMessage и проверка всей системы

**Задачи:**
1. Удалить старый `widgets/ChatInterface.tsx`
2. Удалить старый тип ChatMessage из `@src/shared/lib/openAIAPI.ts`
3. Обновить все адаптеры и зависимые модули на новый тип
4. Провести полное тестирование обеих фич
5. Проверить производительность и UX

**Критерии готовности:**
- [ ] Старый widgets/ChatInterface.tsx удален
- [ ] Старый тип ChatMessage удален из @src/shared/lib/openAIAPI.ts
- [ ] Все адаптеры (langchain/adapters.ts и другие) обновлены на новый тип ChatMessage
- [ ] Все зависимые модули переведены на новый тип из shared/entities/chat
- [ ] Scene editor полностью функционален с новым ChatInterface
- [ ] Object editor полностью функционален с новым ChatInterface и системой панелей
- [ ] Нет регрессий в производительности
- [ ] UX соответствует требованиям (плавные переходы, сохранение состояния панелей)
- [ ] Все импорты корректны, dead code удален

## Технические детали реализации

### Архитектурная схема (целевое состояние)

**1. Shared entities для chat:**
```
src/shared/entities/chat/
├── types/
│   ├── ChatMessage.ts          # Базовые типы сообщений
│   └── ChatConfig.ts           # Конфигурация чата
├── ui/
│   ├── ChatMessageItem/        # Компонент отдельного сообщения
│   ├── ChatInput/              # Поле ввода сообщения
│   └── ChatContainer/          # Контейнер для чата
└── lib/
    ├── hooks/
    │   ├── useChat.ts          # Основная логика чата
    │   └── useChatScroll.ts    # Автоскролл чата
    └── utils/
        └── chatUtils.ts        # Утилиты для работы с чатом
```

**2. Scene ChatInterface:**
```
src/features/scene/ui/ChatInterface/
├── SceneChatInterface.tsx      # Главный компонент чата для scene
├── components/
│   ├── SceneDebugPanel/        # Debug-панель с JSON выводом
│   └── SceneToolCallbacks/     # Callbacks для scene-специфичных действий
└── hooks/
    └── useSceneChat.ts         # Хук для scene-специфичной логики
```

**3. ObjectEditor ChatInterface и Layout:**
```
src/features/object-editor/ui/
├── ChatInterface/
│   ├── ObjectChatInterface.tsx # Главный компонент чата для object-editor
│   ├── components/
│   │   └── ObjectToolCallbacks/ # Callbacks для object-editor действий
│   └── hooks/
│       └── useObjectChat.ts    # Хук для object-editor логики
├── PanelToggleButtons/
│   ├── PanelToggleButtons.tsx  # Кнопки управления панелями
│   ├── types.ts               # Типы для состояния панелей
│   └── hooks/
│       └── usePanelState.ts   # Управление состоянием панелей
└── ObjectEditorLayout/
    ├── ObjectEditorLayout.tsx  # Layout с поддержкой панелей
    └── components/
        ├── HeaderControls/     # Контролы в header
        └── PanelContainer/     # Контейнер для панелей
```

### Ключевые интерфейсы

**Состояние панелей ObjectEditor:**
```typescript
interface PanelState {
  leftPanel: 'chat' | 'properties' | null
  rightPanel: 'manager' | null
  chatVisible: boolean
  propertiesVisible: boolean
  managerVisible: boolean
}

type PanelType = 'chat' | 'properties' | 'manager'
```

**Расширенные типы чата:**
```typescript
interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  toolCalls?: ToolCall[]
}

interface ChatConfig {
  feature: 'scene' | 'object-editor'
  tools: ToolDefinition[]
  systemPrompt: string
  debugMode?: boolean
}
```

### Логика переключения панелей

**Правила взаимодействия панелей:**
1. **Левая панель**: чат и свойства взаимоисключающие
2. **Правая панель**: менеджер работает независимо
3. **Автоматика**: при выборе примитива/материала в менеджере → скрыть чат, показать свойства
4. **Индикация**: активные панели визуально выделены в toggle buttons
5. **Режимы интеграции**:
   - Страница редактирования: кнопки в rightSection header
   - Модальное окно: кнопки в шапке рядом с крестиком закрытия

### Миграционные риски и решения

**Потенциальные проблемы:**
- Breaking changes при обновлении импортов ChatMessage и ChatInterface
- Дублирование LangChain логики между фичами  
- Проблемы с hot reload при рефакторинге
- Синхронизация состояния чатов
- Конфликт типов при одновременном существовании старого и нового ChatMessage
- Необходимость обновления всех адаптеров и зависимых модулей

**Решения:**
- Создать новый тип ChatMessage с расширенной функциональностью (добавить id и toolCalls?)
- Поэтапная миграция: сначала создать новый тип, затем постепенно переводить код
- Создать общий `useLangChainService` хук в shared
- Вынести tool registration в отдельные модули
- Использовать единую конфигурацию OpenAI подключений
- Обновить адаптеры (langchain/adapters.ts) только после миграции всех компонентов
- Удалить старый тип ChatMessage только на финальной стадии

## Критерии успеха

1. **Архитектурные:**
   - [ ] ChatInterface соответствует принципам FSD
   - [ ] Общая функциональность вынесена в shared/entities
   - [ ] Специфичная логика находится в соответствующих фичах

2. **Функциональные:**
   - [ ] SceneEditor сохраняет всю текущую функциональность
   - [ ] ObjectEditor получает полнофункциональный чат
   - [ ] Система управления панелями работает интуитивно

3. **Качественные:**
   - [ ] Нет регрессий в производительности
   - [ ] UX остается плавным и отзывчивым
   - [ ] Код хорошо структурирован и читаем
   - [ ] Отсутствует дублирование логики

## Связанные документы

- [Обсуждение задачи](../../agent-discussion/chatinterface-fsd-refactoring/DISCUSSION_SUMMARY.md)
- [Принципы FSD](../../docs/architecture/feature-sliced-design.md)
- [Правила агентских задач](../../docs/development/workflows/agent-tasks.md)