# Zustand хранилища

Документ описывает, какие данные сохраняются в zustand-хранилищах по фичам.

## Scene
Хранилище `sceneStore` (`src/features/scene/store/sceneStore.ts`) оперирует состоянием редактора сцены. В нём хранится:
- **objects: SceneObject[]** – описанные в сцене объекты.
- **objectInstances: SceneObjectInstance[]** – инстансы объектов с позицией.
- **layers: SceneLayer[]** – слои сцены и их видимость.
- **lighting: LightingSettings** – настройки освещения.
- **viewMode: ViewMode** – режим перемещения камеры.
- **renderMode: RenderMode** – способ отображения сцены.
- **transformMode: TransformMode** – активный инструмент трансформации.
- **selectedObject: SelectedObject | null** – текущий выбранный объект.
- **hoveredObject: HoveredObject | null** – объект под курсором.
- **gridVisible: boolean** – отображается ли сетка.
- **currentScene: CurrentScene** – имя, uuid и статус текущей сцены.
- **history: string[]** – записи истории для undo/redo.
- **historyIndex: number** – индекс текущей записи в history.

## Object-editor
Хранилище `objectStore` (`src/features/object-editor/store/objectStore.ts`) отвечает за редактирование объектов. Оно хранит:
- **primitives: GfxPrimitive[]** – примитивы в текущем объекте.
- **lighting: LightingSettings** – локальное освещение.
- **viewMode: ViewMode** – режим камеры в редакторе.
- **renderMode: RenderMode** – отображение примитивов.
- **transformMode: TransformMode** – действующий инструмент трансформирования.
- **selectedPrimitiveId: number | null** – выделенный примитив.
- **hoveredPrimitiveId: number | null** – примитив под курсором.
