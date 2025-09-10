# Система материалов

Документация по новой системе материалов в Qryleth, реализующей эффективное управление и переиспользование материалов.

---

## Обзор

Система материалов в Qryleth обеспечивает гибкое управление визуальными свойствами 3D объектов через:

- **Глобальные материалы** - переиспользуемые материалы, доступные во всех сценах
- **Материалы объекта** - специфичные материалы, определяемые на уровне `GfxObject`
- **Система ссылок** - примитивы ссылаются на материалы через UUID

### Ключевые преимущества

- 🔄 **Переиспользование**: Глобальные материалы избегают дублирования
- 📦 **Инкапсуляция**: Материалы объекта изолированы в рамках объекта
- 🔗 **Гибкость**: Различные способы назначения материалов
- ⚡ **Производительность**: Кэширование и быстрый резолвинг
- 🔙 **Совместимость**: Поддержка устаревшего формата

---

## Архитектура

### Типы материалов

```typescript
interface GfxMaterial {
  uuid: string;              // Уникальный идентификатор
  name: string;              // Отображаемое имя
  color?: string;            // Базовый цвет (hex)
  opacity?: number;          // Прозрачность (0-1)
  emissive?: string;         // Цвет излучения (hex)
  emissiveIntensity?: number; // Интенсивность излучения
}
```

### Иерархия резолвинга

Материалы резолвятся в следующем порядке приоритета:

1. **Прямой материал** (`primitive.material`) - устаревший формат
2. **Материал объекта** (`primitive.objectMaterialUuid`)
3. **Глобальный материал** (`primitive.globalMaterialUuid`)
4. **Дефолтный материал** - серый материал по умолчанию

```typescript
interface PrimitiveCommon {
  // Устаревший формат (для обратной совместимости)
  material?: {
    color?: string;
    opacity?: number;
    emissive?: string;
    emissiveIntensity?: number;
  };
  
  // Новая система ссылок
  objectMaterialUuid?: string;  // Ссылка на материал объекта
  globalMaterialUuid?: string;  // Ссылка на глобальный материал
}
```

### Глобальный реестр материалов

```typescript
class MaterialRegistry {
  private static instance: MaterialRegistry;
  private materials = new Map<string, GfxMaterial>();
  
  // Регистрация материала
  register(material: GfxMaterial): void
  
  // Получение материала по UUID
  get(uuid: string): GfxMaterial | undefined
  
  // Получение всех материалов
  getAll(): GfxMaterial[]
}
```

---

## Компоненты системы

### Основные модули

1. **MaterialRegistry** (`@/shared/lib/materials/MaterialRegistry.ts`)
   - Глобальный реестр материалов
   - Singleton паттерн
   - Кэширование в памяти

2. **materialResolver** (`@/shared/lib/materials/materialResolver.ts`)
   - Резолвинг материалов по UUID
   - Fallback логика
   - Интеграция с рендерингом

3. **globalMaterials** (`@/shared/lib/materials/globalMaterials.ts`)
   - Предопределенные материалы
   - Материалы по умолчанию (дерево, металл, стекло и др.)
   - Включая материал «Листва» (цвет от роли палитры)

4. **initializeMaterials** (`@/shared/lib/materials/initializeMaterials.ts`)
   - Инициализация системы материалов
   - Регистрация глобальных материалов

### Entity типы

```typescript
// @/entities/material
export interface GfxMaterial { /* ... */ }

// @/entities/object
export interface GfxObject {
  materials?: GfxMaterial[];  // Материалы объекта
  primitives: GfxPrimitive[];
}

// @/entities/primitive
export interface PrimitiveCommon {
  objectMaterialUuid?: string;
  globalMaterialUuid?: string;
  material?: LegacyMaterial;  // deprecated
}
```

---

## Использование

### Создание материалов

#### Глобальные материалы

