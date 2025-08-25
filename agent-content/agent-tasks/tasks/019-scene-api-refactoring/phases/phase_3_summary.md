---
id: 19
phase: 3
title: "Фаза 3: Создание новых унифицированных методов SceneAPI"
status: done
created: 2025-08-25
updated: 2025-08-25
filesChanged: 1
notes:
  - type: new_methods
    description: "Добавлены новые унифицированные методы addInstances, createObject"
  - type: method_update
    description: "Обновлен метод addObjectFromLibrary с новой сигнатурой"
  - type: unified_api
    description: "Все новые методы используют PlacementStrategyConfig"
---

# Фаза 3: Создание новых унифицированных методов SceneAPI

## Проделанная работа

### 1. Импорт необходимых типов
- Добавил импорт `PlacementStrategyConfig` и `PlacementStrategy` из `ObjectPlacementUtils`
- Обеспечил доступность новых типов в `sceneAPI.ts`

### 2. Создание метода `addInstances`
- **Новый унифицированный метод для создания экземпляров существующих объектов**
- Сигнатура: `addInstances(objectUuid, layerId?, count = 1, placementStrategyConfig = { strategy: PlacementStrategy.Random })`
- Использует новый `placeInstance` с дискриминированным объединением `PlacementStrategyConfig`
- Автоматически собирает существующие экземпляры для избежания коллизий  
- Поддерживает размещение на указанном слое
- Возвращает подробную информацию о созданных экземплярах включая bounding boxes

### 3. Создание метода `createObject`
- **Новый унифицированный метод для создания объекта и размещения экземпляров**
- Сигнатура: `createObject(objectData, layerId?, count = 1, placementStrategyConfig = { strategy: PlacementStrategy.Random })`
- Объединяет создание объекта и размещение экземпляров в одном методе
- Применяет коррекцию LLM-сгенерированных объектов
- Автоматически рассчитывает BoundingBox для объекта
- Поддерживает создание множественных экземпляров с первого вызова
- Использует новый `placeInstance` для размещения всех экземпляров

### 4. Обновление метода `addObjectFromLibrary`  
- **Обновлена сигнатура для соответствия новой архитектуре**
- Новая сигнатура: `addObjectFromLibrary(objectUuid, layerId?, count = 1, placementStrategyConfig = { strategy: PlacementStrategy.Random })`
- Теперь использует новый `createObject` метод для унифицированного создания
- Поддерживает создание множественных экземпляров
- Полностью интегрирован с новой системой размещения объектов

### 5. Архитектурные улучшения
- Все новые методы используют единую архитектуру размещения объектов
- Унифицирована обработка `PlacementStrategyConfig` во всех методах
- Устранена дублирующаяся логика между методами
- Делегирование создания экземпляров в `placeInstance`
- Все методы автоматически обрабатывают terrain alignment

### 6. Обеспечение обратной совместимости
- Старые методы остались без изменений для плавного перехода
- Новые методы используют дискриминированное объединение `PlacementStrategyConfig`
- Сохранена совместимость с существующими типами результатов

## Ключевые особенности реализации

### Унифицированная обработка размещения
- Все новые методы используют один и тот же механизм размещения через `placeInstance`
- Автоматический сбор существующих экземпляров для collision detection
- Стандартизированная обработка landscape слоев и terrain alignment

### Дискриминированные объединения
- Строгая типизация связи стратегии размещения с метаданными
- Типобезопасность на этапе компиляции
- Легкое расширение новыми стратегиями размещения

### Детальная информация о результатах
- Возврат полной информации о созданных экземплярах
- Включение bounding boxes в результаты
- Подробные параметры каждого созданного экземпляра

## Изменённые файлы

1. `apps/qryleth-front/src/features/scene/lib/sceneAPI.ts` - добавлены новые методы

## Результат

### ✅ Критерии успешности
- [x] Создан новый метод `addInstances` с требуемой сигнатурой
- [x] Создан новый метод `createObject` с требуемой сигнатурой  
- [x] Обновлен метод `addObjectFromLibrary` с новой сигнатурой
- [x] Все методы используют новый `placeInstance` внутри
- [x] В методах не создаются инстансы напрямую - это делегируется `placeInstance`
- [x] Убрана явная передача трансформации - все делегировано `placeInstance`
- [x] Все новые методы используют `PlacementStrategyConfig`
- [x] Проект успешно компилируется без ошибок TypeScript
- [x] Сохранена полная обратная совместимость

### 🔧 BREAKING CHANGES
- Изменена сигнатура метода `addObjectFromLibrary` (добавлены новые опциональные параметры)
- Новые методы используют `PlacementStrategyConfig` вместо отдельных параметров стратегии

### ⏭️ Готовность к следующей фазе
Кодабаза готова к фазе 4 для удаления старых методов SceneAPI и обновления использующего их кода.

## Примеры использования новых методов

### Использование addInstances
```typescript
// Создание 5 экземпляров существующего объекта с RandomNoCollision стратегией
const result = SceneAPI.addInstances(
  "object-uuid",
  "layer-id", 
  5,
  { strategy: PlacementStrategy.RandomNoCollision }
);
```

### Использование createObject  
```typescript
// Создание нового объекта с 3 экземплярами
const result = SceneAPI.createObject(
  objectData,
  "objects",
  3, 
  { strategy: PlacementStrategy.Random }
);
```

### Использование addObjectFromLibrary
```typescript
// Добавление объекта из библиотеки с 2 экземплярами 
const result = await SceneAPI.addObjectFromLibrary(
  "library-uuid",
  "objects",
  2,
  { strategy: PlacementStrategy.RandomNoCollision }
);
```