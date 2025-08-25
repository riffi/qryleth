---
title: "Фаза 6: Обновление ScriptingPanel и автокомплита"
description: "Автокомплит, подсказки и шаблоны приведены к новым унифицированным методам SceneAPI"
---

# Фаза 6: Обновление ScriptingPanel и автокомплита

В рамках этой фазы ScriptingPanel и система автодополнения приведены в соответствие с новой архитектурой SceneAPI: использованы унифицированные методы создания инстансов и объектов, обновлены сигнатуры и справки, удалены упоминания устаревших методов.

## Изменения по коду

- Обновлен список подсказок методов SceneAPI и их сигнатур:
  - Файл: `apps/qryleth-front/src/features/scene/ui/ScriptingPanel/constants/completionData.ts`
  - Обновлены описания параметров для:
    - `addInstances(objectUuid, layerId?, count?, { strategy: 'Random' | 'RandomNoCollision', metadata?: any })`
    - `createObject(objectData, layerId?, count?, { strategy: 'Random' | 'RandomNoCollision', metadata?: any })`
    - `addObjectFromLibrary(objectUuid, layerId?, count?, { strategy: 'Random' | 'RandomNoCollision', metadata?: any })`
  - Добавлены типы в блок TypeScript-типов: `PlacementStrategy`, `PlacementStrategyConfig`.

- Обновлена карта возвращаемых типов для автокомплита:
  - Файл: `apps/qryleth-front/src/features/scene/ui/ScriptingPanel/constants/apiReturnTypes.ts`
  - Удалены устаревшие ключи: `addObjectInstance`, `addObjectInstances`, `addSingleObjectInstance`, `addRandomObjectInstances`.
  - Добавлены новые: `addInstances`, `createObject`.

- Обновлены контекстные подсказки/hover-инфо по методам:
  - Файл: `apps/qryleth-front/src/features/scene/ui/ScriptingPanel/utils/codeAnalysis.ts`
  - Метод `getMethodInfo` теперь описывает новые сигнатуры `addInstances`, `createObject`, обновлен `addObjectFromLibrary`.
  - Добавлены подробные русскоязычные JSDoc-комментарии к методам анализа.

- Актуализированы шаблоны скриптов:
  - Файл: `apps/qryleth-front/src/features/scene/ui/ScriptingPanel/constants/scriptTemplates.ts`
  - Добавлены подсказки по стратегиям размещения к примерам `addInstances`.

- Обновлена документация ScriptingPanel:
  - Файл: `apps/qryleth-front/src/features/scene/ui/ScriptingPanel/README.md`
  - Добавлен раздел о поддержке унифицированных методов SceneAPI и стратегий размещения.

## Проверки

- Поиском подтверждено отсутствие упоминаний удаленных методов в ScriptingPanel:
  - `addObjectInstance`, `addObjectInstances`, `addSingleObjectInstance`, `addRandomObjectInstances` — не используются.
- Скриптовые шаблоны используют `addInstances` с конфигурацией стратегии.

## Результат

ScriptingPanel и автокомплит полностью соответствуют новым унифицированным методам SceneAPI. Пользователь видит актуальные сигнатуры, корректные подсказки параметров и типов, а также обновленные примеры в шаблонах.

## Готовность к следующей фазе

Готово к фазе 7: обновление общей документации API и финальное тестирование.

