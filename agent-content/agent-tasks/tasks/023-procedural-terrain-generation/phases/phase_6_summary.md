# Фаза 6: Обновление ScriptingPanel и AI подсказок — отчёт

## Выполнено

- useAIScriptGenerator.ts — расширен системный промпт (buildSystemPrompt):
  - Добавлены описания новых методов SceneAPI: generateProceduralTerrain, generateTerrainOpsFromPool, createProceduralLayer.
  - Добавлены два примера скриптов процедурной генерации (холмы и дюны), совместимые с окружением панели (без import).
- scriptTemplates.ts — добавлены готовые шаблоны для процедурного террейна:
  - export getProceduralTerrainTemplates(mode)
  - Два шаблона: «Холмы» и «Дюны» (JS/TS совместимые фрагменты).
- index.ts модуля ScriptingPanel — экспортированы новые шаблоны.
- completionData.ts — добавлены подсказки автокомплита для новых методов SceneAPI, с описанием параметров и возвращаемых типов.

## Файлы

- Обновлено: apps/qryleth-front/src/features/scene/ui/ScriptingPanel/hooks/useAIScriptGenerator.ts
- Обновлено: apps/qryleth-front/src/features/scene/ui/ScriptingPanel/constants/scriptTemplates.ts
- Обновлено: apps/qryleth-front/src/features/scene/ui/ScriptingPanel/constants/completionData.ts
- Обновлено: apps/qryleth-front/src/features/scene/ui/ScriptingPanel/index.ts

## Примечания

- Примеры в промпте используют прямое составление спецификации объекта без импортов фабрик.
- Шаблоны возвращаются функцией и могут быть подключены в UI по необходимости (кнопки/меню шаблонов вне рамок этой фазы).

## Следующие шаги

- Фаза 7: обновление документации (SceneAPI и раздел террейна) с примерами процедурной генерации.

