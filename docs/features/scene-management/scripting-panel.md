# ScriptingPanel

## Назначение

`ScriptingPanel` предоставляет встроенную панель программирования для 3D-редактора Qryleth, позволяющую пользователям писать, сохранять и выполнять JavaScript-скрипты для автоматизации работы со сценой в реальном времени.

## Основные возможности

- 🎯 **Редактирование кода** с подсветкой синтаксиса JavaScript
- 🧠 **Автодополнение** с поддержкой SceneAPI методов и переменных
- 📦 **Управление скриптами**: сохранение, загрузка, редактирование
- ⚡ **Мгновенное выполнение** с поддержкой `await` на верхнем уровне
- 🤖 **ИИ-генерация скриптов** по текстовому описанию
- 📚 **Встроенные шаблоны** для быстрого старта
- 🔍 **Hover-подсказки** с типами данных и документацией
- 🎮 **Полный доступ к SceneAPI** для управления объектами и террейнами

## Архитектура компонента

```
ScriptingPanel/
├── ScriptingPanel.tsx       # Основной компонент панели
├── components/              # UI компоненты
│   ├── ToolbarPanel.tsx        # Панель инструментов (кнопки управления)
│   ├── ScriptEditor.tsx        # Редактор кода (CodeMirror)
│   └── SaveScriptModal.tsx     # Диалоговое окно сохранения
├── hooks/                   # Пользовательские хуки
│   ├── useScriptManager.ts     # Управление скриптами (CRUD)
│   ├── useCodeCompletion.ts    # Система автодополнения
│   ├── useTooltipCreation.ts   # Создание hover-подсказок
│   └── useAIScriptGenerator.ts # ИИ-генерация скриптов
├── utils/                   # Утилитарные функции
│   ├── sceneApiBridge.ts       # Мост между панелью и SceneAPI
│   ├── codeAnalysis.ts         # Анализ кода и извлечение переменных
│   └── tooltipUtils.ts         # Утилиты для создания tooltip'ов
├── constants/               # Константы и конфигурация
│   ├── scriptTemplates.ts      # Шаблоны скриптов (террейны и объекты)
│   ├── completionData.ts       # Данные для автодополнения API
│   ├── apiReturnTypes.ts       # Схемы типов возвращаемых значений
│   └── tooltipStyles.ts        # Стили для подсказок
├── index.ts                 # Публичные экспорты
└── README.md               # Локальная документация
```

## Пользовательский интерфейс

### Панель инструментов (ToolbarPanel)

**Левая группа кнопок:**
- **"Новый"** - создание нового скрипта
- **"Шаблоны"** - выпадающее меню с готовыми решениями:
  - *Быстрый старт*: простые примеры для знакомства
  - *Готовые решения*: долины, острова, архипелаги
  - *Специальные ландшафты*: дюны, кратеры, каньоны
  - *Продвинутые примеры*: горные массивы, побережья
  - *Инструменты и утилиты*: анализ сцены, тестирование
- **Выбор скрипта** - Select для загрузки сохранённых скриптов
- **Меню действий** (если выбран скрипт):
  - Переименовать
  - Удалить

**Правая группа кнопок:**
- **"Сохранить"** - сохранение текущего скрипта
- **"Выполнить"** - запуск скрипта (Ctrl+Enter)

### Панель ИИ-генерации

- **Поле промпта** - многострочный ввод описания желаемых изменений
- **Кнопка "Отправить"** - отправка запроса к активной LLM-модели
- **Индикатор состояния** - загрузка и ошибки генерации

### Редактор кода (ScriptEditor)

Основан на CodeMirror с расширениями:
- **Подсветка синтаксиса** JavaScript
- **Нумерация строк** и сворачивание блоков
- **Автодополнение** SceneAPI методов, переменных из кода, JS ключевых слов
- **Hover-подсказки** с информацией о типах и методах
- **Темная тема** для комфортной работы

## Система автодополнения

### Контекстное автодополнение

**После `sceneApi.`:**
- Все доступные методы SceneAPI с подробными описаниями
- Информация о параметрах и возвращаемых типах
- Примеры использования в подсказках

**После `console.`:**
- Методы консоли: log, error, warn, info, debug, table, clear

**Переменные из скрипта:**
- Автоматическое извлечение объявленных переменных
- Определение типов по присваиваемым значениям
- Подсказки свойств для результатов API-вызовов

**JavaScript ключевые слова:**
- const, let, var, function, return
- if, else, for, while, try, catch
- async, await, true, false, null, undefined

### Умное определение типов

Система анализа кода определяет типы переменных по присваиваниям:

