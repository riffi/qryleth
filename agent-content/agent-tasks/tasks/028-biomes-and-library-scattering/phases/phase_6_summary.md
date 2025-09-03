---
id: 28
phase: 6
title: "Фаза 6: Стратифицированные биомы — Итерация 3 (локальный выбор источников)"
status: done
created: 2025-09-02
updated: 2025-09-02
filesChanged: 2
---

# Фаза 6: Локальный выбор источников per GfxBiomePlacementRule

## Что сделано
- Расширён доменный тип правила размещения:
  - `apps/qryleth-front/src/entities/biome/model/types.ts`
    - В `GfxBiomePlacementRule` добавлено поле `sourceSelection?: GfxBiomeSourceFilter`.
- Поддержан локальный выбор источников в оркестраторе скаттеринга:
  - `apps/qryleth-front/src/features/scene/lib/biomes/BiomeScattering.ts`
    - Добавлена функция `filterSourcesByFilter(filter, library)` для применения теговых фильтров/весов.
    - На уровне каждого правила используется `rule.sourceSelection` (если задан) вместо глобального biomes.scattering.sources.
    - Если пул источников пуст после локальной фильтрации — правило пропускается (без ошибок), чтобы не прерывать генерацию других правил/страт.

## Примечания
- Глобальные веса и фильтры bioma продолжают работать в случае отсутствия локального фильтра в правиле.
- Нормализация весов не требуется — применяется стандартный weighted random по суммарным весам.
- Все функции остаются чистыми, shared-утилиты используются по правилам.

## Следующие шаги
- Фаза 7: sceneAPI — создание инстансов из placements, автоподстройка высоты по террейну, методы scatter/regenerate.
- Фаза 8: UI «Биомы» — все операции через sceneAPI.

