# Оптимизация производительности

Документ описывает архитектурные решения для оптимизации производительности рендеринга в Qryleth, включая систему Instanced Mesh для эффективного отображения множественных экземпляров объектов.

## Обзор

Система производительности в Qryleth построена на принципе автоматической оптимизации, где критичные улучшения применяются прозрачно для пользователя без необходимости изменения API или пользовательского кода.

### Основные стратегии оптимизации

1. **Instanced Rendering** - Автоматическое группирование одинаковых объектов
2. **Memory Management** - Правильная очистка ресурсов Three.js
3. **State Optimization** - Оптимизированные селекторы состояния
4. **Event Handling** - Эффективная обработка событий для инстансированных объектов

## Система Instanced Mesh

### Архитектурный принцип

Система Instanced Mesh реализует паттерн автоматической оптимизации, который активируется когда на сцене присутствует достаточное количество экземпляров одинакового типа объекта.

**Принцип работы:**
```
SceneObjects Component
├── Анализ объектов на сцене
├── Группировка по типу объекта (objectUuid)
├── Проверка количества экземпляров >= 3
├── Автоматическое переключение на InstancedMesh
└── Обратная совместимость с обычным рендерингом
```

### Компонентная архитектура

```typescript
/**
 * Основной компонент оптимизации, который принимает решение о типе рендеринга
 */
export const InstancedObjects: React.FC<InstancedObjectsProps>

/**
 * Компонент для составных объектов с несколькими примитивами
 */
export const CompositeInstancedGroup: React.FC<CompositeInstancedGroupProps>

/**
 * Компонент для рендеринга отдельных примитивов в InstancedMesh
 */
export const PrimitiveInstancedGroup: React.FC<PrimitiveInstancedGroupProps>

/**
 * Компонент для корректного отображения материалов в инстансах
 */
export const PrimitiveMaterial: React.FC<PrimitiveMaterialProps>
```

### Хук оптимизации

```typescript
/**
 * Хук для определения необходимости использования InstancedMesh
 * @param instances - массив экземпляров объектов
 * @returns boolean - нужно ли использовать оптимизацию
 */
export const useInstanceOptimization = (instances: SceneObjectInstance[]) => {
  return instances.length >= 3 && instances.length <= 1000
}
```

## Обработка трансформаций

### Проблема

InstancedMesh в Three.js не поддерживает прямое применение TransformControls к отдельным экземплярам, что создает сложности при редактировании.

### Решение: Helper Object Pattern

```typescript
/**
 * Паттерн для работы с TransformControls и инстансированными объектами
 * Создает вспомогательный THREE.Object3D для представления выбранного инстанса
 */
export const InstancedObjectTransform: React.FC<InstancedObjectTransformProps>
```

**Принцип работы:**
1. Создается helper object (THREE.Object3D)
2. Helper синхронизируется с позицией выбранного инстанса
3. TransformControls применяется к helper object
4. Изменения передаются обратно в store через колбэк
5. InstancedMesh обновляется с новыми трансформациями

### Архитектурная схема трансформации

```
Пользователь выбирает инстанс
         ↓
   InstancedObjectTransform создает helper object
         ↓
   TransformControls применяется к helper
         ↓
   onTransformChange → обновление store
         ↓
   PrimitiveInstancedGroup обновляет матрицы InstancedMesh
```

## Обработка событий

### Проблема совместимости

Стандартная система событий Three.js не предоставляет информацию о конкретном инстансе в InstancedMesh, что затрудняет выбор отдельных экземпляров.

### Архитектурное решение

**Иерархия обработки событий:**

```typescript
// 1. PrimitiveInstancedGroup - обработка на уровне инстанса
const handleInstanceClick = useCallback((event: any) => {
  const instanceId = event.instanceId
  const instance = instances[instanceId]
  
  // Создание синтетического события с полной информацией
  const syntheticEvent = {
    ...event,
    userData: {
      objectUuid: objectUuid,
      objectInstanceUuid: instance.uuid,
      isInstanced: true,
      instanceId: instanceId,
      layerId: sceneObject.layerId
    }
  }
  
  onClick(syntheticEvent)
}, [onClick, objectUuid, instances, sceneObject])

// 2. useSceneEvents - извлечение данных из события
const handleObjectClick = useCallback((event: ThreeEvent<MouseEvent>) => {
  const userData = event.object.userData
  
  selectObject({
    uuid: userData.objectInstanceUuid,
    objectUuid: userData.objectUuid,
    layerId: userData.layerId,
    isInstanced: userData.isInstanced
  })
}, [selectObject])
```

