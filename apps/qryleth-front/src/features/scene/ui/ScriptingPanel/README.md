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
│   └── completionData.ts    # Данные автокомплита
├── templates/           # Шаблоны скриптов (организованы по группам)
│   ├── index.ts             # Экспорты групп и совместимость
│   ├── types.ts             # Типы TemplateData/TemplateGroup
│   ├── defaultScript.ts     # Дефолтный скрипт редактора
│   └── groups/              # Подпапки с группами шаблонов
│       ├── quickStart.ts         # ⚡️ Быстрый старт
│       ├── landscapes.ts         # 🏞️ Ландшафты (все ландшафтные пресеты)
│       ├── advancedExamples.ts   # 🧠 Продвинутые примеры
│       └── utilities.ts          # 🛠️ Инструменты и утилиты
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
- Открытия модального выбора шаблонов (полноэкранный выбор)

### ScriptEditor
Редактор кода на базе CodeMirror с:
- Подсветкой синтаксиса
- Автокомплитом
- Hover подсказками

### SaveScriptModal
Модальное окно для сохранения/редактирования скриптов.

### TemplatePickerModal
Полноэкранное модальное окно выбора шаблона:
- Слева — группы шаблонов (навигация) с эмодзи и названием,
- Справа — карточки с именем и кратким описанием,
- Кнопка «Выбрать» подставляет код в редактор и закрывает окно.

В левой навигации группы отображаются с эмодзи для быстрого визуального поиска:
- ⚡️ Быстрый старт
- 🏞️ Ландшафты
- 🧠 Продвинутые примеры
- 🛠️ Инструменты и утилиты

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
Создание интерактивных подсказок (единые стили) с информацией о:
- Методах API (из общего источника доков)
- Типах переменных (по анализу кода)

## 🛠️ Утилиты

### tooltipUtils.ts
- `createTooltipDOM()` - создание DOM элементов
- `createStyledTooltip()` - стилизованные подсказки
- `createHoverTooltip()` - hover эффекты

### codeAnalysis.ts
- `analyzeVariableTypes()` - анализ типов переменных
- `extractVariablesFromScript()` - извлечение переменных
- `getMethodInfo()` - получение доки по методу из общего источника



## 🚀 Использование

```javascript
import { ScriptingPanel } from './ScriptingPanel'

<ScriptingPanel height={800} />
```

Все внутренние компоненты также доступны для переиспользования:

```javascript
import { 
  ToolbarPanel, 
  TemplatePickerModal,
  useScriptManager, 
  useCodeCompletion 
} from './ScriptingPanel'
```
## 📦 Типы шаблонов

- `TemplateData` — отдельный шаблон (id, name, description, code).
- `TemplateGroup` — группа шаблонов для навигации слева.
  - Поля: `id`, `emoji`, `title`, `templates`.
  - Эмодзи отображается рядом с названием группы в меню всплывающего окна выбора шаблонов.
