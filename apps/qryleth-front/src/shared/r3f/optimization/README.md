# Instanced Mesh Optimization

Модуль для оптимизации рендеринга множественных экземпляров объектов сцены с использованием Three.js InstancedMesh.

## Основные компоненты

### `InstancedObjects`

Основной компонент для рендеринга оптимизированных экземпляров объектов.

**Props:**
- `objects: SceneObject[]` - Список объектов сцены
- `instances: SceneObjectInstance[]` - Экземпляры объектов
- `layers: SceneLayer[]` - Слои сцены
- `minimumInstancesForOptimization?: number` - Минимальное количество экземпляров для оптимизации (по умолчанию: 3)
- `onClick?: (event: any) => void` - Обработчик клика
- `onHover?: (event: any) => void` - Обработчик ховера

**Особенности:**
- Автоматически группирует экземпляры по типу объекта
- Применяет оптимизацию только к объектам с достаточным количеством экземпляров
- Поддерживает составные объекты (с несколькими примитивами)
- Учитывает видимость слоев, объектов и экземпляров
- **Поддерживает материалы примитивов** - каждый примитив использует свой материал
 - **Realtime трансформации InstancedMesh** — во время перетаскивания gizmo изменения видны сразу без записи в глобальный store

### `useInstanceOptimization`

Хук для проверки, должен ли объект использовать инстансинг.

**Параметры:**
- `objectUuid: string` - UUID объекта
- `instanceCounts: Record<string, number>` - Количество экземпляров по объектам
- `minimumInstances: number` - Минимальное количество экземпляров

**Возвращает:** `boolean` - следует ли использовать инстансинг

### `ConditionalInstancedObject`

Компонент для условного рендеринга экземпляров vs отдельных объектов.

**Props:**
- `objectUuid: string` - UUID объекта
- `instance: SceneObjectInstance` - Экземпляр объекта
- `instanceIndex: number` - Индекс экземпляра
- `minimumInstancesForOptimization?: number` - Минимальное количество экземпляров
- `objects: SceneObject[]` - Список объектов
- `layers: SceneLayer[]` - Слои сцены
- `instanceCounts: Record<string, number>` - Количество экземпляров
- `children: React.ReactNode` - Дочерние элементы для рендеринга

### `CompositeInstancedGroup`

Компонент для обработки составных объектов с несколькими примитивами.

**Особенности:**
- Создает отдельный `InstancedMesh` для каждого примитива объекта
- Правильно комбинирует трансформации экземпляра и примитива
- Обрабатывает события на уровне группы объектов
- **Поддерживает индивидуальные материалы для каждого примитива**

### `PrimitiveInstancedGroup`

Компонент для обработки одного примитива с инстансингом.

**Особенности:**
- Использует `@react-three/drei` `Instances` и `Instance`
- Применяет комбинированные трансформации
- **Рендерит геометрию и материал примитива**

## Realtime-трансформации InstancedMesh

Для мгновенного визуального отклика при трансформации отдельных инстансов через gizmo используется локальный контекст переопределений трансформаций:

- Провайдер: `InstancedTransformProvider`
- Хук: `useInstancedTransformOverrides`
- Источник данных в рендере: если существует `overrides[instanceUuid]`, он имеет приоритет над `instance.transform` из Zustand

Поток изменений:
- Событие `change` у `TransformControls` → компонент `InstancedObjectTransform` пишет текущие значения трансформации в `setOverride(instanceUuid, transform)`.
- Компонент `InstancedObjects` читает override и немедленно отображает трансформацию в рендере.
- Событие `dragging-changed = false` (отпускание мыши) → итоговая трансформация сохраняется в Zustand store и `clearOverride(instanceUuid)` очищает временное состояние.

Интеграция провайдера (пример):

