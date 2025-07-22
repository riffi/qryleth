# Architecture Design Principles / Принципы проектирования архитектуры

## Purpose / Цель документа

Этот файл описывает **единые рекомендации** для разработчиков UI и **AI‑агентов** (чат‑ассистента), чтобы код 3D‑редактора Qryleth оставался _модульным, масштабируемым и производительным_.

---

## 1. Дерево каталогов (feature‑sliced)

```text
src/
├─ app/            # entry‑point, providers, router / точка входа, провайдеры, роутер
├─ pages/          # SceneEditor, ObjectEditor, Library (route‑shell) / роут‑шелл
├─ features/       # module = scenario / модуль = сценарий
│  ├─ scene/       # scene management / управление сценой
│  ├─ object/      # object operations / операции с объектами
│  ├─ ai-assistant/# chat + LLM commands / чат + команды LLM
│  └─ library/     # local/public library / локальная/публичная библиотека
├─ widgets/        # large self-contained UI blocks / крупные самостоятельные блоки UI
├─ entities/       # pure domain models (without React) / чистые доменные модели (без React)
   ├─ layer
   ├─ lighting
   ├─ object
   ├─ objectInstance
   ├─ primitive
   ├─ scene   
├─ boundaries/     # wrappers over REST, Dexie / обёртки над REST, Dexie
└─ shared/         # UI atoms, hooks, utilities, theme / ui‑атомы, хуки, утилиты, тема
```

*Правило доступа*: слой может импортировать только то, что **ниже** (или на том же уровне), чтобы избежать циклов.

---

## 2. Роли слоёв

| Слой   | Ответственность          | Зависимости |
|----------------|-------------------------------------------|----------------------------|
| **entities**   | Типы, алгоритмы, схемы Dexie | – |
| **shared**     | UI атомы, общие хуки/утилиты | entities |
| **features**   | Бизнес‑логика; slice‑store; UI молекулы | entities, shared |
| **widgets**    | Собирают несколько features в цельный блок | features, shared |
| **pages**      | Комбинируют widgets + page‑scope провайдеры | all below / всё ниже |
| **boundaries** | Инкапсулируют сторонние SDK/API | entities |

---

## 3. Руководство для AI‑агентов

| Задача | Где реализуется | Детали |
|---------------|---------------------------------------------|------------------|
| Маппинг команд ↔ Redux/Zustand действий | `features/ai-assistant/hooks/useAICommands.ts` | Добавьте `execute<Команда>` и зарегистрируйте в `switch` |
| Создание новых объектов | `command.type === "addNewObject"` | Используйте фабрику без прямого импорта Three.js |
| Изменение освещения | `modifyLighting` | Мутируйте zustand‑store `globalLighting` |
| Создание слоёв | `createLayer` | Возвращайте созданный **Layer** для отклика АИ |


> **Не** вызывайте UI напрямую; агент работает только через публичные actions stores.

---

## 4. Состояние приложения

* **Zustand** — `features/scene/store/*`  
  *селекторы* уменьшают перерисовки:

  ```ts
  const selectedIds = useSceneStore(s => s.selectedObjects);
  ```

* **TanStack Query** — server data (`/api/scenes`, `/api/library`) / серверные данные
* **useReducer** — сложное локальное состояние внутри ObjectEditor
* UI‑мелочи (`isModalOpen`)  — обычный `useState`

---

## 5. Работа с глубокой вложенностью (> 5 уровней)

* **Compound‑components** вместо «prop‑матрёшки» 
* **`use-context-selector`** — выбор точных полей из контекста
* **Portals** (Mantine `<Modal/>`, context menu) выводят DOM‑узлы на корень
* Canvas находится на верхнем уровне, а внутрь уходят **только** виртуальные R3F‑узлы

---

## 6. Производительность

* **react‑virtual** для списков > 1000 эл‑тов
* `InstancedMesh`, `bounds-culled` — для массовых инстансов
* `React.memo` + кастомный компаратор карт чек‑листов
* Lazy‑chunks (`React.lazy`) для тяжёлых страниц/three.js тулов

---

## 7. Error Handling & Monitoring

* `app/providers/ErrorBoundary` охватывает всё дерево
* `shared/hooks/useErrorHandler` — всплывающие нотификации + Sentry
*  Логику агентов окружайте `try/catch`, возвращайте `AIResponse.success=false`

---

## 8. Тестирование

| Уровень | Инструмент | Что проверяем |
|-----------------|-------------------|-------------------------------|
| Utils/Hooks     | Vitest           | Math, selection, useObjectManip |
| Components      | RTL              | Render, interactions |
| E2E             | Playwright       |  «Создать сцену → сохранить» |

---

## 9. Внесение изменений

1. **Создай feature‑ветку** и добавь юнит‑тесты
2. Следи за **правилом доступа слоёв**
3. Пройди code‑review: архитектура, типы, повторное использование
4. Обнови этот документ, если меняется публичный API или структура

---


> ✨ **Соблюдая эти принципы, мы держим код Qryleth устойчивым к росту, а интеграция AI‑агентов остаётся безопасной и предсказуемой.**
