# LLM Agent Integration / Взаимодействие LLM-агента с редактором

## Overview / Обзор

This document describes how the language model interacts with Qryleth and what rules must be followed.

Документ описывает, как языковая модель взаимодействует с Qryleth и какие правила необходимо соблюдать.

---

## How It Works / Принцип работы

- The `ChatInterface` component sends user messages through the `fetchWithTools` function from `src/shared/lib/openAIAPI.ts`
- The model receives tool definitions from the `AVAILABLE_TOOLS` constant and can call them via `tool_calls`
- The request result contains a text response and, when necessary, a set of tool calls (`ToolCall`)
- The logic for processing `ToolCall` is implemented in the UI (see `handleToolCalls` in `ChatInterface`). It calls public actions from zustand stores or callbacks passed in props
- The agent doesn't modify the DOM directly and doesn't access internal component state

---

**Russian / На русском:**

- Компонент `ChatInterface` отправляет сообщения пользователя через функцию `fetchWithTools` из `src/shared/lib/openAIAPI.ts`
- Модель получает определение инструментов из константы `AVAILABLE_TOOLS` и может вызывать их посредством `tool_calls`
- Результат запроса содержит текстовый ответ и, при необходимости, набор вызовов инструментов (`ToolCall`)
- Логика обработки `ToolCall` реализована в UI (см. `handleToolCalls` в `ChatInterface`). Она вызывает публичные actions zustand‑сторов или переданные в пропсы коллбеки
- Агент не изменяет DOM напрямую и не обращается к внутреннему состоянию компонентов

---

## Contract / Контракт

Data structures for communication with the model are defined in `openAIAPI.ts`:

- `ChatMessage` – role, text, and message timestamp
- `Tool` – description of a tool that can be called by the model
- `ToolCall` – actual call with function name and arguments
- `ChatResponse` – model response containing text and list of `ToolCall`

Currently supported tool: `add_new_object` with parameters described in `AVAILABLE_TOOLS`.

**Rules:**
- The model must pass arguments in JSON format matching tool parameter schemas. Invalid format is considered an error
- All scene manipulations must be performed through public store functions or component props (e.g., `onObjectAdded`)

---

**Russian / На русском:**

Структуры данных для общения с моделью определены в `openAIAPI.ts`:

- `ChatMessage` – роль, текст и время сообщения
- `Tool` – описание инструмента, который может быть вызван моделью
- `ToolCall` – фактический вызов с именем функции и аргументами
- `ChatResponse` – ответ модели, содержащий текст и список `ToolCall`

На данный момент поддерживается инструмент `add_new_object` с параметрами, описанными в `AVAILABLE_TOOLS`.

**Правила:**
- Модель обязана передавать аргументы в формате JSON, соответствующем схемам параметров инструментов. Неверный формат считается ошибкой
- Все манипуляции со сценой должны выполняться через публичные функции стора или пропсы компонентов (например, `onObjectAdded`)

---

## Example Sequence / Пример последовательности

**English:**
1. User sends a request to the chat
2. `ChatInterface` adds the message to the list and calls `fetchWithTools` with accumulated message history and tools
3. In the response, the model can return `tool_calls`. For `add_new_object`, the UI creates an object and reports successful action with a separate message

**Russian:**
1. Пользователь отправляет запрос в чат
2. `ChatInterface` добавляет сообщение в список и вызывает `fetchWithTools` с накопленной историей сообщений и инструментами
3. В ответе модель может вернуть `tool_calls`. Для `add_new_object` UI создаёт объект и сообщает об успешном действии отдельным сообщением

---

## Architecture Compliance / Соответствие архитектуре

This approach guarantees that agents work predictably and don't violate application architectural boundaries.

Такой подход гарантирует, что агенты работают предсказуемо и не нарушают архитектурные границы приложения.

## Related Files / Связанные файлы

- `src/shared/lib/openAIAPI.ts` - API integration
- `features/ai-assistant/hooks/useAICommands.ts` - Command mapping
- [Design Principles](../../architecture/design-principles.md) - Architecture guidelines