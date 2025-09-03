# Обзор системы типов

Полное руководство по унифицированной системе типов Qryleth, основанной на принципах Feature-Sliced Design.

---

## Оглавление

- [Обзор архитектуры](#обзор-архитектуры)
- [Категории типов](#категории-типов)
  - [Нотация имён типов](#нотация-имён-типов)
  - [Доменные типы (`@/entities`)](#1--доменные-типы-entities)
    - [GfxPrimitive](#gfxprimitive)
    - [GfxMaterial](#gfxmaterial)
    - [GfxObject](#gfxobject-с-группами-и-материалами)
    - [GfxObjectInstance](#gfxobjectinstance)
    - [LightingSettings](#lightingsettings)
    - [Типы сцены](#типы-сцены-scene)
    - [Слои сцены (перечень типов)](#слои-сцены-перечень-типов)
    - [Террейн (перечень типов)](#террейн-перечень-типов)
    - [Биомы (перечень типов)](#биомы-перечень-типов)
  - [Базовые утилиты (`@/shared/types/core`)](#2--базовые-утилиты-sharedtypescorer)
  - [UI типы (`@/shared/types/ui`)](#3--ui-типы-sharedtypesui)
- [Паттерны импортов](#паттерны-импортов)
- [Архитектурные правила](#архитектурные-правила)
- [Руководство по миграции](#руководство-по-миграции)
- [Инструменты и автоматизация](#инструменты-и-автоматизация)
- [Заключение](#заключение)
- [Связанная документация](#связанная-документация)

---

## Обзор архитектуры

Все типы в проекте организованы согласно принципам **Feature-Sliced Design (FSD)**:
```
src/
├── entities/           # Доменные сущности
│   ├── primitive/      # GfxPrimitive и геометрии
│   ├── primitiveGroup/ # GfxPrimitiveGroup и утилиты
│   ├── object/         # GfxObject
│   ├── objectInstance/ # GfxObjectInstance
│   ├── layer/          # GfxLayer
│   ├── terrain/        # GfxTerrainConfig, GfxHeightSampler, источники
│   ├── lighting/       # LightingSettings и источники света
│   ├── material/       # GfxMaterial
│   ├── scene/          # SceneData и производные
│   └── index.ts        # Barrel-экспорт всех entities
├── shared/             # Переиспользуемые типы и утилиты
│   ├── types/          # Vector3, Transform, BoundingBox, UI-типы
│   ├── api/
│   └── lib/r3f/
└── features/           # Типы бизнес-логики
├── scene/model/
└── object-editor/
```

---

## Категории типов

### Нотация имён типов

- `Gfx*` — базовые графические домены и сущности рендера (например, `GfxPrimitive`, `GfxObject`, `GfxLayer`, `GfxMaterial`, `GfxTerrainConfig`).
- `Scene*` — сценовые проекции/агрегаты, расширяющие `Gfx*` (например, `SceneObject` расширяет `GfxObject`, `SceneLayer` расширяет `GfxLayer`).
- Shared типы без префикса (`Vector3`, `Transform`, `BoundingBox`, `ViewMode` и т.д.).
- Не смешивать префиксы (избегать форм типа `GfxScene*`).

### 1. 🏗️ Доменные типы (`@/entities`)


**Назначение**: Бизнес-доменные сущности приложения  
**Импорт**: `import type { ... } from '@/entities'`

```typescript
// Основные доменные типы
import type { 
  GfxPrimitive,      // 3D примитивы (box, sphere, cylinder и т.п.)
  GfxPrimitiveGroup, // Группы примитивов с поддержкой иерархии
  GfxObject,         // Составные 3D‑объекты
  GfxObjectInstance, // GfxObject инстансы
  GfxLayer,          // Слои сцены
  // 🆕 Террейн: конфигурация и сэмплер высот
  GfxTerrainConfig,  // Конфигурация террейна слоя (perlin, heightmap, ops)
  GfxHeightSampler,  // Единый интерфейс получения высот/нормалей для рендера и размещения
  GfxMaterial,       // Определения материалов
  LightingSettings,   // Настройки освещения
  SceneData, // данные сцены
} from '@/entities'

// Специфичные entity‑типы
import type { GfxPrimitive } from '@/entities/primitive'
import type { GfxObject } from '@/entities/object'
import type { GfxPrimitiveGroup } from '@/entities/primitiveGroup'
import type { GfxMaterial } from '@/entities/material'
import type { SceneObjectInstance } from '@/entities/scene/types'
```


### GfxPrimitive

Структура примитива использует дискриминированное объединение с четким разделением геометрии, материала и трансформаций:

```typescript
type GfxPrimitive =
  | ({ type: 'box';      geometry: BoxGeometry;      } & PrimitiveCommon)
  | ({ type: 'sphere';   geometry: SphereGeometry;   } & PrimitiveCommon)
  | ({ type: 'cylinder'; geometry: CylinderGeometry; } & PrimitiveCommon)
  | ({ type: 'cone';     geometry: ConeGeometry;     } & PrimitiveCommon)
  | ({ type: 'pyramid';  geometry: PyramidGeometry;  } & PrimitiveCommon)
  | ({ type: 'plane';    geometry: PlaneGeometry;    } & PrimitiveCommon)
  | ({ type: 'torus';    geometry: TorusGeometry;    } & PrimitiveCommon);

interface PrimitiveCommon {
  uuid: string;         // 🆕 ОБЯЗАТЕЛЬНОЕ поле для поддержки групп
  name?: string;
  visible?: boolean;    // 🆕 Видимость примитива
  // Устаревшая поддержка материалов (deprecated)
  material?: {
    color?: string;
    opacity?: number;
    emissive?: string;
    emissiveIntensity?: number;
  };
  // Новая система материалов
  objectMaterialUuid?: string;  // Ссылка на материал объекта
  globalMaterialUuid?: string;  // Ссылка на глобальный материал
  transform?: {
    position?: Vector3;
    rotation?: Vector3;
    scale?: Vector3;
  };
}
```

#### Геометрические интерфейсы

Каждый тип примитива имеет специфичный интерфейс геометрии:

- **BoxGeometry**: `width`, `height`, `depth`
- **SphereGeometry**: `radius`
- **CylinderGeometry**: `radiusTop`, `radiusBottom`, `height`, `radialSegments?`
- **ConeGeometry**: `radius`, `height`, `radialSegments?`
- **PyramidGeometry**: `baseSize`, `height`
- **PlaneGeometry**: `width`, `height`
- **TorusGeometry**: `majorRadius`, `minorRadius`, `radialSegments?`, `tubularSegments?`

### GfxMaterial

Материал объекта в терминах PBR, совместим с Three.js MeshStandardMaterial. Поддерживает глобальные материалы.

```typescript
interface GfxMaterial {
  /** Уникальный идентификатор материала */
  uuid: string
  /** Название материала */
  name: string
  /** Тип материала для категоризации */
  type: 'metal' | 'dielectric' | 'glass' | 'emissive' | 'custom'

  /** Свойства материала совместимые с MeshStandardMaterial */
  properties: {
    color: string                // цвет (hex)
    opacity?: number             // 0.0–1.0
    transparent?: boolean
    metalness?: number           // 0.0–1.0
    roughness?: number           // 0.0–1.0
    emissive?: string            // цвет эмиссии (hex)
    emissiveIntensity?: number
    ior?: number                 // индекс преломления
    envMapIntensity?: number
    side?: 'front' | 'back' | 'double'
    alphaTest?: number
    castShadow?: boolean
    receiveShadow?: boolean
  }

  /** Глобальный материал (доступен во всех сценах) */
  isGlobal: boolean
  /** Описание материала */
  description?: string
}
```

#### Система ссылок на материалы

Примитивы могут ссылаться на материалы тремя способами (в порядке приоритета):

1. **Прямой материал** (`material`) - для обратной совместимости
2. **Материал объекта** (`objectMaterialUuid`) - материал из `GfxObject.materials`
3. **Глобальный материал** (`globalMaterialUuid`) - из глобального реестра

```typescript
// Пример использования материалов в примитиве
const primitiveWithMaterial: GfxPrimitive = {
  uuid: '456e7890-e12b-34d5-a678-901234567890', // Обязательное поле
  type: 'box',
  geometry: { width: 1, height: 1, depth: 1 },
  objectMaterialUuid: '123e4567-e89b-12d3-a456-426614174000',
  transform: { position: [0, 0, 0] }
}
```

### GfxPrimitiveGroup

Система группировки примитивов с поддержкой иерархической структуры:

```typescript
interface GfxPrimitiveGroup {
  uuid: string;                    // Уникальный идентификатор группы
  name: string;                    // Отображаемое имя группы
  visible?: boolean;               // Видимость группы (по умолчанию true)
  parentGroupUuid?: string;        // UUID родительской группы для иерархии
  sourceObjectUuid?: string;       // UUID исходного объекта при импорте
  transform?: {                    // Трансформация группы
    position?: Vector3;
    rotation?: Vector3;
    scale?: Vector3;
  };
}
```

#### Принципы работы с группами

1. **Иерархическая структура**: Группы могут содержать подгруппы через `parentGroupUuid`
2. **Привязка примитивов**: Примитивы привязываются к группам через `primitiveGroupAssignments`
3. **Наследование видимости**: Дочерние группы наследуют видимость родительских
4. **Импорт объектов**: При импорте сохраняется исходная структура групп

```typescript
// Пример создания иерархической структуры
const groups: Record<string, GfxPrimitiveGroup> = {
  'foundation-uuid': {
    uuid: 'foundation-uuid',
    name: 'Фундамент',
    visible: true
  },
  'walls-uuid': {
    uuid: 'walls-uuid', 
    name: 'Стены',
    visible: true,
    parentGroupUuid: 'foundation-uuid' // Дочерняя группа
  }
}

// Привязка примитивов к группам
const primitiveGroupAssignments: Record<string, string> = {
  'primitive-1-uuid': 'foundation-uuid',
  'primitive-2-uuid': 'walls-uuid'
}
```

### GfxObject с группами и материалами

```typescript
interface GfxObject {
  uuid: string;
  name: string;
  primitives: GfxPrimitive[];       // Примитивы с обязательными UUID
  
  // 🆕 Новые опциональные поля для группировки
  primitiveGroups?: Record<string, GfxPrimitiveGroup>;     // uuid -> группа
  primitiveGroupAssignments?: Record<string, string>;      // primitiveUuid -> groupUuid
  
  // Существующие поля
  materials?: GfxMaterial[];        // Материалы объекта
  boundingBox?: BoundingBox;
  /** Локальное освещение, перемещающееся вместе с объектом */
  localLights?: {
    point: PointLightSettings[]
    spot: SpotLightSettings[]
  }
}
```

#### Работа с группами в объектах

```typescript
// Создание объекта с группами
const houseObject: GfxObject = {
  uuid: 'house-uuid',
  name: 'Дом',
  primitives: [
    { uuid: 'foundation-primitive', type: 'box', geometry: { width: 10, height: 1, depth: 10 } },
    { uuid: 'wall-primitive', type: 'box', geometry: { width: 10, height: 3, depth: 0.2 } }
  ],
  primitiveGroups: {
    'foundation-group': {
      uuid: 'foundation-group',
      name: 'Фундамент'
    },
    'walls-group': {
      uuid: 'walls-group', 
      name: 'Стены',
      parentGroupUuid: 'foundation-group'
    }
  },
  primitiveGroupAssignments: {
    'foundation-primitive': 'foundation-group',
    'wall-primitive': 'walls-group'
  }
}
```

### GfxObjectInstance

Экземпляр объекта в сцене с собственной трансформацией.

```typescript
interface GfxObjectInstance {
  uuid: string
  objectUuid: string
  transform?: Transform
}
```

---

### LightingSettings

Корневые настройки освещения и окружения сцены.

```typescript
interface LightingSettings {
  ambient?: AmbientLightSettings
  directional?: DirectionalLightSettings
  ambientOcclusion?: {
    enabled?: boolean
    intensity?: number
    radius?: number
  }
  fog?: FogSettings
  sky?: SkySettings
  backgroundColor?: string
  exposure?: number
}
```

См. подробные типы источников света в исходниках: `apps/qryleth-front/src/entities/lighting/model/types.ts`.

---

### Типы сцены (Scene)

```typescript
interface SceneObject extends GfxObject {
  layerId?: string
  visible?: boolean           // видимость всех инстансов объекта
  libraryUuid?: string        // UUID в библиотеке, если добавлен из неё
}

interface SceneObjectInstance extends GfxObjectInstance {
  visible?: boolean
}

interface SceneLayer extends GfxLayer {
  visible: boolean
  position: number
}

interface SceneData {
  objects: SceneObject[]
  objectInstances: SceneObjectInstance[]
  layers: SceneLayer[]
  lighting: LightingSettings
}

type SceneStatus = 'draft' | 'saved' | 'modified'

interface SceneMetaData {
  uuid?: string
  name: string
  status: SceneStatus
}
```

#### Слои сцены (перечень типов)

- Назначение: базовые типы, описывающие слой (Layer) в графической модели и его формы.
- Ключевые типы: `GfxLayer`, перечисления `GfxLayerType`, `GfxLayerShape`.
- Где читать подробно: [Слои сцены](layers.md).

#### Террейн (перечень типов)

- Назначение: система рельефа — источники высот, локальные операции, единый сэмплер.
- Ключевые типы: `GfxTerrainConfig`, `GfxHeightSampler`, `GfxTerrainOp` (и производные), спецификации генерации.
- Где читать подробно: [Террейн](terrain.md).

### 2. 🔧 Базовые утилиты (`@/shared/types/core`)

**Назначение**: Базовые утилитарные типы для всего приложения  
**Импорт**: `import type { ... } from '@/shared/types/core'`

```typescript
// Математические типы
import type { 
  Vector3,        // [x, y, z] координаты
  Transform       // Позиция, поворот, масштаб
} from '@/shared/types/core'

// Использование
const moveObject = (position: Vector3, offset: Vector3): Vector3 => {
  return [
    position[0] + offset[0],
    position[1] + offset[1], 
    position[2] + offset[2]
  ]
}

const applyTransform = (transform: Transform) => {
  const { position, rotation, scale } = transform
  // Применение трансформации
}
```

### 3. 🎨 UI типы (`@/shared/types/ui`)


**Назначение**: Типы для пользовательского интерфейса  
**Импорт**: `import type { ... } from '@/shared/types/ui'`

```typescript
// UI состояние и события
import type { 
  ViewMode,              // 'orbit' | 'walk' | 'fly'
  RenderMode,            // 'solid' | 'wireframe'
  TransformMode,         // 'translate' | 'rotate' | 'scale'
  SelectedObject,        // Выбранный объект
  HoveredObject,         // Объект под курсором
  SceneClickEvent,       // Клик по сцене
  ObjectTransformEvent   // Трансформация объекта
} from '@/shared/types/ui'
```

См. также разделы: [Слои сцены](layers.md), [Террейн](terrain.md) и [Сторы](../stores/README.md).

---

## Паттерны импортов

### ✅ Рекомендуемые паттерны

```typescript
// 1. Предпочтительно (barrel exports)
import type { GfxPrimitive, GfxObject } from '@/entities'
import type { ViewMode, SelectedObject } from '@/shared/types/ui'
import type { SceneStore } from '@/features/editor/scene/model'

// 2. Когда нужна точность (точечные импорты)
import type { GfxPrimitive } from '@/entities/primitive'
import type { SceneRecord } from '@/shared/api'

// 3. Импорты только типов (всегда для типов)
import type { ... } from '...'  // ✅ Верно
import { type ... } from '...'  // ✅ Тоже верно
```

### ❌ Избегайте

```typescript
// 1. Относительные пути
import type { GfxPrimitive } from '../../../entities/primitive'  // ❌

// 2. Смешанные импорты тип/значение без ключевого слова type
import { GfxPrimitive } from '@/entities'  // ❌ (если только тип)

// 3. Импорты из недоступных слоёв
import type { SceneStore } from '@/features/editor/scene/model'  // ❌ в слое entities
```

---

## Архитектурные правила

### 📋 Правила доступа слоев

```
shared/      ← НЕ МОЖЕТ импортировать слои выше (самодостаточен)
   ↑
entities/    ← может импортировать общие типы из shared
   ↑  
features/    ← может импортировать из shared и entities
   ↑
app/         ← может импортировать из всех слоёв
```

### 🚫 Запрещенные импорты

- **entities** → features ❌
- **shared** → любой слой выше ❌
- **shared** → entities ❌
- **shared** → features ❌
- Циклические зависимости ❌

### ✅ Разрешенные импорты

- **entities** → shared ✅ (общие типы)
- **features** → entities ✅
- **features** → shared ✅
- **app** → любой слой ✅

---

## Руководство по миграции

### При добавлении новых типов

1. **Определите слой** согласно FSD:
   - Доменная логика → `entities/`
   - Переиспользуемые утилиты → `shared/`
   - Бизнес‑логика → `features/`

2. **Создайте тип в нужном месте**:
   ```typescript
   // entities/newEntity/model/types.ts
   export interface NewEntity {
     id: string
     // ...
   }
   ```

3. **Добавьте в barrel‑экспорт**:
   ```typescript
   // entities/newEntity/index.ts
   export type { NewEntity } from './model/types'
   
   // entities/index.ts
   export * from './newEntity'
   ```

4. **Обновите документацию** при необходимости

---

## Инструменты и автоматизация

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/entities": ["src/entities"],
      "@/entities/*": ["src/entities/*"],
      "@/shared": ["src/shared"],
      "@/shared/*": ["src/shared/*"],
      "@/features": ["src/features"],
      "@/features/*": ["src/features/*"]
    }
  }
}
```

### Lint Rules (рекомендуется)

```json
// .eslintrc.json
{
  "rules": {
    "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
    "import/no-relative-parent-imports": "error"
  }
}
```

---

## Заключение


Унифицированная система типов обеспечивает:

- 🏗️ **Чистота архитектуры** — соответствие принципам FSD
- 📦 **Удобство использования** — понятные barrel‑экспорты  
- 🔄 **Сопровождаемость** — легко находить и обновлять типы
- ⚡ **Производительность** — импорты только типов
- 🛡️ **Безопасность** — предотвращение архитектурных нарушений

При возникновении вопросов обращайтесь к этому руководству или к архитектурным принципам в [Принципы проектирования](../../architecture/design-principles.md).

### Биомы (перечень типов)

Биомы описывают области скаттеринга объектов в сцене и параметры генерации размещений (алгоритм, spacing, edge, transform, source). Подробная спецификация типов и алгоритмов приведена на отдельной странице:

- [Биомы — доменные типы](biomes.md)

---

## Связанная документация

- [Слои сцены](layers.md)
- [Террейн](terrain.md)
- [Биомы](biomes.md)
- [Сторы](../stores/README.md)
