---
id: 19
epic: null
title: "Рефакторинг SceneAPI: Унификация методов создания объектов и стратегий размещения"
status: planned
created: 2025-08-25
updated: 2025-08-25
owner: team-ui
tags: [scene-api, refactoring, architecture]
phases:
  total: 7
  completed: 1
---

# Рефакторинг SceneAPI: Унификация методов создания объектов и стратегий размещения

## Обязательная информация
!Правила работы с агентскими задачами: [agent-tasks.md](../../../../docs/development/workflows/agent-tasks.md)
**ВАЖНО**: При выполнении каждой из фаз необходимо обязательно сверяться с требованиями и принципами из указанного файла.

## Цели
Упростить и унифицировать API для создания объектов в сцене, вынести стратегии размещения в отдельную конфигурацию, сделать процесс создания объектов более прозрачным и гибким для агентов и скриптинга.

## Контекст
В текущей реализации SceneAPI содержит множество однотипных методов для создания объектов:
- `addObjectInstance` (sceneAPI.ts:230)
- `addSingleObjectInstance` (sceneAPI.ts:280) 
- `addObjectInstances` (sceneAPI.ts:290)
- `addRandomObjectInstances` (sceneAPI.ts:371)
- `addObjectWithTransform` (sceneAPI.ts:507)
- `addObjectFromLibrary` (sceneAPI.ts:610)

Проблема заключается в том, что вся логика размещения жестко зашита внутри `placeInstance` функции, а различные методы дублируют функциональность. 

В целевой архитектуре процесс должен быть следующим:
1. **Получение объекта** - агент/скриптинг панель берет объект из источника:
   - Создает новый (addObjectWithTransform)
   - Берет объект из библиотеки (addObjectFromLibrary)  
   - Берет объект из сцены (существующий UUID)
2. **Размещение экземпляров** - указывает количество объектов и стратегию размещения
3. **Создание инстансов** - `placeInstance` принимает UUID объекта, options, count, стратегию и метаданные стратегии, сама создает множественные инстансы внутри

Необходимо также переделать `PlacementStrategy` на enum и добавить метаданные для каждой стратегии.

## Список фаз

### ✅ Фаза 1: Создание enum PlacementStrategy и типов метаданных
**Отчёт**: [phases/phase_1_summary.md](phases/phase_1_summary.md)
- Преобразовать `PlacementStrategy` union type в настоящий enum
- **ВАЖНО**: Оставить только две стратегии: `Random` и `RandomNoCollision` (удалить `Center`, `Origin`, `Custom`)
- Создать пустые типы метаданных для стратегий `Random` и `RandomNoCollision` (пока только структура)
- Обновить существующий код в `ObjectPlacementUtils.ts` для использования enum
- Обновить все импорты и использования PlacementStrategy в проекте

### ⏳ Фаза 2: Кардинальный рефакторинг placeInstance - новая сигнатура с дискриминированным объединением
- **Создать дискриминированное объединение PlacementStrategyConfig для строгой типизации:**
  ```typescript
  // Дискриминированное объединение для строгой связи стратегии с метаданными
  type PlacementStrategyConfig = 
    | { strategy: PlacementStrategy.Random; metadata?: RandomMetadata }
    | { strategy: PlacementStrategy.RandomNoCollision; metadata?: RandomNoCollisionMetadata }
  ```
- **BREAKING CHANGE**: Новая сигнатура:
  ```typescript
  placeInstance(
    objectUuid: string,
    options: {
      landscapeLayer?: SceneLayer;
      alignToTerrain?: boolean;
      objectBoundingBox?: BoundingBox;
      existingInstances?: Array<{instance: SceneObjectInstance, boundingBox: BoundingBox}>;
      // УДАЛИТЬ: placementX, placementZ - теперь не нужны
    },
    count: number,
    placementStrategyConfig: PlacementStrategyConfig // Дискриминированное объединение вместо двух отдельных параметров
  ): SceneObjectInstance[]
  ```
- Функция должна сама создавать множественные инстансы внутри, а не размещать готовый instance
- Интегрировать функциональность `addObjectInstance` прямо в `placeInstance`
- Обновить `generateObjectPlacement` для работы с дискриминированным объединением PlacementStrategyConfig
- Удалить логику для `Center`, `Origin`, `Custom` из `generateObjectPlacement`
- Удалить `placementX`, `placementZ` из options - координаты теперь определяются стратегией
- Создать временную `placeInstanceLegacy` для обратной совместимости во время миграции

### ⏳ Фаза 3: Создание новых унифицированных методов SceneAPI
- **Новые сигнатуры методов:**
  ```typescript
  // Основной метод для существующих объектов
  static addInstances(
    objectUuid: string, 
    layerId?: string, 
    count: number = 1, 
    placementStrategyConfig: PlacementStrategyConfig = { strategy: PlacementStrategy.Random }
  ): AddInstancesResult

  // Создание нового объекта + размещение
  static createObject(
    objectData: GfxObject, 
    layerId?: string, 
    count: number = 1, 
    placementStrategyConfig: PlacementStrategyConfig = { strategy: PlacementStrategy.Random }
  ): AddObjectWithTransformResult

  // Импорт из библиотеки + размещение (обновленный)
  static async addObjectFromLibrary(
    objectUuid: string,
    layerId?: string,
    count: number = 1,
    placementStrategyConfig: PlacementStrategyConfig = { strategy: PlacementStrategy.Random }
  ): Promise<AddObjectResult>
  ```
- Все методы используют новый `placeInstance` внутри
- Убрать явную передачу трансформации из всех методов - делегировать placeInstance

### ⏳ Фаза 4: Удаление старых методов SceneAPI
- Удалить старые методы: `addObjectInstance`, `addSingleObjectInstance`, `addObjectInstances`, `addRandomObjectInstances`
- Найти и обновить все использования удаленных методов в проекте
- Обновить тесты для использования новых методов
- Убедиться что весь функционал покрыт новыми унифицированными методами

### ⏳ Фаза 5: Обновление AI langChain tools
- Обновить scene langChain tools в `apps/qryleth-front/src/features/scene/lib/ai/tools/` для использования новых методов API
- Найти и обновить все references на старые методы SceneAPI в AI tools
- Обеспечить что AI агенты используют новые унифицированные методы
- Протестировать AI интеграцию с новыми методами

### ⏳ Фаза 6: Обновление ScriptingPanel и автокомплита
- Обновить автокомплит в `apps/qryleth-front/src/features/scene/ui/ScriptingPanel/` для новых методов
- Обновить `completionData.ts` с новыми сигнатурами методов
- Обновить подсказки и документацию в ScriptingPanel
- Обновить `scriptTemplates.ts` для использования новых методов
- Проверить все существующие шаблоны скриптов на совместимость
- Протестировать автокомплит и подсказки в ScriptingPanel

### ⏳ Фаза 7: Обновление документации и финальное тестирование
- Обновить API документацию для новых методов
- Создать руководство по миграции с старых методов на новые
- Добавить примеры использования новых стратегий размещения
- Провести полное регрессионное тестирование всех сценариев создания объектов
- Обновить основную проектную документацию в docs/