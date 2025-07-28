# Настройка подключений к LLM провайдерам

Документ описывает механизм хранения и выбора подключений к языковым моделям. Подключения настраиваются через компонент `OpenAISettingsModal` и сохраняются в локальную базу Dexie.

## Структура подключения

Тип `OpenAISettingsConnection` определён в `src/shared/lib/openAISettings.ts`:

```ts
export interface OpenAISettingsConnection {
  id: string
  name: string
  provider: LLMProvider
  url: string
  model: string
  apiKey: string
}
```

Провайдер выбирается из перечисления `LLMProvider` (`openrouter`, `openai`, `compatible`). Для каждого провайдера доступны предустановленные модели (`PREDEFINED_MODELS`).

## Управление подключениями

- `getAllConnections()` – возвращает список сохранённых подключений и активное подключение.
- `setActiveConnection(id)` – помечает выбранное подключение активным.
- `upsertConnection(connection)` – добавляет или обновляет запись в базе.
- `removeConnection(id)` – удаляет подключение и обновляет активное при необходимости.
- `getActiveConnection()` – возвращает активное подключение или стандартное значение по умолчанию.

База данных реализована в `SceneLibraryDB` (`src/shared/lib/database.ts`). Она хранит таблицу `connections` с идентификатором, названием, url, моделью, API‑ключом и полем `isActive`, обозначающим текущее подключение.

## Использование в UI

Модальное окно `OpenAISettingsModal` позволяет пользователю создавать несколько подключений, переключать активное и задавать параметры модели. При изменении активного подключения ChatInterface переинициализирует LangChain сервис.

## Связанные файлы

- `src/shared/lib/openAISettings.ts` – функции работы с подключениями
- `src/widgets/OpenAISettingsModal.tsx` – пользовательский интерфейс
- `src/shared/lib/database.ts` – хранилище Dexie
