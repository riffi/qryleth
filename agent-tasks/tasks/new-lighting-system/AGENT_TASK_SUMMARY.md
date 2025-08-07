---
epic: null
status: planned
created: 2025-08-07
tags: [lighting, rendering, 3d, types, ui, refactor]
---

# Агентская задача: Внедрение новой системы освещения

## Обязательная информация
!Правила работы с агентскими задачами: [agent-tasks.md](../../../docs/development/workflows/agent-tasks.md)
**ВАЖНО**: При выполнении каждой из фаз необходимо обязательно сверяться с требованиями и принципами из указанного файла.

## Контекст задачи

В настоящее время система освещения использует упрощенную структуру типов и жестко закодированные настройки света в компонентах рендеринга. Это ограничивает возможности настройки освещения и не поддерживает различные типы источников света (Point, Spot), которые необходимы для создания более реалистичных сцен.

### Текущая структура освещения

```typescript
// src/entities/lighting/model/types.ts
export interface LightingSettings {
  ambientColor?: string;
  ambientIntensity?: number;
  directionalColor?: string;
  directionalIntensity?: number;
  backgroundColor?: string;
  ambientOcclusion?: {
    enabled?: boolean;
    intensity?: number;
    radius?: number;
  };
}
```

### Проблемы текущей реализации

1. **Ограниченная структура типов**: Поддерживаются только Ambient и Directional источники света
2. **Жестко закодированные настройки**: В компонентах `ObjectSceneLighting.tsx` и `SceneLighting.tsx` жестко прописаны позиции и параметры теней
3. **Отсутствие Point и Spot light**: Нет поддержки точечного и прожекторного освещения
4. **Отсутствие локального освещения объектов**: GfxObject не поддерживает собственные источники света
5. **Дублирование кода**: Два почти одинаковых компонента освещения для сцены и объекта

## Цели задачи

1. **Обновить типы освещения** - реализовать новую структуру типов с поддержкой всех видов света
2. **Мигрировать компоненты рендеринга** - адаптировать ObjectSceneLighting и SceneLighting к новой структуре
3. **Добавить локальное освещение в GfxObject** - поддержка Point и Spot lights на уровне объектов
4. **Обновить UI панели управления** - адаптировать существующие панели к новой структуре
5. **Убрать жесткое кодирование** - сделать все параметры света настраиваемыми

## Анализ существующих компонентов

### Компоненты рендеринга
- **ObjectSceneLighting.tsx**: Использует хук `useObjectLighting()`, рендерит hardcoded свет
- **SceneLighting.tsx**: Использует хук `useSceneLighting()`, рендерит hardcoded свет  

### UI панели управления  
- **LightingControlPanel.tsx**: Панель в объект-редакторе
- **LightingControls.tsx**: Панель в сцен-редакторе

### Хранилища состояния
- **objectStore.ts**: Содержит `useObjectLighting()` хук
- **sceneStore.ts**: Содержит `useSceneLighting()` хук

## Техническая спецификация

### Новая структура типов

```typescript
// Базовый интерфейс для всех источников света
interface BaseLight {
  uuid: string;
  color?: string;
  intensity?: number;
  visible?: boolean;
}

// Ambient light (обычно один)
export interface AmbientLightSettings extends BaseLight {}

// Directional light (солнце)
export interface DirectionalLightSettings extends BaseLight {
  position: [number, number, number];
  target?: [number, number, number];
  castShadow?: boolean;
  shadowProps?: {
    mapSize?: [number, number];
    cameraFar?: number;
  };
}

// Point light (лампочка)
export interface PointLightSettings extends BaseLight {
  position: [number, number, number];
  distance?: number;
  decay?: number;
}

// Spot light (прожектор)
export interface SpotLightSettings extends BaseLight {
  position: [number, number, number];
  target?: [number, number, number];
  angle?: number;
  penumbra?: number;
  distance?: number;
  castShadow?: boolean;
}

// Корневые настройки освещения сцены
export interface LightingSettings {
  ambient?: AmbientLightSettings;
  directional?: DirectionalLightSettings;
  ambientOcclusion?: {
    enabled: boolean;
    intensity?: number;
    radius?: number;
  };
  backgroundColor?: string;
}
```