```javascript
const overview = sceneApi.getSceneOverview()
// После "overview." предлагаются: totalObjects, totalInstances, objects, instances, sceneName, layers

const stats = sceneApi.getSceneStats()  
// После "stats.total." предлагаются: objects, instances, layers
```

## Управление скриптами

### Жизненный цикл скриптов (useScriptManager)

**Создание нового скрипта:**
- Очистка редактора
- Установка шаблона по умолчанию
- Сброс состояния выбранного скрипта

**Сохранение скрипта:**
- Валидация имени (обязательное поле)
- Проверка уникальности названия
- Сохранение в IndexedDB через Dexie
- Обновление списка сохранённых скриптов

**Загрузка скрипта:**
- Получение содержимого из базы данных
- Установка в редактор
- Обновление состояния текущего скрипта

**Удаление скрипта:**
- Удаление из базы данных
- Обновление списка
- Сброс состояния если удалён активный скрипт

## ИИ-генерация скриптов

### Возможности useAIScriptGenerator

**Интеграция с LLM:**
- Использование активного подключения из настроек OpenAI
- Прямые HTTP-запросы к совместимым API (OpenAI format)
- Поддержка различных провайдеров (OpenAI, Anthropic, локальные модели)

**Системный промпт:**
- Подробное описание SceneAPI с типами данных
- Правила написания кода для панели скриптинга
- Примеры использования методов
- Антипаттерны и частые ошибки

**Обработка ответов:**
- Извлечение кода из markdown блоков ```
- Определение языка программирования
- Обработка ошибок сети и API

## Выполнение скриптов

### Безопасное выполнение

Скрипты выполняются через `new Function()` с ограниченным контекстом:

```javascript
const asyncScript = `
  return (async () => {
    ${script}  // пользовательский код
  })();
`
const func = new Function('sceneApi', 'console', asyncScript)
const result = await func(sceneApi, window.console)
```

**Доступные переменные:**
- `sceneApi` - мост к SceneAPI (см. sceneApiBridge.ts)
- `console` - console объект браузера для вывода

**Особенности выполнения:**
- Поддержка `await` на верхнем уровне
- Автоматическое логирование результата
- Обработка ошибок с выводом в консоль
- Мгновенное отображение изменений в сцене

## SceneAPI Bridge

### Назначение sceneApiBridge.ts

Поскольку SceneAPI реализован как класс со статическими методами, для использования в скриптах создаётся объект-мост с делегирующими функциями:

```javascript
export function createSceneApiBridge() {
  return {
    getSceneOverview: () => SceneAPI.getSceneOverview(),
    addInstances: (objectUuid, layerId, count, placement) => 
      SceneAPI.addInstances(objectUuid, layerId, count, placement),
    // ... остальные методы
  }
}
```

### Доступные методы в скриптах

**Информация о сцене:**
- `getSceneOverview()` - общая информация с объектами и экземплярами
- `getSceneObjects()` - список всех объектов  
- `getSceneInstances()` - список всех экземпляров
- `getSceneStats()` - статистика (общие/видимые элементы)
- `getAvailableLayers()` - доступные слои

**Поиск объектов:**
- `findObjectByUuid(uuid)` - поиск объекта по UUID
- `findObjectByName(name)` - поиск по имени (частичное совпадение)
- `searchObjectsInLibrary(query)` - поиск в библиотеке объектов

**Создание и размещение:**
- `addInstances(objectUuid, layerId?, count?, placement?)` - создание экземпляров
- `createObject(objectData, layerId?, count?, placement?)` - создание нового объекта
- `addObjectFromLibrary(objectUuid, layerId?, count?, placement?)` - импорт из библиотеки

**Процедурные террейны:**
- `generateProceduralTerrain(spec)` - генерация конфигурации террейна
- `generateTerrainOpsFromPool(pool, seed, opts?)` - генерация операций рельефа  
- `createProceduralLayer(spec, layerData?)` - создание слоя террейна
- `adjustInstancesForPerlinTerrain(terrainLayerId)` - выравнивание объектов

## Шаблоны скриптов

### Категории шаблонов (scriptTemplates.ts)

**🚀 Быстрый старт:**
- "Простые холмы" - базовый пример создания террейна
- "Тестовый террейн" - минимальная конфигурация для отладки

**🎯 Готовые решения:**
- "Долина с горами" - долина с горными цепями по краям
- "Вулканический остров" - остров с кратером и утёсами  
- "Архипелаг островов" - группа островов разного размера
- "Холмистая местность" - мягкие перекатывающиеся холмы

**🏔️ Специальные ландшафты:**
- "Песчаные дюны" - пустынный ландшафт
- "Лунный кратер" - кратерная поверхность
- "Каньон с плато" - система каньонов и плато

**🎨 Продвинутые примеры:**
- "Горный массив" - реалистичная горная система  
- "Прибрежная зона" - изрезанное побережье с бухтами
- "Многоэтапное создание" - пример поэтапной работы

**🛠️ Инструменты и утилиты:**
- "Анализ сцены" - полная диагностика состояния сцены
- "Выравнивание объектов" - привязка к существующему террейну
- "Тест производительности" - бенчмарк генерации террейнов

## Интеграция с Qryleth

### Использование в приложении

```tsx
import { ScriptingPanel } from '@/features/scene/ui/ScriptingPanel'

