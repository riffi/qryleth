---
id: 30
phase: 1
title: "Фаза 1: Модели слоя облаков и глобальный ветер в store"
status: done
created: 2025-09-04
updated: 2025-09-04
filesChanged: 6
---

# Фаза 1: Модели слоя облаков и глобальный ветер в store — выполнено

## Краткое резюме
Добавлен новый тип слоя `Clouds` и базовые доменные типы для облаков. В Zustand‑store сцены введён раздел `environment` с глобальным ветром (`direction: [x,z]`, `speed`), реализованы экшены управления ветром и селектор. Сериализация сцены расширена: `environment` участвует в сохранении/загрузке/сбросе. Обратная совместимость сохранена.

## Изменённые файлы
- apps/qryleth-front/src/entities/layer/model/types.ts — добавлены `GfxLayerType.Clouds` и `clouds?: GfxCloudsConfig`.
- apps/qryleth-front/src/entities/cloud/index.ts — новый barrel export.
- apps/qryleth-front/src/entities/cloud/model/types.ts — новые типы `GfxCloudItem`, `GfxCloudsConfig`.
- apps/qryleth-front/src/features/editor/scene/model/store-types.ts — добавлен `environment.wind` и сигнатуры экшенов.
- apps/qryleth-front/src/features/editor/scene/model/sceneStore.ts — инициализация `environment`, экшены `setWind/setWindDirection/setWindSpeed`, сериализация/загрузка/сброс, селектор `useSceneWind`.
- (экспорт селектора) apps/qryleth-front/src/features/editor/scene/model/sceneStore.ts — добавлен `useSceneWind`.

## Примечания по реализации
- Направление ветра нормализуется; нулевой вектор заменяется на [1,0]. Скорость приводится к диапазону [0..∞).
- При загрузке сцены `environment` опционален: если отсутствует — используются дефолты, чтобы не ломать старые сохранения.

## Риски и совместимость
- Все новые поля опциональны. Код, не использующий облака/ветер, не затронут.