### Обновление GfxObject

```typescript
export interface GfxObject {
  // ... существующие поля
  
  /** Локальное освещение, перемещается вместе с объектом */
  localLights?: {
    point: PointLightSettings[];
    spot: SpotLightSettings[];
  };
}
```

## План выполнения (фазы)

### Фаза 1: Обновление типов освещения
**Статус**: ✅ Выполнено
**Отчет**: [phases/phase_1_summary.md](phases/phase_1_summary.md)

- Обновить `src/entities/lighting/model/types.ts` с новой структурой
- Добавить новые интерфейсы для Point и Spot light
- Сохранить обратную совместимость с существующими полями LightingSettings

### Фаза 2: Добавление локального освещения в GfxObject
**Статус**: ✅ Выполнено
**Отчет**: [phases/phase_2_summary.md](phases/phase_2_summary.md)

- Обновить `src/entities/object/model/types.ts`
- Добавить опциональное поле `localLights` в интерфейс GfxObject

### Фаза 3: Рефакторинг ObjectSceneLighting
**Статус**: ✅ Выполнено
**Отчет**: [phases/phase_3_summary.md](phases/phase_3_summary.md)

- Адаптировать компонент к новой структуре типов
- Заменить hardcoded параметры на настраиваемые из состояния
- Добавить поддержку единичного DirectionalLight источника
- Сохранить работоспособность с существующими настройками

### ✅ Фаза 4: Рефакторинг SceneLighting
- Аналогично ObjectSceneLighting, адаптировать к новой структуре
- Унифицировать подход к рендерингу света между компонентами
- Подготовить основу для будущего рендеринга локального освещения объектов

### ✅ Фаза 5: Обновление хранилищ состояния
- Адаптировать objectStore и sceneStore к новым типам
- Обновить хуки useObjectLighting и useSceneLighting
- Обеспечить миграцию существующих данных

### ✅ Фаза 6: Адаптация UI панелей управления
- Обновить LightingControlPanel.tsx для новой структуры
- Обновить LightingControls.tsx для новой структуры  
- Адаптировать существующий интерфейс, не создавая новые компоненты

## Важные ограничения

1. **Без создания новых компонентов**: Фокус на адаптации существующих компонентов
2. **Обратная совместимость не нужна**: Можно полностью заменить старую структуру
3. **Пока без Point/Spot рендеринга**: GfxObject.localLights добавляется как заготовка на будущее
4. **Адаптация UI, не создание**: Работать с существующими панелями управления

## Критерии приемки

- [ ] Новая структура типов полностью реализована
- [ ] GfxObject поддерживает localLights (на будущее)  
- [ ] ObjectSceneLighting и SceneLighting работают с новой структурой
- [ ] UI панели адаптированы к новым типам
- [ ] Убрано жесткое кодирование параметров света
- [ ] Сборка проекта проходит без ошибок
- [ ] Существующая функциональность не нарушена

## Связанные файлы

### Типы
- `src/entities/lighting/model/types.ts` - основные типы освещения
- `src/entities/object/model/types.ts` - GfxObject интерфейс

### Компоненты рендеринга
- `src/features/object-editor/ui/renderer/lighting/ObjectSceneLighting.tsx`
- `src/features/scene/ui/renderer/lighting/SceneLighting.tsx`

### Хранилища состояния
- `src/features/object-editor/model/objectStore.ts`
- `src/features/scene/model/sceneStore.ts`

### UI панели
- `src/features/object-editor/ui/LightingControlPanel/LightingControlPanel.tsx` 
- `src/features/scene/ui/objectManager/LightingControls.tsx`
