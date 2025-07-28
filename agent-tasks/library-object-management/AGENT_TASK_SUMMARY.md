# Доработка функционала управления объектами библиотеки

**Ссылка на правила**: [agent-tasks.md](../../docs/development/workflows/agent-tasks.md)

> ⚠️ **ВАЖНО**: При выполнении каждой фазы обязательно сверяйтесь с требованиями из документа правил агентских задач.

## Контекст задачи

В настоящее время система управления объектами библиотеки имеет следующие недостатки:

1. **Отсутствие отслеживания связи между sceneObject и библиотекой** - объекты сцены не помечаются как добавленные из библиотеки с соответствующим UUID
2. **Дублирование в выпадающих меню** - объекты, уже сохраненные в библиотеку, продолжают отображаться в контекстном меню для повторного сохранения
3. **Показ уже добавленных объектов в модальном окне** - при открытии окна добавления из библиотеки отображаются объекты, которые уже присутствуют в сцене
4. **Самописный код вместо API** - добавление объектов из библиотеки использует кастомную логику вместо методов sceneAPI

### Текущая архитектура

**Основные компоненты:**
- `SceneObjectManager.tsx` - менеджер объектов сцены с контекстными меню
- `SceneObjectItem.tsx` - компонент отдельного объекта
- `AddObjectFromLibraryModal.tsx` - модальное окно добавления из библиотеки
- `sceneAPI.ts` - API для работы с объектами сцены 
- `sceneStore.ts` - Zustand хранилище состояния сцены
- `database.ts` - IndexedDB для хранения объектов библиотеки

**Ключевые структуры данных:**
```typescript
interface ObjectInfo {
  name: string
  count: number
  visible: boolean
  objectUuid: string
  instances?: ObjectInstance[]
  layerId?: string
  // ОТСУТСТВУЕТ: libraryUuid - связь с библиотекой
}

interface ObjectRecord {
  id?: number
  name: string
  objectData: any
  description?: string
  thumbnail?: string
  createdAt: Date
  updatedAt: Date
}
```

## План выполнения по фазам

### Фаза 1: Добавление поддержки libraryUuid в sceneObject 
**Статус**: Запланировано  
[Подробности фазы 1](phases/phase_1_summary.md)

- Расширить интерфейс `ObjectInfo` для добавления поля `libraryUuid?: string`
- Обновить типы в `sceneStore.ts` и связанных файлах
- Модифицировать методы создания объектов для поддержки `libraryUuid`
- Обеспечить обратную совместимость с существующими объектами

### Фаза 2: Обновление логики сохранения объектов в библиотеку 
**Статус**: Запланировано  
[Подробности фазы 2](phases/phase_2_summary.md)

- Модифицировать `SaveObjectDialog.tsx` для возврата UUID сохраненного объекта
- Обновить обработчик `handleSaveObject` в `SceneObjectManager.tsx`
- Добавить обновление `libraryUuid` в sceneObject после успешного сохранения
- Тестирование функционала сохранения

### Фаза 3: Скрытие пункта "Сохранить в библиотеку" для объектов из библиотеки 
**Статус**: Запланировано

[Подробности фазы 3](phases/phase_3_summary.md)

- Модифицировать `SceneObjectItem.tsx` для проверки наличия `libraryUuid`
- Условно скрывать пункт меню "Сохранить в библиотеку" если объект уже в библиотеке
- Добавить визуальный индикатор объектов из библиотеки (опционально)
- Тестирование отображения меню

### Фаза 4: Фильтрация объектов в модальном окне добавления 
**Статус**: Запланировано  
[Подробности фазы 4](phases/phase_4_summary.md)

- Модифицировать `AddObjectFromLibraryModal.tsx` для получения списка объектов сцены
- Добавить логику фильтрации объектов по `libraryUuid`
- Исключить из отображения объекты, которые уже добавлены в сцену
- Обновить интерфейс для корректной передачи данных о сцене

### Фаза 5: Перенос методов поиска и добавления из objectTools в sceneAPI 
**Статус**: Запланировано 
[Подробности фазы 5](phases/phase_5_summary.md)

- Создать методы `searchObjectsInLibrary` и `addObjectFromLibrary` в `sceneAPI.ts`
- Перенести логику из `searchObjectsInLibraryTool` и `addObjectFromLibraryTool`
- Добавить поддержку `libraryUuid` в метод `addObjectFromLibrary`
- Обновить `objectTools.ts` для использования новых методов sceneAPI
- Обновить `SceneObjectManager.tsx` для использования sceneAPI методов

### Фаза 6: Доработка документации
**Статус**: Запланировано 
[Подробности фазы 6](phases/phase_6_summary.md)

- Обновить документацию в docs согласно выполненным доработкам в рамках агентской задачи

## Технические детали реализации

### Изменения в структурах данных
```typescript
// Обновленный интерфейс ObjectInfo
interface ObjectInfo {
  name: string
  count: number
  visible: boolean
  objectUuid: string
  instances?: ObjectInstance[]
  layerId?: string
  libraryUuid?: string  // НОВОЕ ПОЛЕ
}
```

### Перенос методов из objectTools в sceneAPI
Методы поиска и добавления из библиотеки уже реализованы в `objectTools.ts`:
- `searchObjectsInLibraryTool` - поиск объектов в библиотеке
- `addObjectFromLibraryTool` - добавление объекта из библиотеки

Необходимо:
1. Перенести логику этих методов в `sceneAPI.ts`
2. Обновить `objectTools.ts` для использования методов sceneAPI
3. Добавить поддержку `libraryUuid` в новые методы

### Новые методы sceneAPI
```typescript
// Методы для работы с библиотекой
searchObjectsInLibrary(query: string): Promise<ObjectRecord[]>
addObjectFromLibrary(objectUuid: string, layerId: string, transform?: Transform): Promise<AddObjectResult>
```

### Логика фильтрации
```typescript
// Фильтрация в модальном окне
const availableObjects = allObjects.filter(obj => 
  !sceneObjects.some(sceneObj => sceneObj.libraryUuid === obj.id?.toString())
)
```

## Ожидаемые результаты

После выполнения всех фаз:

1. ✅ Объекты сцены будут содержать информацию о связи с библиотекой через `libraryUuid`
2. ✅ Объекты, уже сохраненные в библиотеку, не будут показывать пункт "Сохранить в библиотеку" в контекстном меню
3. ✅ Модальное окно добавления из библиотеки не будет показывать объекты, уже присутствующие в сцене
4. ✅ Добавление объектов из библиотеки будет использовать унифицированный sceneAPI метод
5. ✅ Система будет поддерживать обратную совместимость с существующими сценами

## Связанные файлы и компоненты

- `src/features/scene/ui/objectManager/SceneObjectManager.tsx` - основной менеджер
- `src/features/scene/ui/objectManager/SceneObjectItem.tsx` - компонент объекта  
- `src/features/scene/ui/objectManager/AddObjectFromLibraryModal.tsx` - модальное окно
- `src/features/scene/lib/sceneAPI.ts` - API для работы с объектами
- `src/features/scene/lib/ai/tools/objectTools.ts` - AI инструменты для работы с объектами
- `src/features/scene/model/sceneStore.ts` - хранилище состояния
- `src/shared/lib/database.ts` - база данных библиотеки
- `src/shared/ui/SaveObjectDialog.tsx` - диалог сохранения
