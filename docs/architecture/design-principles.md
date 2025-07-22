# Architecture Design Principles / Принципы проектирования архитектуры

## Purpose / Цель документа

This document describes **unified recommendations** for UI developers and **AI agents** (chat assistant) to keep the Qryleth 3D editor code _modular, scalable, and performant_.

Этот файл описывает **единые рекомендации** для разработчиков UI и **AI‑агентов** (чат‑ассистента), чтобы код 3D‑редактора Qryleth оставался _модульным, масштабируемым и производительным_.

---

## 1. Directory Structure (Feature-Sliced Design) / Дерево каталогов (feature‑sliced)

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
   ├─ primitive
   ├─ object
      ├─ object-instance
   ├─ layer   
├─ boundaries/     # wrappers over REST, Dexie / обёртки над REST, Dexie
└─ shared/         # UI atoms, hooks, utilities, theme / ui‑атомы, хуки, утилиты, тема
```

**Access Rule / Правило доступа**: A layer can only import from what is **below** (or at the same level) to avoid circular dependencies.

*Правило доступа*: слой может импортировать только то, что **ниже** (или на том же уровне), чтобы избежать циклов.

---

## 2. Layer Responsibilities / Роли слоёв

| Layer / Слой   | Responsibility / Ответственность          | Dependencies / Зависимости |
|----------------|-------------------------------------------|----------------------------|
| **entities**   | Types, algorithms, Dexie schemas / Типы, алгоритмы, схемы Dexie | – |
| **shared**     | UI atoms, common hooks/utilities / UI атомы, общие хуки/утилиты | entities |
| **features**   | Business logic; slice‑store; UI molecules / Бизнес‑логика; slice‑store; UI молекулы | entities, shared |
| **widgets**    | Combine multiple features into cohesive blocks / Собирают несколько features в цельный блок | features, shared |
| **pages**      | Combine widgets + page‑scope providers / Комбинируют widgets + page‑scope провайдеры | all below / всё ниже |
| **boundaries** | Encapsulate third-party SDKs/APIs / Инкапсулируют сторонние SDK/API | entities |

---

## 3. AI Agent Guidelines / Руководство для AI‑агентов

| Task / Задача | Implementation Location / Где реализуется | Details / Детали |
|---------------|---------------------------------------------|------------------|
| Command mapping ↔ Redux/Zustand actions / Маппинг команд ↔ Redux/Zustand действий | `features/ai-assistant/hooks/useAICommands.ts` | Add `execute<Command>` and register in `switch` / Добавьте `execute<Команда>` и зарегистрируйте в `switch` |
| Creating new objects / Создание новых объектов | `command.type === "addNewObject"` | Use factory without direct Three.js import / Используйте фабрику без прямого импорта Three.js |
| Modifying lighting / Изменение освещения | `modifyLighting` | Mutate zustand‑store `globalLighting` / Мутируйте zustand‑store `globalLighting` |
| Creating layers / Создание слоёв | `createLayer` | Return created **Layer** for AI response / Возвращайте созданный **Layer** для отклика АИ |

> **Don't** call UI directly; agent works only through public store actions.
> 
> **Не** вызывайте UI напрямую; агент работает только через публичные actions stores.

---

## 4. Application State / Состояние приложения

* **Zustand** — `features/scene/store/*`  
  *Selectors* reduce re-renders / *селекторы* уменьшают перерисовки:

  ```ts
  const selectedIds = useSceneStore(s => s.selectedObjects);
  ```

* **TanStack Query** — server data (`/api/scenes`, `/api/library`) / серверные данные
* **useReducer** — complex local state inside ObjectEditor / сложное локальное состояние внутри ObjectEditor
* UI details (`isModalOpen`) — regular `useState` / UI‑мелочи — обычный `useState`

---

## 5. Deep Nesting Management (> 5 levels) / Работа с глубокой вложенностью (> 5 уровней)

* **Compound‑components** instead of "prop‑drilling" / вместо «prop‑матрёшки»
* **`use-context-selector`** — select exact fields from context / выбор точных полей из контекста
* **Portals** (Mantine `<Modal/>`, context menu) render DOM nodes to root / выводят DOM‑узлы на корень
* Canvas is at the top level, only virtual R3F nodes go inside / Canvas находится на верхнем уровне, а внутрь уходят **только** виртуальные R3F‑узлы

---

## 6. Performance / Производительность

* **react‑virtual** for lists > 1000 items / для списков > 1000 эл‑тов
* `InstancedMesh`, `bounds-culled` — for mass instances / для массовых инстансов
* `React.memo` + custom comparator for checklist maps / + кастомный компаратор карт чек‑листов
* Lazy‑chunks (`React.lazy`) for heavy pages/Three.js tools / для тяжёлых страниц/three.js тулов

---

## 7. Error Handling & Monitoring

* `app/providers/ErrorBoundary` covers entire tree / охватывает всё дерево
* `shared/hooks/useErrorHandler` — popup notifications + Sentry / всплывающие нотификации + Sentry
* Surround agent logic with `try/catch`, return `AIResponse.success=false` / Логика агентов окружайте `try/catch`, возвращайте `AIResponse.success=false`

---

## 8. Testing / Тестирование

| Level / Уровень | Tool / Инструмент | What to Check / Что проверяем |
|-----------------|-------------------|-------------------------------|
| Utils/Hooks     | Vitest           | Math, selection, useObjectManip |
| Components      | RTL              | Render, interactions / Рендер, интеракции |
| E2E             | Playwright       | "Create scene → save" / «Создать сцену → сохранить» |

---

## 9. Making Changes / Внесение изменений

1. **Create feature‑branch** and add unit tests / **Создай feature‑ветку** и добавь юнит‑тесты
2. Follow **layer access rule** / Следи за **правилом доступа слоёв**
3. Pass code‑review: architecture, types, reusability / Пройди code‑review: архитектура, типы, повторное использование
4. Update this document if public API or structure changes / Обнови этот документ, если меняется публичный API или структура

---

> ✨ **By following these principles, we keep Qryleth code resilient to growth, and AI agent integration remains safe and predictable.**
> 
> ✨ **Соблюдая эти принципы, мы держим код Qryleth устойчивым к росту, а интеграция AI‑агентов остаётся безопасной и предсказуемой.**