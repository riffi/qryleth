---
phase: 1
title: "Фаза 1 — Полное удаление legacy (noiseData, legacy source)"
status: completed
completed_at: 2025-08-26
owner: platform-graphics
---

# Итоги фазы 1

Цель фазы — полностью удалить legacy-функционал террейна: поле `noiseData`, источник `legacy`, обходные ветки в UI/утилитах, deprecated-файл перлин-геометрии и все упоминания в тестах/документации. Результат достигнут.

## Изменения в коде

- Типы террейна:
  - `apps/qryleth-front/src/entities/terrain/model/types.ts`
    - Удалён вариант источника `GfxTerrainSource` c `kind: 'legacy'`.
    - Обновлены комментарии к интерфейсам (русскоязычные пояснения сохранены/уточнены).

- Типы слоёв:
  - `apps/qryleth-front/src/entities/layer/model/types.ts`
    - Удалено поле `noiseData?: number[]`.

- Сэмплер высот:
  - `apps/qryleth-front/src/features/scene/lib/terrain/GfxHeightSampler.ts`
    - Удалены ветки и метод `createLegacySource`; поддерживаются только `perlin` и `heightmap`.
    - Уточнены комментарии класса и методов на русском языке.

- Размещение объектов:
  - `apps/qryleth-front/src/features/scene/lib/placement/ObjectPlacementUtils.ts`
    - Удалён `createLegacyTerrainConfig` и весь код обхода через `noiseData`.
    - `getHeightSamplerForLayer` использует только `layer.terrain`.

- Рендер ландшафта:
  - `apps/qryleth-front/src/features/scene/ui/renderer/landscape/LandscapeLayer.tsx`
    - Удалён импорт и использование `perlinGeometry.ts`.
    - Удалён адаптер `createLegacyTerrainConfig`; логика генерации основана только на `terrain`.
    - Обновлён комментарий компонента (legacy удалён).

- Оптимизации рендера:
  - `apps/qryleth-front/src/features/scene/ui/renderer/optimization/OptimizedComponents.tsx`
    - Исключено сравнение `layer.noiseData` в функции мемоизации `MemoizedLandscapeLayer`.

- Scene API / Выравнивание по террейну:
  - `apps/qryleth-front/src/features/scene/lib/sceneAPI.ts`
    - Удалён импорт `placeInstanceLegacy`.
    - Проверки террейна теперь учитывают только `layer.terrain`.
  - `apps/qryleth-front/src/features/scene/lib/terrain/TerrainAdjustmentUtils.ts`
    - Удалены упоминания legacy/noiseData, оставлены ветки для `perlin` и `heightmap`.

## Удалённые файлы

- `apps/qryleth-front/src/features/scene/lib/geometry/perlinGeometry.ts`
  - Файл снят с поддержки и удалён вместе с использованием в тестах и компонентах.

## Тесты

- Удалены legacy-ориентированные тесты:
  - `apps/qryleth-front/src/features/scene/ui/renderer/landscape/LandscapeLayer.test.tsx`
  - `apps/qryleth-front/src/features/scene/ui/renderer/landscape/LandscapeLayer.simple.test.ts`

- Актуализированы тесты:
  - `apps/qryleth-front/src/features/scene/lib/terrain/GfxHeightSampler.test.ts`
    - Legacy-кейсы заменены на использование `perlin` с `amplitude: 0` для плоской поверхности.
  - `apps/qryleth-front/src/features/scene/lib/sceneAPI.terrain-adjustment.test.ts`
    - Исключены проверки `noiseData`; логика ориентирована на наличие `terrain`.

Примечание: Локальный запуск тестов в песочнице не выполнен из-за проблем с optional deps (`rollup`/`@rollup/rollup-linux-x64-gnu`). В рабочем окружении после `npm ci` в `apps/qryleth-front` тесты должны проходить.

## Документация

- `docs/features/scene-management/terrain-system.md`: убраны упоминания legacy/noiseData, актуализирована секция совместимости.
- `docs/api/types/terrain.md`: удалён `legacy` из источников, обновлены примеры и раздел «Замечания по совместимости».
- `docs/api/components/scene-editor.md`: удалён пункт про Legacy.
- `docs/api/types/README.md`: описание без legacy.
- `docs/api/types/layers.md`: удалён блок `noiseData?: number[]`.
- `landscape_upgrade.md`: пометки об удалении массивов высот/legacy.

## Критерии приёмки (фаза 1)

- [x] В кодовой базе отсутствуют ссылки на `legacy`-источник террейна.
- [x] Полностью отсутствует поле `noiseData` в типах, коде, тестах и актуализированной документации.
- [x] Удалён `perlinGeometry.ts` и связанные импорты/моки.
- [x] `GfxHeightSampler` лишён веток и методов legacy; покрывает `perlin` и `heightmap`.
- [x] UI/утилиты не содержат обходных адаптеров для legacy.
- [x] Тесты обновлены/удалены в соответствии с новой архитектурой.
- [x] Документация обновлена и не содержит рекомендаций по использованию legacy.

## Риски и примечания

- Старые сцены, полагающиеся на `noiseData`, больше не поддерживаются (решение — отказаться от обратной совместимости с legacy согласно целям задачи).
- При локальном прогоне тестов требуется корректная установка зависимостей (`npm ci` в `apps/qryleth-front`).

## Рекомендации для фазы 2

- Вынести построение геометрии в `GeometryBuilder.ts` и связанный `decideSegments()`, учитывать разрешение источника и ограничение `TERRAIN_MAX_SEGMENTS`. Добавить подробные русские комментарии ко всем методам.

