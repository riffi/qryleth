# Документация Qryleth

Добро пожаловать в документацию монорепозитория Qryleth. Этот проект содержит несколько приложений, включая 3D редактор с интеграцией ИИ.

## Структура монорепозитория

- **`apps/qryleth-front/`** - Основное фронт-приложение 3D редактора
- **`docs/`** - Документация проекта
- **`agent-content/`** - Контент для работы ИИ агентов(задачи и обсуждения)

---

## 🚀 Быстрый старт

- **[Getting Started](getting-started/README.md)** - Установка и первые шаги
- **[Project Structure](getting-started/project-structure.md)** - Понимание структуры кода

---

## 📚 Терминология

- **[Terminology](getting-started/terminology.md)** Основные термины проекта

## 🏗️ Архитектура

- **[Design Principles](architecture/design-principles.md)** - Основные архитектурные принципы
- **[Feature-Sliced Design](architecture/feature-sliced-design.md)** - Детали реализации FSD (обновлено с новой Chat архитектурой)
- **[Component Patterns](architecture/patterns/component-patterns.md)** - Паттерны React компонентов

### 🆕 Недавние изменения

- Сводка обновлений и рефакторингов перенесена в отдельный документ:
  - [Changelog](changelog.md)

---

## 🔌 Справочник API

### Типы
- **[Type System Overview](api/types/README.md)** - Полное руководство по системе типов
- **[Layers](api/types/layers.md)** - Слои сцены и перечисление GfxLayerType
- 🆕 **[Terrain](api/types/terrain.md)** - Конфигурация террейна и сэмплер высот

### Управление состоянием
- **[Stores Overview](api/stores/README.md)** - Документация Zustand хранилищ
- **[Scene Store](api/stores/scene-store.md)** - Управление состоянием сцены
- **[Scene API](api/scene-api.md)** - Методы взаимодействия со сценой

### Компоненты
- **[Component Library](api/components/README.md)** - Переиспользуемые компоненты
- **[Chat Components](api/components/chat-components.md)** - Компоненты чата и системы панелей (новое)
- **[Scene Editor](api/components/scene-editor.md)** - Компоненты редактора сцены
 - 🆕 **[Object Preview Card](api/components/object-preview-card.md)** - Карточка с превью и hover‑препросмотром
 - 🆕 **[OffscreenObjectRenderer](api/libs/offscreen-object-renderer.md)** - Утилита генерации PNG превью
 - 🆕 **[Library Browser](api/components/object-library.md)** — вкладки «Сцены/Объекты», поиск и списки

---

## ✨ Функциональность

### Управление сценой
- **[Overview](features/scene-management/README.md)** - общая информация
- **[Scene Creation](features/scene-management/scene-creation.md)** - Создание и управление сценами
- **[Object Placement](features/scene-management/object-placement.md)** - Управление объектами
- **[Lighting System](features/scene-management/lighting-system.md)** - Управление освещением
- **[Scripting Panel](features/scene-management/scripting-panel.md)** - Выполнение пользовательских скриптов
- **[Keyboard Shortcuts](features/scene-management/keyboard-shortcuts.md)** - Клавиатурные сокращения
- 🆕 **[Terrain System](features/scene-management/terrain-system.md)** - Ландшафтные слои, heightmaps, модификации

### Редактирование объектов
- **[Overview](features/object-editing/README.md)** - общая информация
- **[Keyboard Shortcuts](features/object-editing/keyboard-shortcuts.md)** - Горячие клавиши редактора объектов
 - 🆕 **[Генерация деревьев и оптимизация](../docs/graphics/tree-generation.md)** — типы, параметры, инстанс‑рендер

### Библиотека объектов
- 🆕 **[Превью и препросмотр](features/object-library/README.md)** — offscreen PNG и интерактивный hover‑облёт камеры

### Интеграция ИИ
- **[LLM Integration](features/ai-integration/llm-integration.md)** - Настройка языковой модели
- **[Provider Connections](features/ai-integration/provider-connections.md)** - Управление подключениями к LLM

---

## 🛠️ Разработка

### Рабочие процессы
- **[Agent Tasks](development/workflows/agent-tasks.md)** - Система агентских задач
- [agent-discussion.md](development/workflows/agent-discussion.md) - Система обсуждения задачи агентами
### Правила документации
- **[Doc Style Guide](doc-style-guide.md)** - Правила структуры и содержания документации
### Тестирование
@TODO

---

## 🚢 Развертывание

@TODO

---

## 📎 Дополнительные материалы

- 🧭 Координатная система террейна: features/scene-management/terrain-coordinates.md
- ☁️ Типы и область размещения облаков: api/types/clouds.md
- 🌊 Типы воды и поверхности водоёмов: api/types/water.md

## 🔄 Миграции

- 024 — terrain-coordinates-refactor: migrations/024-terrain-coordinates-refactor.md
- 027 — editor-object-namespace-finalize: migrations/027-editor-object-namespace-finalize.md

---

## Облака и глобальный ветер (новое)

- Добавлен новый тип слоя сцены `Clouds` и процедурная генерация облаков на основе метапараметров `appearance` (preset/size/softness/dynamics/color/variance) с детерминированностью по `seed`.
- Введён глобальный ветер сцены `environment.wind` (`direction: [x,z]`, `speed`), влияющий на дрейф облаков.
- SceneAPI расширен методами: `getWind`, `setWind`, `setWindDirection`, `setWindSpeed`, `generateProceduralClouds`, а также CRUD для слоёв `Clouds`.

### Примеры использования

```ts
// Управление ветром сцены
SceneAPI.setWind([1, 0], 0.2)           // направление X, скорость 0.2 юн/сек
SceneAPI.setWindDirection([0.5, 0.5])   // нормализуется автоматически
SceneAPI.setWindSpeed(0.3)              // неотрицательная

// Процедурная генерация облаков (5 штук по умолчанию)
SceneAPI.generateProceduralClouds({
  seed: 123,
  count: 5,
  // Явная область размещения (Rect2D): x,z — левый‑нижний угол; width — по X; depth — по Z
  area: { kind: 'rect', x: -150, z: -100, width: 300, depth: 200 },
  // Альтернатива — круглая область (Circle2D):
  // area: { kind: 'circle', x: 0, z: 0, radius: 140 }
  // Примечание: area можно опустить — подставится прямоугольник из первого Terrain‑слоя
  placement: 'poisson',
  minDistance: 25,
  altitudeY: [120, 160],
  appearance: {
    stylePreset: 'cumulus',
    sizeLevel: 3,
    softnessLevel: 0.7,
    dynamicsLevel: 0.4,
    colorTone: 'warm',
    variance: 0.5
  },
  // для точечной настройки конкретных визуальных полей допускается advancedOverrides
}, { clearBefore: true })
```

Примечания:
- Если `area` не указана, подставляется прямоугольная область по размерам первого Terrain‑слоя.
- Визуальные поля `<Cloud>` вычисляются из `appearance` и попадают в `advancedOverrides` каждого элемента.
