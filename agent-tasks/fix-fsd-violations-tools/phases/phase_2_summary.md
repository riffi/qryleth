# Фаза 2: Создание scene-editor tools

## Выполненные задачи ✅

### 1. Создание структуры AI директорий
**Путь**: `src/features/scene/lib/ai/`

Создана структура:
```
features/scene/lib/ai/
├── tools/
│   ├── sceneTools.ts
│   ├── instanceTools.ts
│   └── index.ts
└── index.ts
```

### 2. Перемещение sceneTools.ts
**Источник**: `src/shared/lib/langchain/tools/sceneTools.ts`  
**Назначение**: `src/features/scene/lib/ai/tools/sceneTools.ts`

Внесены изменения:
- ✅ Обновлен импорт SceneAPI: `import { SceneAPI } from '../../../lib/sceneAPI'`
- ✅ Сохранена вся функциональность инструментов
- ✅ Исправлено нарушение FSD - теперь инструменты находятся в правильном слое

### 3. Перемещение instanceTools.ts
**Источник**: `src/shared/lib/langchain/tools/instanceTools.ts`  
**Назначение**: `src/features/scene/lib/ai/tools/instanceTools.ts`

Внесены изменения:
- ✅ Обновлены импорты для features слоя:
  - `import { SceneAPI } from '../../../lib/sceneAPI'`
  - `import { placeInstance } from '../../../lib/placement/ObjectPlacementUtils'`
  - `import { useSceneStore } from '../../../model/sceneStore'`
- ✅ Сохранена вся функциональность инструментов
- ✅ Исправлено критическое нарушение FSD

### 4. Создание экспорт файлов
**Файл**: `src/features/scene/lib/ai/tools/index.ts`

Экспортирует все scene-related инструменты:
- `getSceneObjectsTool`, `getSceneStatsTool`, `findObjectByNameTool`
- `addObjectInstanceTool`, `canAddInstanceTool`, `getObjectInstancesTool`

### 5. Создание провайдера инструментов
**Файл**: `src/features/scene/lib/ai/index.ts`

Реализован `sceneToolProvider` с интерфейсом `ToolProvider`:
- ✅ Функция `registerSceneTools()` для регистрации в глобальном реестре
- ✅ Функция `unregisterSceneTools()` для отмены регистрации
- ✅ Инкапсуляция всех scene-related инструментов

### 6. Обновление публичного API
**Файл**: `src/features/scene/index.ts`

Добавлен экспорт функций регистрации AI инструментов:
```typescript
export { registerSceneTools, unregisterSceneTools } from './lib/ai'
```

## Архитектурные изменения

### До изменений (нарушение FSD)
```
shared/lib/langchain/tools/
├── sceneTools.ts ❌ импортирует features/scene
└── instanceTools.ts ❌ импортирует features/scene
```

### После изменений (соответствие FSD)
```
features/scene/lib/ai/
├── tools/
│   ├── sceneTools.ts ✅ может импортировать features/scene
│   ├── instanceTools.ts ✅ может импортировать features/scene
│   └── index.ts ✅ экспорт инструментов
└── index.ts ✅ провайдер и регистрация
```

## Интеграция с ToolRegistry

Теперь scene feature может зарегистрировать свои инструменты:

```typescript
import { registerSceneTools } from '@/features/scene'

// Регистрация всех scene-related инструментов
registerSceneTools()
```

## Результат фазы

✅ **Scene-специфичные tools перемещены в правильный слой**  
✅ **Исправлены критические нарушения FSD в shared слое**  
✅ **Создана система регистрации tools для scene feature**  
✅ **Сохранена вся функциональность AI инструментов**

## Следующие шаги

Теперь можно переходить к **Фазе 3**, где:
1. Object-специфичные tools будут перемещены в `features/object-editor/lib/ai/tools/`
2. Будет создан провайдер инструментов для object-editor
3. Object-editor получит возможность регистрировать свои инструменты

## Созданные файлы

1. `src/features/scene/lib/ai/tools/sceneTools.ts` - инструменты для работы со сценой
2. `src/features/scene/lib/ai/tools/instanceTools.ts` - инструменты для работы с экземплярами
3. `src/features/scene/lib/ai/tools/index.ts` - экспорт инструментов
4. `src/features/scene/lib/ai/index.ts` - провайдер и регистрация

## Измененные файлы

1. `src/features/scene/index.ts` - добавлен экспорт AI функций