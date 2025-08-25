---
id: 020
epic: null
title: "Реализация стратегии размещения PlaceAround"
status: in-progress
created: 2025-08-25
updated: 2025-08-25
owner: agent
tags: [placement-strategy, scene-api, object-placement]
phases:
  total: 6
  completed: 2
---

# Реализация стратегии размещения PlaceAround

## Обязательная информация
!Правила работы с агентскими задачами: [agent-tasks.md](../../../../docs/development/workflows/agent-tasks.md)
**ВАЖНО**: При выполнении каждой из фаз необходимо обязательно сверяться с требованиями и принципами из указанного файла.

## Цели
Добавить новую стратегию размещения инстансов объектов PlaceAround, при которой создаваемые инстансы будут располагаться по горизонтали или вертикально вокруг указанного инстанса или всех инстансов объекта.

## Контекст
В системе размещения объектов существуют две стратегии: Random и RandomNoCollision. Требуется добавить третью стратегию PlaceAround для размещения объектов вокруг целевых инстансов с настраиваемыми параметрами расстояния и распределения.

### Спецификация PlaceAroundMetadata

```typescript
export interface PlaceAroundMetadata {
  // === ЦЕЛЕВЫЕ ОБЪЕКТЫ (взаимоисключающие параметры) ===
  targetInstanceUuid?: string;    // UUID конкретного инстанса (приоритет 1)
  targetObjectUuid?: string;      // UUID объекта, вокруг всех инстансов которого размещать (приоритет 2)
  
  // === РАССТОЯНИЯ (обязательные параметры) ===
  minDistance: number;           // минимальное расстояние от грани target до грани нового объекта (единицы мира)
  maxDistance: number;           // максимальное расстояние от грани target до грани нового объекта (единицы мира)
  
  // === ПАРАМЕТРЫ РАСПРЕДЕЛЕНИЯ (опциональные) ===
  angleOffset?: number;          // начальный угол в радианах (по умолчанию: 0)
  distributeEvenly?: boolean;    // равномерно по кругу или случайно (по умолчанию: true)
  onlyHorizontal?: boolean;      // только горизонтально Y=const или 3D (по умолчанию: true)
}
```

### Логика применения параметров

#### 1. Выбор целевых объектов
```typescript
// Приоритет 1: конкретный инстанс
if (metadata.targetInstanceUuid) {
  targetInstances = [findInstanceByUuid(metadata.targetInstanceUuid)]
}
// Приоритет 2: все инстансы объекта  
else if (metadata.targetObjectUuid) {
  targetInstances = findAllInstancesByObjectUuid(metadata.targetObjectUuid)
} 
else {
  throw new Error("Требуется targetInstanceUuid ИЛИ targetObjectUuid")
}
```

#### 2. Расчет расстояния от грани до грани
```typescript
// Получить радиусы boundingBox (после transform)
const targetRadius = Math.max(
  targetTransformedBB.max[0] - targetTransformedBB.min[0],
  targetTransformedBB.max[2] - targetTransformedBB.min[2]
) / 2

const newObjectRadius = Math.max(
  newObjectTransformedBB.max[0] - newObjectTransformedBB.min[0], 
  newObjectTransformedBB.max[2] - newObjectTransformedBB.min[2]
) / 2

// Случайное расстояние между границами объектов
const edgeToEdgeDistance = Math.random() * (maxDistance - minDistance) + minDistance
const actualCenterDistance = edgeToEdgeDistance + targetRadius + newObjectRadius
```

#### 3. Распределение по углам
```typescript
// При distributeEvenly=true (по умолчанию)
if (metadata.distributeEvenly !== false) {
  const angleStep = (2 * Math.PI) / totalInstancesCount
  angle = (metadata.angleOffset || 0) + instanceIndex * angleStep
}
// При distributeEvenly=false
else {
  angle = (metadata.angleOffset || 0) + Math.random() * 2 * Math.PI
}
```

#### 4. Позиционирование по высоте
```typescript
// При onlyHorizontal=true (по умолчанию) - горизонтальное размещение
if (metadata.onlyHorizontal !== false) {
  newY = targetCenter[1]  // та же высота что у target
}
// При onlyHorizontal=false - 3D размещение (для космоса)
else {
  const verticalRange = actualCenterDistance * 0.5  // 50% от горизонтального радиуса
  const verticalOffset = (Math.random() - 0.5) * 2 * verticalRange
  newY = targetCenter[1] + verticalOffset
}
```

### Примеры использования

#### Пример 1: Деревья вокруг дома
```typescript
SceneAPI.addInstances('tree-uuid', 'nature-layer', 8, {
  strategy: PlacementStrategy.PlaceAround,
  metadata: {
    targetInstanceUuid: 'house-instance-123',
    minDistance: 3.0,        // минимум 3 единицы от стены дома до ствола дерева
    maxDistance: 8.0,        // максимум 8 единиц от стены дома до ствола дерева  
    distributeEvenly: true,  // равномерно по кругу
    angleOffset: 0,          // начать с 0 радиан (восток)
    onlyHorizontal: true     // на одной высоте с домом
  }
})
```

