# Фаза 1: Создание системы глобальных материалов - ВЫПОЛНЕНО

## Цель фазы
Создать глобальный реестр материалов и базовые типы для новой системы материалов.

## Выполненные задачи

### ✅ Создан интерфейс GfxMaterial
**Файл:** `src/entities/material/model/types.ts`
- Определен интерфейс `GfxMaterial` с uuid и физически корректными свойствами
- Добавлены типы материалов: 'metal', 'dielectric', 'glass', 'emissive', 'custom'
- Добавлены свойства: color, opacity, metalness, roughness, emissive, emissiveIntensity, ior
- Создан тип `CreateGfxMaterial` для создания материалов без uuid
- Добавлены константы `GLOBAL_MATERIAL_TYPES`

### ✅ Создан глобальный реестр материалов
**Файл:** `src/shared/lib/materials/MaterialRegistry.ts`
- Реализован класс `MaterialRegistry` с Map для быстрого доступа
- Методы: register, get, getGlobalMaterials, getAllMaterials, has, remove, update, clear
- Отдельное хранение глобальных материалов для оптимизации
- Создан единственный экземпляр `materialRegistry`

### ✅ Добавлены предопределенные глобальные материалы
**Файл:** `src/shared/lib/materials/globalMaterials.ts`
- Создано 10 предопределенных материалов:
  - Дерево (диэлектрик, коричневый, rough)
  - Металл (металл, серый, низкая roughness)
  - Земля (диэлектрик, коричневый, высокая roughness)
  - Камень (диэлектрик, серый, высокая roughness)
  - Стекло (стекло, прозрачное, ior=1.5)
  - Золото (металл, золотой цвет)
  - Медь (металл, медный цвет)
  - Пластик (диэлектрик, белый)
  - Резина (диэлектрик, темно-серый, очень rough)
  - Керамика (диэлектрик, бежевый, smooth)

### ✅ Созданы утилиты для работы с материалами
**Файл:** `src/shared/lib/materials/materialResolver.ts`
- Функция `resolveMaterial()` с иерархией приоритетов:
  1. Прямой материал примитива (обратная совместимость)
  2. Материал объекта по objectMaterialUuid
  3. Глобальный материал по globalMaterialUuid  
  4. Дефолтный материал
- Функция `convertLegacyMaterial()` для обратной совместимости
- Утилиты: `getMaterialById()`, `isEmissiveMaterial()`, `isTransparentMaterial()`, `isMetallicMaterial()`
- Константа `DEFAULT_MATERIAL` (серый диэлектрик)

### ✅ Создана система инициализации
**Файл:** `src/shared/lib/materials/initializeMaterials.ts`
- Функция `initializeMaterials()` для регистрации всех глобальных материалов
- Функция `getMaterialStats()` для получения статистики реестра

### ✅ Обновлена структура экспортов
- Создан индексный файл `src/shared/lib/materials/index.ts`
- Создан индексный файл `src/entities/material/index.ts`
- Обновлен `src/entities/index.ts` для экспорта материалов

## Архитектурные решения

### Структура GfxMaterial (совместимая с Three.js)
```typescript
interface GfxMaterial {
  uuid: string;
  name: string;
  type: 'metal' | 'dielectric' | 'glass' | 'emissive' | 'custom';
  properties: {
    // Базовые свойства Three.js MeshStandardMaterial
    color: string;
    opacity?: number;
    transparent?: boolean;
    metalness?: number;
    roughness?: number;
    emissive?: string;
    emissiveIntensity?: number;
    ior?: number;
    envMapIntensity?: number;
    side?: 'front' | 'back' | 'double';
    alphaTest?: number;
    castShadow?: boolean;
    receiveShadow?: boolean;
  };
  isGlobal: boolean;
  description?: string;
}
```