```tsx
import { InstancedTransformProvider } from '@/shared/r3f/optimization/InstancedTransformContext'

<InstancedTransformProvider>
  <SceneObjects />
  {uiMode === UiMode.Edit && <ObjectTransformGizmo />}
</InstancedTransformProvider>
```

## Корректная композиция трансформаций (центр вращения)

Чтобы примитивы инстанса вращались вокруг геометрического центра инстанса (а не вокруг собственных центров), используется правильная композиция трансформаций дочернего узла относительно родителя:

- Позиция: `worldPos = instance.pos + R(instance) * ( S(instance) * primitive.pos )`
- Поворот: `Qfinal = Qinstance * Qprimitive`
- Масштаб: `Sfinal = Sinstance ⊙ Sprimitive`

Эта логика реализована в утилите `combineTransforms`, что устраняет эффект «раскручивания» примитивов вокруг их локальных центров при повороте инстанса.

## Поддержка материалов

### `PrimitiveGeometry`

Компонент для рендеринга геометрии примитивов в `Instances`.

**Поддерживаемые типы:**
- `box` - Параллелепипед
- `sphere` - Сфера
- `cylinder` - Цилиндр
- `cone` - Конус
- `pyramid` - Пирамида
- `plane` - Плоскость

### `PrimitiveMaterial`

Компонент для рендеринга материалов примитивов в `Instances`.

**Логика выбора материала:**
1. **Локальный материал примитива** - если есть `primitive.material`
2. **Материал на уровне объекта** - если есть `primitive.objectMaterialUuid`, ищется в `object.materials`
3. **Дефолтный материал** - если ничего не найдено

**Поддерживаемые свойства материала:**
- `color: string` - Цвет материала
- `opacity: number` - Прозрачность
- `emissive: string` - Эмиссионный цвет
- `emissiveIntensity: number` - Интенсивность эмиссии
- `metalness: number` - Металличность (для материалов объекта)
- `roughness: number` - Шероховатость (для материалов объекта)

**Примеры использования:**

```tsx
// 1. Локальный материал примитива
{
  uuid: 'table-top',
  type: 'box',
  geometry: { width: 2, height: 0.1, depth: 1 },
  material: {
    color: '#8B4513', // Коричневый цвет дерева
    opacity: 1
  },
  transform: { position: [0, 0.5, 0] }
}

// 2. Материал на уровне объекта
{
  uuid: 'tree-trunk',
  type: 'cylinder',
  geometry: { radiusTop: 0.2, radiusBottom: 0.5, height: 3 },
  objectMaterialUuid: 'mat-tree-trunk', // Ссылка на материал объекта
  transform: { position: [0, 1.5, 0] }
}

// Объект с материалами
{
  uuid: 'tree-object',
  name: 'Дерево',
  primitives: [/* ... */],
  materials: [
    {
      uuid: 'mat-tree-trunk',
      name: 'Кора',
      properties: {
        color: '#8B4513',
        roughness: 0.8,
        metalness: 0.2
      }
    },
    {
      uuid: 'mat-tree-crown',
      name: 'Листва',
      properties: {
        color: '#228B22',
        opacity: 1,
        transparent: true
      }
    }
  ]
}
```

## Ограничения

- ~~Поддержка только объектов с одним примитивом~~ **УДАЛЕНО - теперь поддерживаются составные объекты**
- Минимальное количество экземпляров для оптимизации (по умолчанию: 3)
- Ограничение на максимальное количество экземпляров (1000)
- События обрабатываются на уровне группы объектов, а не отдельных экземпляров

## Будущие улучшения

- ~~Поддержка составных объектов (с несколькими примитивами)~~ **РЕАЛИЗОВАНО**
- ~~Поддержка материалов примитивов~~ **РЕАЛИЗОВАНО**
- Поддержка анимаций для инстансированных объектов
- Оптимизация для динамического изменения количества экземпляров
- Поддержка LOD (Level of Detail) для инстансированных объектов
- Расширенная поддержка материалов (PBR, текстуры)