function App() {
  return (
    <ScriptingPanel height={800} />
  )
}
```

### Настройки окружения

Панель автоматически получает доступ к:
- **Активной сцене** через SceneStore
- **Библиотеке объектов** через IndexedDB/Dexie
- **Настройкам OpenAI** для ИИ-генерации
- **Консоли браузера** для вывода результатов

### Горячие клавиши

- **Ctrl+Enter** - выполнить скрипт
- **F12** - открыть консоль браузера для просмотра результатов
- **Ctrl+A** - выделить весь код  
- **Ctrl+/** - закомментировать/раскомментировать строку

## Примеры использования

### Быстрый анализ сцены

```javascript
const overview = sceneApi.getSceneOverview()
console.log(`Объектов: ${overview.totalObjects}, Экземпляров: ${overview.totalInstances}`)

const stats = sceneApi.getSceneStats()
console.log(`Видимых объектов: ${stats.visible.objects}`)
```

### Создание и размещение объектов

```javascript
// Поиск в библиотеке
const trees = await sceneApi.searchObjectsInLibrary("дерево")
if (trees.length > 0) {
  // Добавление без коллизий
  const result = await sceneApi.addObjectFromLibrary(
    trees[0].uuid,
    undefined, // автоопределение слоя
    5, // количество
    { strategy: 'RandomNoCollision' }
  )
  console.log('Результат:', result)
}
```

### Размещение объектов по кругу

```javascript
const objects = sceneApi.getSceneObjects()
if (objects.length > 0) {
  const result = sceneApi.addInstances(
    objects[0].uuid,
    undefined,
    8, // количество
    {
      strategy: 'PlaceAround',
      metadata: {
        targetObjectUuid: objects[0].uuid,
        minDistance: 2.0,
        maxDistance: 5.0,
        distributeEvenly: true,
        onlyHorizontal: true
      }
    }
  )
  console.log('PlaceAround результат:', result)
}
```

### Создание процедурного террейна

```javascript
const spec = {
  world: { width: 200, height: 200, edgeFade: 0.1 },
  base: { 
    seed: 42, 
    octaveCount: 4, 
    amplitude: 8, 
    persistence: 0.5, 
    width: 64, 
    height: 64 
  },
  pool: {
    global: { intensityScale: 1.0, maxOps: 30 },
    recipes: [
      {
        kind: 'hill',
        count: [10, 15],
        placement: { type: 'uniform' },
        radius: [8, 15],
        intensity: [3, 7],
        falloff: 'smoothstep'
      }
    ]
  },
  seed: 42
}

const result = await sceneApi.createProceduralLayer(spec, { 
  name: 'Холмистый ландшафт', 
  visible: true 
})

console.log('Террейн создан:', result)
```

## Расширение функциональности

### Добавление новых шаблонов

В `scriptTemplates.ts` добавьте новый шаблон в соответствующую категорию:

```javascript
const newCategory = {
  'Мой шаблон': `// Описание шаблона
const mySpec = {
  // конфигурация
}
const result = await sceneApi.createProceduralLayer(mySpec)
console.log(result)`
}
```

### Расширение автодополнения

В `completionData.ts` добавьте новые методы или свойства:

```javascript
{
  label: 'myNewMethod',
  type: 'function', 
  info: createStyledTooltip(`myNewMethod(param: type): ReturnType
Описание: Что делает метод`)
}
```

### Добавление типов возвращаемых значений  

В `apiReturnTypes.ts` опишите схему типов для нового метода:

```javascript
'myNewMethod': {
  properties: {
    'property': { type: 'string', description: 'Описание свойства' },
    'nested': { 
      type: 'object', 
      description: 'Вложенный объект',
      properties: {
        'subProperty': { type: 'number', description: 'Вложенное свойство' }
      }
    }
  }
}
```

ScriptingPanel - это мощный инструмент для автоматизации работы с 3D-сценами в Qryleth, предоставляющий полный программный доступ к функциям редактора через удобный JavaScript-интерфейс.