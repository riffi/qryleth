# Библиотека компонентов

Набор переиспользуемых React‑компонентов, используемых в различных частях Qryleth.

## Основные файлы

```text
src/shared/entities/chat/ui/   # Общие компоненты чата (ChatContainer, ChatInput, ChatMessageItem)
src/shared/ui/                 # Общие модальные окна и элементы управления
src/features/scene/ui/         # Компоненты редактора сцен (включая SceneChatInterface)
src/features/editor/object/ui/ # Компоненты редактора объектов (включая ObjectChatInterface, панели)
```

Каждый компонент оформлен в виде отдельного файла с типами и экспортируется через `index.ts` своего каталога.

## Система карточек объектов

### Shared UI компоненты (базовые)

- **BaseCard** (`src/shared/ui/Card/BaseCard.tsx`) — базовая карточка с единообразным стилем
- **PreviewImage** (`src/shared/ui/PreviewImage/PreviewImage.tsx`) — компонент превью изображения с fallback состояниями, поддерживает квадратную форму и адаптацию под родительский контейнер
- **MetadataBadges** (`src/shared/ui/MetadataBadges/MetadataBadges.tsx`) — группа бейджей для отображения метаданных
- **ActionButtons** (`src/shared/ui/ActionButtons/ActionButtons.tsx`) — набор кнопок действий с поддержкой иконок и тултипов
- **VirtualizedGrid** (`src/shared/ui/VirtualizedGrid/VirtualizedGrid.tsx`) — универсальная виртуализированная сетка для больших списков

### Entity компоненты

- **ObjectCard** (`src/entities/object/ui/ObjectCard/ObjectCard.tsx`) — карточка объекта, использует композицию shared компонентов, знает о типе GfxObject

### Feature компоненты

- **LibraryObjectCard** (`src/features/object-library/ui/LibraryObjectCard/LibraryObjectCard.tsx`) — карточка объекта библиотеки с интерактивным 3D превью при наведении
- **HoverInteractivePreview** (`src/features/object-library/ui/LibraryObjectCard/HoverInteractivePreview.tsx`) — интерактивное 3D превью с облётом камеры
- **VirtualizedObjectGrid** (`src/features/object-library/ui/VirtualizedObjectGrid/VirtualizedObjectGrid.tsx`) — виртуализированная сетка объектов библиотеки

### Архитектурные принципы

Система карточек построена по принципам Feature-Sliced Design:
- **Shared** — чистые UI компоненты без доменной логики
- **Entities** — компоненты, знающие о доменных типах (GfxObject)
- **Features** — специфичная логика (hover-превью, действия библиотеки)

## Новые компоненты Chat системы

### Shared Chat Components (`src/shared/entities/chat/ui/`)

После рефакторинга ChatInterface были созданы переиспользуемые компоненты:

- **ChatContainer** - основной контейнер для чата с поддержкой автоскролла
- **ChatInput** - поле ввода сообщений с кнопкой отправки  
- **ChatMessageItem** - отображение отдельного сообщения с поддержкой ролей и timestamp

### Feature-специфичные ChatInterface

- **SceneChatInterface** (`features/scene/ui/ChatInterface/`) - чат для работы со сценами
- **ObjectChatInterface** (`features/editor/object/ui/ChatInterface/`) - чат для редактирования объектов

### Система панелей ObjectEditor

- **Toolbars** (`features/editor/object/toolbar/`) — вертикальные тулбары ObjectEditor (левая: чат/свойства, правая: менеджер)
- **ObjectEditorLayout** (`widgets/ObjectEditor/Layout/`) — layout виджета с поддержкой переключаемых панелей и ресайза

