# Основные типы приложения

Документ описывает ключевые структуры данных, применяемые во всех модулях Qryleth. Типы сгруппированы по доменным областям.

## Общие типы (shared)
- **Vector3** – представление трехмерного вектора `[x, y, z]`. Используется для координат и углов вращения. Источник: `src/shared/types/vector3.ts`.
- **Transform** – позиция, вращение и масштаб объекта. Применяется к инстансам и примитивам. Источник: `src/shared/types/transform.ts`.

## Примитивы и объекты (entities)
- **GfxPrimitive** – описание базового графического примитива: тип (box, sphere и т. д.), размеры и материал. Применяется при построении объектов. Источник: `src/entities/primitive/model/types.ts`.
- **GfxObject** – набор примитивов с уникальным `uuid` и названием. Представляет сохранённый объект в библиотеке. Источник: `src/entities/object/model/types.ts`.
- **GfxObjectInstance** – экземпляр объекта на сцене с собственным `transform`. Источник: `src/entities/objectInstance/model/types.ts`.
- **GfxLayer** – слой сцены: может содержать объекты или landscape‑поверхность. Источник: `src/entities/layer/model/types.ts`.

## Сцена
- **SceneObject** – расширение `GfxObject` с указанием слоя и флага видимости. Источник: `src/entities/scene/types.ts`.
- **SceneObjectInstance** – экземпляр `GfxObjectInstance` c флагом видимости. Источник: `src/entities/scene/types.ts`.
- **SceneLayer** – слой сцены с положением и признаком видимости. Источник: `src/entities/scene/types.ts`.
- **LightingSettings** – параметры фонового и направленного освещения. Источник: `src/entities/scene/types.ts`.

## Типы r3f и состояния сцен
- **SelectedObject / HoveredObject** – состояние выделения объектов на канвасе. Источник: `src/entities/r3f/types.ts`.
- **ViewMode / RenderMode / TransformMode** – режимы управления камерой, отображения и трансформаций. Источник: `src/entities/r3f/types.ts`.
- **SceneStatus / CurrentScene** – метаданные текущей сцены (черновик, сохранено и т. д.). Источник: `src/entities/r3f/types.ts`.
- **SceneClickEvent / SceneHoverEvent / ObjectTransformEvent / PrimitiveTransformEvent** – события взаимодействия с объектами на канвасе. Источник: `src/entities/r3f/types.ts`.
- **SceneStoreState / SceneStoreActions / SceneStore** – интерфейсы Zustand‑хранилища сцены. Источник: `src/entities/r3f/types.ts`.

## Интеграция с ИИ
- **ChatMessage, Tool, ToolCall, ChatResponse** – типы для общения с LLM и использования инструментов. Источник: `src/shared/lib/openAIAPI.ts`.
- **LLMProvider, OpenAISettingsConnection** – описание подключений к различным LLM‑поставщикам. Источник: `src/shared/lib/openAISettings.ts`.

## Хранилище данных (Dexie)
- **SceneRecord, ObjectRecord** – записи сцен и объектов в IndexedDB. Источник: `src/shared/lib/database.ts`.
- **SceneObjectRelation** – связь объекта со сценой и его трансформациями. Источник: `src/shared/lib/database.ts`.
- **ConnectionRecord, SettingsRecord** – параметры подключений к LLM и прочие настройки. Источник: `src/shared/lib/database.ts`.