```typescript
import { MaterialRegistry } from '@/shared/lib/materials'

// Создание нового глобального материала
const newMaterial: GfxMaterial = {
  uuid: generateUUID(),
  name: 'Красный пластик',
  color: '#ff0000',
  opacity: 1.0
}

// Регистрация в глобальном реестре
MaterialRegistry.getInstance().register(newMaterial)
```

#### Предустановленный глобальный материал «Листва»

Материал с UUID `global-material-foliage-001` доступен из коробки. Его базовый цвет берётся из активной глобальной палитры по роли `foliage` (c фолбэком на `#4a7c59`). Это позволяет автоматически подстраивать оттенок листвы под выбранную палитру сцены.

Пример назначения на примитив через ссылку на глобальный материал:

```ts
const leafUuid = 'global-material-foliage-001'

const object = {
  name: 'Дерево',
  primitives: [
    { type: 'sphere', geometry: { radius: 1 }, globalMaterialUuid: leafUuid },
    { type: 'cylinder', geometry: { radiusTop: 0.2, radiusBottom: 0.3, height: 2 }, globalMaterialUuid: 'global-material-wood-001' }
  ]
}
```

Замечание: Активная палитра берётся из `environmentContent.paletteUuid`. Для принудительного выбора палитры в ScriptingPanel используйте `sceneApi.setPalette('default')` или другой UUID палитры.

#### Материалы объекта

```typescript
const objectWithMaterials: GfxObject = {
  name: 'Дом',
  materials: [
    {
      uuid: 'wall-material-uuid',
      name: 'Стена',
      color: '#cccccc',
      opacity: 1.0
    },
    {
      uuid: 'roof-material-uuid', 
      name: 'Крыша',
      color: '#8B4513',
      opacity: 1.0
    }
  ],
  primitives: [
    {
      type: 'box',
      geometry: { width: 10, height: 3, depth: 8 },
      objectMaterialUuid: 'wall-material-uuid'  // Ссылка на материал стены
    },
    {
      type: 'pyramid',
      geometry: { baseSize: 10, height: 2 },
      objectMaterialUuid: 'roof-material-uuid'  // Ссылка на материал крыши
    }
  ]
}
```

### Резолвинг материалов

```typescript
import { resolveMaterial } from '@/shared/lib/materials'

const resolvedMaterial = resolveMaterial(primitive, object)
// Возвращает GfxMaterial согласно иерархии приоритета
```

### Рендеринг

```typescript
// PrimitiveRenderer автоматически резолвит материалы
const PrimitiveRenderer = ({ primitive, object }) => {
  const material = resolveMaterial(primitive, object)
  
  return (
    <meshStandardMaterial
      color={material.color}
      opacity={material.opacity}
      emissive={material.emissive}
      emissiveIntensity={material.emissiveIntensity}
      transparent={material.opacity < 1}
    />
  )
}
```

---

## Пользовательский интерфейс

### Управление материалами

1. **ObjectManagementPanel** - табулированный интерфейс
   - Вкладка "Примитивы" - управление примитивами
   - Вкладка "Материалы" - управление материалами объекта

2. **MaterialManager** - список материалов объекта
   - Просмотр всех материалов объекта
   - Создание новых материалов
   - Выбор активного материала для редактирования

3. **MaterialControlPanel** - редактирование свойств материала
   - Цвет, прозрачность, излучение
   - Валидация имен материалов
   - Автосохранение изменений

4. **PrimitiveControlPanel** - назначение материалов примитивам
   - Селектор материалов (глобальные + объекта)
   - Группировка и поиск материалов
   - Применение материала к выбранному примитиву

### Рабочий процесс

1. **Создание материала**:
   - Переключиться на вкладку "Материалы"
   - Нажать "Создать материал"
   - Задать имя и свойства материала

2. **Редактирование материала**:
   - Выбрать материал в списке
   - Изменить свойства в левой панели
   - Изменения сохраняются автоматически

3. **Назначение материала примитиву**:
   - Выбрать примитив в списке
   - В левой панели выбрать материал из селектора
   - Материал применяется мгновенно