## Управление материалами

### Архитектурный подход

Система поддерживает два уровня материалов:
1. **Материалы примитива** (`primitive.material`) - локальные для геометрии
2. **Материалы объекта** (`objectMaterialUuid` + `materials`) - общие для объекта

### Компонент PrimitiveMaterial

```typescript
/**
 * Компонент для корректного рендеринга материалов в InstancedMesh
 * Приоритет: primitive.material > objectMaterialUuid > defaultMaterial
 */
export const PrimitiveMaterial: React.FC<{
  primitive: ScenePrimitive;
  sceneObject?: SceneObject;
  materials?: Record<string, Material>;
}>
```

**Логика выбора материала:**

```typescript
const getMaterial = () => {
  // 1. Приоритет: локальный материал примитива
  if (primitive.material) {
    return primitive.material
  }
  
  // 2. Материал объекта через UUID
  if (sceneObject?.objectMaterialUuid && materials) {
    return materials[sceneObject.objectMaterialUuid]
  }
  
  // 3. Стандартный материал
  return new MeshStandardMaterial({ color: '#ffffff' })
}
```

## Метрики производительности

### Показатели эффективности

| Метрика | Без оптимизации | С InstancedMesh | Улучшение |
|---------|----------------|-----------------|-----------|
| Draw calls | N (по количеству объектов) | 1 на тип объекта | N:1 |
| GPU память | N × размер меша | 1 × размер меша | N раз меньше |
| CPU обработка | O(N) | O(1) для рендеринга | Линейное улучшение |

### Условия активации оптимизации

```typescript
interface OptimizationThresholds {
  MIN_INSTANCES: 3     // Минимальное количество для активации
  MAX_INSTANCES: 1000  // Максимальное количество (ограничение Three.js)
  COMPLEXITY_LIMIT: 15 // Максимальная сложность одного объекта (количество примитивов)
}
```

## Ограничения и компромиссы

### Текущие ограничения

1. **Трансформация через proxy** - TransformControls работает через helper object
2. **Ограничение по количеству** - максимум 1000 экземпляров на InstancedMesh
3. **Совместимость данных** - требуется совместимость с существующей структурой SceneObjectInstance
4. **Материалы** - ограниченная поддержка динамических материалов

### Архитектурные компромиссы

---

## Террейн: оптимизации сэмплера высоты

- **Кэш высот**: `GfxHeightSampler` кэширует результаты `getHeight(x,z)` с ограничением на размер (LRU-подход) для ускорения повторных запросов.
- **Пространственный индекс**: для `TerrainOps` используется грид-индексирование, позволяющее быстро находить релевантные операции по ячейке.
- **Edge fade**: вычисляется линейно от центра к краю области террейна и применяется к итоговой высоте.
- **Bilinear**: для `heightmap` используется bilinear интерполяция пикселей `ImageData`.

**Производительность vs Гибкость:**
- ✅ Значительное улучшение производительности
- ⚠️ Ограниченные возможности индивидуальной настройки экземпляров
- ⚠️ Дополнительная сложность в обработке событий

**Совместимость vs Оптимизация:**
- ✅ Полная обратная совместимость с существующим API
- ✅ Прозрачное переключение между режимами рендеринга
- ⚠️ Дублирование логики для инстансированных и обычных объектов

## Направления развития

### Планируемые улучшения

1. **Динамические материалы** - поддержка изменения материалов во время выполнения
2. **LOD система** - интеграция с Level of Detail для дальних объектов
3. **Frustum culling** - отсечение невидимых экземпляров
4. **GPU-based animation** - анимация экземпляров на GPU

### Расширенная оптимизация

```typescript
// Будущая архитектура с поддержкой LOD и culling
interface AdvancedInstancedMesh extends InstancedMesh {
  lodLevels: LODLevel[]
  frustumCulling: boolean
  animationSupport: boolean
  dynamicMaterials: boolean
}
```

## Заключение

Система Instanced Mesh представляет собой архитектурное решение, балансирующее между производительностью и гибкостью. Автоматическое переключение на оптимизацию обеспечивает прозрачность для пользователя, а паттерн helper object решает проблемы с трансформацией экземпляров.

Основные архитектурные принципы:
1. **Автоматизация** - оптимизация активируется без вмешательства пользователя
2. **Совместимость** - полная обратная совместимость с существующим API
3. **Производительность** - значительное улучшение при рендеринге множественных объектов
4. **Расширяемость** - возможность добавления новых оптимизаций в будущем
