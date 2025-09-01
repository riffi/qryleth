# Система освещения

Система освещения в проекте поддерживает несколько типов источников света для создания реалистичных сцен. Система построена на гибкой архитектуре типов с поддержкой как глобального освещения сцены, так и локального освещения объектов.

## Типы источников света

### Ambient Light (Окружающий свет)
- Равномерное освещение всей сцены
- Не имеет направления
- Настраиваются: цвет, интенсивность

### Directional Light (Направленный свет)
- Имитирует солнечное освещение
- Параллельные лучи света
- Настраиваются: позиция, цель, генерация теней, цвет, интенсивность
- Поддержка карт теней с настраиваемыми параметрами

### Point Light (Точечный свет)
- Свет излучается во все стороны от точки
- Имитирует лампочку или свечу
- Настраиваются: позиция, радиус действия, затухание, цвет, интенсивность

### Spot Light (Прожекторный свет)
- Конусообразный луч света
- Имитирует фонарик или прожектор
- Настраиваются: позиция, цель, угол раскрытия, мягкость краёв, генерация теней

## Архитектура типов

Система использует базовый интерфейс `BaseLight` для всех источников света:

```typescript
interface BaseLight {
  uuid: string;           // Уникальный идентификатор
  color?: string;         // Цвет в формате hex
  intensity?: number;     // Интенсивность свечения
  visible?: boolean;      // Видимость источника
}
```

Специализированные интерфейсы расширяют базовый:
- `AmbientLightSettings`
- `DirectionalLightSettings` 
- `PointLightSettings`
- `SpotLightSettings`

## Уровни освещения

### Глобальное освещение сцены
Управляется через интерфейс `LightingSettings`:
- Ambient light - один источник на сцену
- Directional light - основной направленный источник
- Ambient Occlusion - настройки эффекта затенения
- Цвет фона сцены

### Локальное освещение объектов
Каждый `GfxObject` может иметь собственное освещение в поле `localLights`:
- Point lights - массив точечных источников
- Spot lights - массив прожекторных источников
- Локальные источники перемещаются вместе с объектом

## Компоненты рендеринга

### SceneLighting.tsx
- Рендерит глобальное освещение сцены
- Использует хук `useSceneLighting()` из `sceneStore`
- Находится в `src/features/scene/ui/renderer/lighting/`

### ObjectSceneLighting.tsx  
- Рендерит освещение в редакторе объектов
- Использует хук `useObjectLighting()` из `objectStore`
- Находится в `src/features/editor/object/ui/renderer/lighting/`

## UI управления

### LightingControls.tsx
- Панель управления освещением в редакторе сцены
- Поддерживает пресеты освещения
- Настройка ambient, directional света и цвета фона
- Находится в `src/features/scene/ui/objectManager/`

### LightingControlPanel.tsx
- Панель управления освещением в редакторе объектов
- Аналогичный функционал для объектного редактора
- Находится в `src/features/editor/object/ui/LightingControlPanel/`

## Хранилища состояния

### sceneStore.ts
- Содержит глобальные настройки освещения сцены
- Хук `useSceneLighting()` для получения/изменения настроек
- Находится в `src/features/scene/model/`

### objectStore.ts
- Содержит настройки освещения для редактора объектов
- Хук `useObjectLighting()` для управления освещением
- Находится в `src/features/editor/object/model/`

## Ключевые файлы

### Типы
- `src/entities/lighting/model/types.ts` - основные интерфейсы освещения
- `src/entities/object/model/types.ts` - интерфейс GfxObject с поддержкой localLights

### Компоненты
- `src/features/scene/ui/renderer/lighting/SceneLighting.tsx`
- `src/features/editor/object/ui/renderer/lighting/ObjectSceneLighting.tsx`
- `src/features/scene/ui/objectManager/LightingControls.tsx`
- `src/features/editor/object/ui/LightingControlPanel/LightingControlPanel.tsx`

### Stores
- `src/features/scene/model/sceneStore.ts`
- `src/features/editor/object/model/objectStore.ts`

## Примеры использования

### Настройка глобального освещения
```typescript
const { lighting, updateLighting } = useSceneLighting();

// Обновление ambient света
updateLighting({
  ...lighting,
  ambient: {
    uuid: 'ambient-1',
    color: '#ffffff',
    intensity: 0.4,
    visible: true
  }
});

// Настройка directional света с тенями
updateLighting({
  ...lighting,
  directional: {
    uuid: 'sun-1',
    position: [10, 10, 5],
    color: '#fffacd',
    intensity: 1.2,
    castShadow: true,
    shadowProps: {
      mapSize: [2048, 2048],
      cameraFar: 50
    }
  }
});
```

### Добавление локального освещения объекта
```typescript
const object: GfxObject = {
  // ... другие свойства объекта
  localLights: {
    point: [{
      uuid: 'lamp-1',
      position: [0, 2, 0],
      color: '#ffaa00',
      intensity: 1.0,
      distance: 10,
      decay: 2
    }],
    spot: [{
      uuid: 'spotlight-1', 
      position: [0, 5, 0],
      target: [0, 0, 0],
      angle: Math.PI / 4,
      penumbra: 0.1,
      castShadow: true
    }]
  }
};
```

## Особенности реализации

1. **Отсутствие жёсткого кодирования**: Все параметры света настраиваются через состояние
2. **Унифицированный подход**: Схожие компоненты рендеринга для сцены и объектов
3. **Готовность к расширению**: Типы Point/Spot light готовы для будущей реализации рендеринга
4. **Гибкая архитектура**: Базовый интерфейс позволяет легко добавлять новые типы света