---

## AI интеграция

### Инструменты AI

```typescript
// Получение списка глобальных материалов
const getGlobalMaterials = {
  name: 'getGlobalMaterials',
  description: 'Get list of available global materials',
  schema: z.object({})
}

// Создание объекта с материалами
const createObject = {
  schema: z.object({
    materials: z.array(materialSchema).optional(),
    primitives: z.array(primitiveSchema)
  })
}
```

### Использование AI

AI может:
- Получать список доступных глобальных материалов
- Создавать объекты с собственными материалами
- Назначать материалы примитивам через UUID
- Использовать существующие глобальные материалы

Пример:
```typescript
// AI создает дом с различными материалами
{
  name: "Дом",
  materials: [
    { uuid: "...", name: "Кирпич", color: "#B22222" },
    { uuid: "...", name: "Черепица", color: "#8B4513" }
  ],
  primitives: [
    {
      type: "box",
      geometry: {...},
      objectMaterialUuid: "brick-uuid"
    }
  ]
}
```

---

## CAD интеграция

### Конвертер материалов

Python конвертер `cad2qryleth/converter.py` поддерживает:

- Извлечение материалов из Blender объектов
- Создание материалов на уровне объекта
- Назначение материалов примитивам через UUID
- Fallback к старому формату

```python
def _prim_to_schema(obj, material_uuid_map):
    # Создание материалов объекта из Blender материалов
    # Назначение objectMaterialUuid примитивам
    # Сохранение в новом формате
```

---

## Миграция и совместимость

### Обратная совместимость

Система поддерживает устаревший формат материалов:

```typescript
// Старый формат (работает)
const legacyPrimitive = {
  type: 'box',
  material: {
    color: '#ff0000',
    opacity: 0.8
  }
}

// Новый формат (рекомендуется)  
const newPrimitive = {
  type: 'box',
  globalMaterialUuid: 'red-plastic-uuid'
}
```

### Автоматическая миграция

При загрузке старых объектов:
1. Старые материалы остаются в поле `material`
2. Система автоматически их резолвит
3. При редактировании создаются новые материалы
4. Постепенный переход на новую систему

---

## Производительность

### Оптимизации

- **Кэширование**: Глобальные материалы кэшируются в памяти
- **Быстрый доступ**: Map-структуры для резолвинга по UUID
- **Ленивая загрузка**: Материалы загружаются по требованию
- **Минимальная сериализация**: Только UUID, не полные объекты

### Мониторинг

```typescript
// Статистика использования материалов
MaterialRegistry.getInstance().getStats()
// { totalMaterials: 15, cacheHits: 230, cacheMisses: 5 }
```

---

## Тестирование

### Unit тесты

- Тестирование MaterialRegistry
- Тестирование materialResolver
- Валидация типов TypeScript

### Интеграционные тесты

- Рендеринг с различными материалами
- UI компоненты управления материалами
- AI интеграция и валидация схем

---

## Troubleshooting

### Частые проблемы

1. **Материал не найден**
   - Проверить UUID в резолвере
   - Убедиться что материал зарегистрирован
   - Использовать fallback материал

2. **Дублирование материалов**
   - Использовать глобальные материалы
   - Проверить уникальность UUID

3. **Проблемы с рендерингом**
   - Проверить резолвинг в PrimitiveRenderer
   - Валидировать свойства материала

### Отладка

```typescript
// Включить отладку материалов
localStorage.setItem('DEBUG_MATERIALS', 'true')

// Посмотреть состояние реестра
console.log(MaterialRegistry.getInstance().getAll())
```

---

## Связанная документация

- [API Types](../../api/types/README.md) - Типы системы материалов
- [Design Principles](../../architecture/design-principles.md) - Архитектурные принципы
- [Object Editing](README.md) - Редактирование объектов
- [CAD Integration](../cad-integration/converter.md) - Конвертер материалов