### Иерархия резолвинга материалов
1. **Прямой материал** - старый формат для обратной совместимости
2. **Материал объекта** - по objectMaterialUuid из materials массива объекта
3. **Глобальный материал** - по globalMaterialUuid из реестра
4. **Дефолтный материал** - серый материал как fallback

### Система типов материалов
- **metal** - металлические материалы (metalness = 1.0)
- **dielectric** - диэлектрики (metalness = 0.0)
- **glass** - стекло с преломлением (low opacity, ior)
- **emissive** - светящиеся материалы
- **custom** - пользовательские материалы

## Файлы созданные в фазе
1. `src/entities/material/model/types.ts` - типы материалов
2. `src/entities/material/index.ts` - экспорты entity
3. `src/shared/lib/materials/MaterialRegistry.ts` - глобальный реестр
4. `src/shared/lib/materials/globalMaterials.ts` - предопределенные материалы
5. `src/shared/lib/materials/materialResolver.ts` - утилиты резолвинга
6. `src/shared/lib/materials/initializeMaterials.ts` - инициализация
7. `src/shared/lib/materials/index.ts` - экспорты библиотеки

## Файлы изменены в фазе
1. `src/entities/index.ts` - добавлен экспорт материалов

## Контекст для следующих фаз

### Готовая инфраструктура
- Глобальный реестр материалов готов к использованию
- 10 предопределенных материалов зарегистрированы
- Система резолвинга поддерживает обратную совместимость
- Утилиты для работы с материалами готовы

### Требования к Фазе 2
- Необходимо вызвать `initializeMaterials()` при старте приложения
- Обновить типы примитивов для поддержки `objectMaterialUuid` и `globalMaterialUuid`
- Добавить поле `materials?: GfxMaterial[]` в GfxObject
- Сохранить поле `material?` для обратной совместимости

### API для использования
```typescript
// Инициализация (нужно вызвать при старте)
import { initializeMaterials } from '@/shared/lib/materials';
initializeMaterials();

// Резолвинг материала
import { resolveMaterial } from '@/shared/lib/materials';
const material = resolveMaterial({
  directMaterial: primitive.material,
  objectMaterialUuid: primitive.objectMaterialUuid,
  globalMaterialUuid: primitive.globalMaterialUuid,
  objectMaterials: object.materials
});

// Конвертация в свойства Three.js
import { materialToThreeProps, getMeshPropsFromMaterial } from '@/shared/lib/materials';
const materialProps = materialToThreeProps(material);
const meshProps = getMeshPropsFromMaterial(material);

// Получение глобальных материалов
import { materialRegistry } from '@/shared/lib/materials';
const globalMaterials = materialRegistry.getGlobalMaterials();
```

### Совместимость с Three.js
- Все свойства GfxMaterial.properties совместимы с Three.js MeshStandardMaterial
- Функция `materialToThreeProps()` конвертирует GfxMaterial в объект свойств для Three.js
- Функция `getMeshPropsFromMaterial()` извлекает свойства меша (castShadow, receiveShadow)
- Поддерживается PBR (Physically Based Rendering) с metalness/roughness workflow

### Стабильность UUID глобальных материалов
- ✅ **ИСПРАВЛЕНО**: Глобальные материалы теперь имеют фиксированные UUID
- UUID не изменяются между сессиями приложения
- Сцены с глобальными материалами можно безопасно обмениваться между пользователями
- Константы `GLOBAL_MATERIAL_UUIDS` для программного доступа к UUID
- Метод `materialRegistry.registerWithUuid()` для регистрации с предопределенным UUID

```typescript
// Примеры фиксированных UUID:
GLOBAL_MATERIAL_UUIDS.WOOD   // 'global-material-wood-001'
GLOBAL_MATERIAL_UUIDS.METAL  // 'global-material-metal-001'
GLOBAL_MATERIAL_UUIDS.GLASS  // 'global-material-glass-001'
```

## Статус
**✅ ВЫПОЛНЕНО** - Базовая система материалов создана и готова к использованию с фиксированными UUID.