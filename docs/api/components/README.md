# Библиотека компонентов

Набор переиспользуемых React‑компонентов, используемых в различных частях Qryleth.

## Основные файлы

```text
src/shared/entities/chat/ui/   # Общие компоненты чата (ChatContainer, ChatInput, ChatMessageItem)
src/shared/ui/                 # Общие модальные окна и элементы управления
src/features/scene/ui/         # Компоненты редактора сцен (включая SceneChatInterface)
src/features/object-editor/ui/ # Компоненты редактора объектов (включая ObjectChatInterface, панели)
```

Каждый компонент оформлен в виде отдельного файла с типами и экспортируется через `index.ts` своего каталога.

## Превью объектов (библиотека)

- **ObjectPreviewCard** (`src/shared/ui/ObjectPreviewCard/ObjectPreviewCard.tsx`) — карточка объекта с PNG превью и интерактивным hover‑препросмотром. См. подробности: `docs/api/components/object-preview-card.md`.
- **HoverInteractivePreview** (`src/shared/ui/ObjectPreviewCard/HoverInteractivePreview.tsx`) — сцена R3F для облёта камеры вокруг объекта при наведении.

## Новые компоненты Chat системы

### Shared Chat Components (`src/shared/entities/chat/ui/`)

После рефакторинга ChatInterface были созданы переиспользуемые компоненты:

- **ChatContainer** - основной контейнер для чата с поддержкой автоскролла
- **ChatInput** - поле ввода сообщений с кнопкой отправки  
- **ChatMessageItem** - отображение отдельного сообщения с поддержкой ролей и timestamp

### Feature-специфичные ChatInterface

- **SceneChatInterface** (`features/scene/ui/ChatInterface/`) - чат для работы со сценами
- **ObjectChatInterface** (`features/object-editor/ui/ChatInterface/`) - чат для редактирования объектов

### Система панелей ObjectEditor

- **PanelToggleButtons** (`features/object-editor/ui/PanelToggleButtons/`) - кнопки переключения панелей
- **ObjectEditorLayout** (`features/object-editor/ui/ObjectEditorLayout/`) - layout с поддержкой переключаемых панелей
