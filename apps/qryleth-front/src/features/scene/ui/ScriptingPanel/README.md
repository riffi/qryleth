# ScriptingPanel

## 📁 Структура компонента

```
ScriptingPanel/
├── components/           # React компоненты
│   ├── ToolbarPanel.tsx     # Панель инструментов
│   ├── ScriptEditor.tsx     # Редактор кода
│   └── SaveScriptModal.tsx  # Модальное окно сохранения
├── hooks/               # Пользовательские хуки
│   ├── useScriptManager.ts     # Управление скриптами
│   ├── useCodeCompletion.ts    # Автокомплит кода
│   └── useTooltipCreation.ts   # Создание подсказок
├── utils/               # Утилитарные функции
│   ├── tooltipUtils.ts      # Утилиты для tooltip'ов
│   └── codeAnalysis.ts      # Анализ кода
├── constants/           # Константы и конфигурация
│   ├── apiReturnTypes.ts    # Типы возвращаемых API значений
│   ├── tooltipStyles.ts     # Стили для tooltip'ов
│   ├── scriptTemplates.ts   # Шаблоны скриптов
│   └── completionData.ts    # Данные автокомплита
├── index.ts            # Экспорты модуля
└── README.md           # Документация
```

## 🔧 Компоненты

### ToolbarPanel
Панель инструментов с кнопками для:
- Создания нового скрипта
- Загрузки сохраненных скриптов
- Сохранения/редактирования
- Выполнения скрипта

### ScriptEditor
Редактор кода на базе CodeMirror с:
- Подсветкой синтаксиса
- Автокомплитом
- Hover подсказками
- Панелью информации о типах

### SaveScriptModal
Модальное окно для сохранения/редактирования скриптов.

## 🎣 Хуки

### useScriptManager
Управление жизненным циклом скриптов:
- Загрузка списка скриптов
- Сохранение/обновление
- Удаление
- Создание нового

### useCodeCompletion
Система автокомплита с поддержкой:
- API методов SceneAPI
- Переменных из кода
- JavaScript ключевых слов

Поддерживаются унифицированные методы SceneAPI для создания объектов и экземпляров:
- `sceneApi.addInstances(objectUuid, layerId?, count?, { strategy: 'Random' | 'RandomNoCollision' })`
- `sceneApi.createObject(objectData, layerId?, count?, { strategy: 'Random' | 'RandomNoCollision' })`
- `sceneApi.addObjectFromLibrary(objectUuid, layerId?, count?, { strategy: 'Random' | 'RandomNoCollision' })`

Для стратегий размещения используется перечисление стратегий с возможностью расширения метаданных.

### useTooltipCreation
Создание интерактивных подсказок с информацией о:
- Методах API
- Типах переменных
- Свойствах объектов

## 🛠️ Утилиты

### tooltipUtils.ts
- `createTooltipDOM()` - создание DOM элементов
- `createStyledTooltip()` - стилизованные подсказки
- `createHoverTooltip()` - hover эффекты

### codeAnalysis.ts
- `analyzeVariableTypes()` - анализ типов переменных
- `extractVariablesFromScript()` - извлечение переменных
- `analyzeCurrentContext()` - контекстный анализ



## 🚀 Использование

```javascript
import { ScriptingPanel } from './ScriptingPanel'

<ScriptingPanel height={800} />
```

Все внутренние компоненты также доступны для переиспользования:

```javascript
import { 
  ToolbarPanel, 
  useScriptManager, 
  useCodeCompletion 
} from './ScriptingPanel'
```