#### Пример 2: Камни вокруг всех деревьев
```typescript
SceneAPI.addInstances('rock-uuid', 'nature-layer', 15, {
  strategy: PlacementStrategy.PlaceAround,
  metadata: {
    targetObjectUuid: 'tree-object-uuid',  // вокруг ВСЕХ деревьев
    minDistance: 0.5,        // близко к стволу
    maxDistance: 2.0,        // не дальше 2 единиц
    distributeEvenly: false, // случайные углы
    angleOffset: 0,
    onlyHorizontal: true
  }
})
// Результат: 15 камней распределятся поровну вокруг всех существующих деревьев
```

#### Пример 3: Астероиды вокруг космической станции
```typescript
SceneAPI.addInstances('asteroid-uuid', 'space-layer', 12, {
  strategy: PlacementStrategy.PlaceAround,
  metadata: {
    targetInstanceUuid: 'space-station-uuid',
    minDistance: 50.0,       // минимум 50 единиц от станции
    maxDistance: 200.0,      // максимум 200 единиц от станции
    distributeEvenly: true,  // равномерно в сфере
    angleOffset: Math.PI/6,  // начать с 30 градусов
    onlyHorizontal: false    // 3D размещение в космосе
  }
})
```

### Технические требования
- **Расчет расстояния**: от ближайшей грани boundingBox target объекта до ближайшей грани нового объекта
- **Коллизии**: обязательное избежание коллизий со всеми существующими объектами (максимум 100 попыток)
- **Приоритет параметров**: targetInstanceUuid > targetObjectUuid
- **Вертикальное размещение**: относительно target объекта (для космических сцен)
- **Валидация**: minDistance < maxDistance, minDistance ≥ 0, обязательность одного из target параметров
- **Интеграция**: в существующую архитектуру PlacementStrategy с дискриминированными типами

## Список фаз

### ✅ Фаза 1: Расширение типов и базовой архитектуры
- [x] Добавить PlaceAround в enum PlacementStrategy
- [x] Создать интерфейс PlaceAroundMetadata с обязательными параметрами
- [x] Обновить дискриминированное объединение PlacementStrategyConfig
- [x] Добавить валидацию параметров PlaceAround
- [x] Обновить импорты и экспорты в ObjectPlacementUtils.ts

**Отчёт**: [phases/phase_1_summary.md](phases/phase_1_summary.md)

### ✅ Фаза 2: Реализация основного алгоритма размещения
- [x] Создать функцию generatePlaceAroundPosition
- [x] Реализовать поиск target инстансов по targetInstanceUuid/targetObjectUuid
- [x] Добавить расчет позиций вокруг target с учетом boundingBox
- [x] Реализовать равномерное и случайное распределение углов
- [x] Интегрировать в существующую функцию generateObjectPlacement

**Отчёт**: [phases/phase_2_summary.md](phases/phase_2_summary.md)

### ⏳ Фаза 3: Интеграция с системой коллизий
- Добавить проверку коллизий для PlaceAround стратегии
- Поддержка как 2D, так и 3D размещения (onlyHorizontal параметр)
- Интеграция с существующими функциями коллизий (checkBoundingBoxCollision)
- Тестирование механизма избежания коллизий (максимум 100 попыток)

### ⏳ Фаза 4: Обновление AI tools чата в sceneEditor
- Обновить `objectTools.ts`:
  - Добавить PlaceAround в zod схему с валидацией параметров
  - Валидация minDistance < maxDistance
  - Валидация обязательности targetInstanceUuid OR targetObjectUuid
- Обновить `instanceTools.ts` - поддержка PlaceAround для работы с инстансами
- Обновить `index.ts` - экспорт обновленных tools
- Тестирование корректной работы чат-бота с PlaceAround командами

### ⏳ Фаза 5: Обновление поддержки скриптинга в ScriptingPanel
- Обновить `completionData.ts`:
  - Автодополнение PlaceAround стратегии
  - Автодополнение всех параметров PlaceAroundMetadata
  - Контекстные подсказки с примерами значений
- Обновить `codeAnalysis.ts` - анализ кода с PlaceAround синтаксисом
- Обновить `scriptTemplates.ts` - добавить примеры использования PlaceAround
- Обновить `apiReturnTypes.ts` - типы для PlaceAround если требуется

### ⏳ Фаза 6: Тестирование и обновление документации
- Тестирование всех сценариев использования PlaceAround
- Проверка работы с одиночными и множественными target instances
- Валидация корректности расчета расстояний от грани до грани
- Обновление основной проектной документации
- Создание примеров использования стратегии

## Критерии завершения
- [ ] PlaceAround стратегия полностью интегрирована в существующую архитектуру
- [ ] Корректно работает расчет расстояния от грани до грани с учетом transform
- [ ] Поддерживается избежание коллизий со всеми объектами
- [ ] Работает как с targetInstanceUuid, так и с targetObjectUuid
- [ ] Поддерживается 2D и 3D размещение
- [ ] AI tools чата в sceneEditor поддерживают PlaceAround:
  - [ ] objectTools.ts и instanceTools.ts обновлены с zod валидацией
  - [ ] Чат-бот корректно обрабатывает PlaceAround команды
- [ ] Скриптинг в ScriptingPanel поддерживает PlaceAround:
  - [ ] Автодополнение работает для всех параметров PlaceAround
  - [ ] Анализ кода распознает PlaceAround синтаксис
  - [ ] Примеры шаблонов включают PlaceAround сценарии
- [ ] Проект успешно собирается и проходит линтинг
- [ ] Документация обновлена