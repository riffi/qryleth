---
id: 28
phase: 5
title: "Фаза 5: Стратифицированные биомы — Итерация 2 (локальные параметры правил)"
status: done
created: 2025-09-02
updated: 2025-09-02
filesChanged: 2
---

# Фаза 5: Локальные параметры GfxBiomePlacementRule

## Что сделано
- Расширен доменный тип правила размещения:
  - `apps/qryleth-front/src/entities/biome/model/types.ts`
    - `GfxBiomePlacementRule` получил поля `densityPer100x100?`, `edge?`, `transform?` с подробными комментариями.
- Добавлена поддержка локальных параметров в оркестраторе скаттеринга:
  - `apps/qryleth-front/src/features/scene/lib/biomes/BiomeScattering.ts`
    - Для каждого правила формируется `localCfg` с переопределением `density/edge/transform`.
    - Детерминизм по правилу: `seed = xfnv1a("<biomeSeed>:<stratumIndex>:<ruleIndex>")`.
    - RNG для трансформаций и взвешенного выбора источников создаётся из локального `seed`.

## Примечания
- Распределение плотности: если у правила `densityPer100x100` не задана, используется доля от глобальной (поровну между всеми правилами всех страт) — совместимость с Фазой 4.
- Источники по-прежнему берутся из глобального фильтра биома; локальный выбор per rule будет в Фазе 6.
- Все функции сохраняют чистоту; математика и RNG — через shared.

## Следующие шаги
- Фаза 6: `sourceSelection` на уровне `GfxBiomePlacementRule` (required/any/exclude/include, weightsByTag/Uuid) и локальный weighted random.

