---
id: 30
epic: null
title: "Процедурная генерация облаков и глобальный ветер"
status: in-progress
created: 2025-09-04
updated: 2025-09-04
owner: team-ui
tags: [frontend, r3f, threejs, scene, environment, clouds]
phases:
  total: 4
  completed: 4
---

# Процедурная генерация облаков и глобальный ветер

## Обязательная информация
!Правила работы с агентскими задачами: [agent-tasks.md](../../../../docs/development/workflows/agent-tasks.md)
**ВАЖНО**: При выполнении каждой из фаз необходимо обязательно сверяться с требованиями и принципами из указанного файла, а также с [design-principles.md](../../../../docs/architecture/design-principles.md).

## Цели
- Ввести глобальный ветер сцены с нотацией `direction: [x,z]` (нормализованный) и `speed: number` (юниты/сек) и использовать его для дрейфа облаков.
- Добавить новый тип слоя `GfxLayerType.Clouds` и доменные типы облаков.
- Реализовать процедурный генератор облаков с детерминированностью по `seed` и дефолтным числом облаков = 5.
- Расширить `SceneAPI` методами управления ветром и процедурной генерацией облаков.
- Обновить рендер: рисовать слои облаков и анимировать дрейф по ветру. При отсутствии настроек облаков — оставлять пустое небо.

## Контекст
- Текущее решение содержит один хардкодный компонент облака (`CloudLayer.tsx`), не масштабируемый и не процедурный.
- Архитектура террейнов/биомов уже опирается на спецификации, генераторы и `SceneAPI` — облака должны следовать той же парадигме.
- Требования заказчика:
  - Нотация ветра: `direction: [x,z]` (нормализованный), `speed: number`.
  - Облака — полноценный слой сцены (`GfxLayerType.Clouds`).
  - Генерация детерминированная по `seed`, страты/кластеры не нужны.
  - При отсутствии настроек облаков не рендерить их (пустое небо).
  - По умолчанию генерировать 5 облаков.

## Список фаз

### ⏳ Фаза 1: Модели слоя облаков и глобальный ветер в store
Постановка:
- Ввести доменную модель слоя облаков и глобальные параметры ветра в Zustand‑store сцены. Сохранить полную обратную совместимость сериализации: старые сцены без `environment` и без слоёв облаков должны загружаться без ошибок, рендер остаётся неизменным.

Требования:
- Расширить перечисление типов слоёв: добавить `Clouds` в `GfxLayerType`.
- Расширить тип слоя `GfxLayer`: добавить поле `clouds?: GfxCloudsConfig`.
- Добавить доменные типы облаков в `apps/qryleth-front/src/entities/cloud/model/types.ts`:
  - `GfxCloudItem` — единичное облако: `id: string`, `seed?: number`, `position: [number, number, number]`, `rotationY?: number`, а визуальные параметры (форма/объём/прозрачность/цвет/динамика) — как результат вычисления генератором из метапараметров `appearance` (см. Фаза 2). Допускаются точечные переопределения через `advancedOverrides?`.
  - `GfxCloudsConfig` — коллекция облаков слоя: `{ items: GfxCloudItem[] }`.
- Добавить глобальный ветер в Zustand‑store:
  - В `SceneStoreState` — `environment: { wind: { direction: [number, number]; speed: number } }`.
  - Инициализация по умолчанию: `direction: [1,0]`, `speed: 0.2`.
  - Экшены: `setWind(direction, speed)`, `setWindDirection(direction)`, `setWindSpeed(speed)` с нормализацией direction (длина=1) и проверкой `speed ≥ 0`. Подробные русскоязычные комментарии к каждому методу.
  - Селектор: `useSceneWind`.
- Сериализация/загрузка/очистка сцены: включить `environment` в `getCurrentSceneData()`, `loadSceneData()`, `clearScene()`.
- Рендер и генерацию не менять на этой фазе.

Критерии приёмки:
- Сборка/линт зелёные; типы корректны.
- `useSceneStore.getState().environment.wind` по умолчанию `[1,0]` и `0.2`.
- Методы `setWind*` нормализуют направление, валидируют скорость и обновляют состояние; селектор отдаёт актуальное значение.
- Сериализация/загрузка/очистка корректно обрабатывают `environment`.

Изменяемые файлы (план):
- `apps/qryleth-front/src/entities/layer/model/types.ts`
- `apps/qryleth-front/src/entities/cloud/model/types.ts` (новый)
- `apps/qryleth-front/src/features/editor/scene/model/store-types.ts`
- `apps/qryleth-front/src/features/editor/scene/model/sceneStore.ts`

Риски:
- Не нарушить обратную совместимость сериализации; все новые поля — опциональные, с дефолтами.

### ⏳ Фаза 2: Процедурный генератор облаков и методы SceneAPI
Постановка:
- Реализовать процедурный генератор облаков с детерминированностью по `seed` и публичные методы `SceneAPI` для управления ветром и облачными слоями, включая массовую генерацию. По умолчанию генерировать 5 облаков, если `count` не задан.

Требования:
- Типы спецификаций в `entities/cloud/model/types.ts`:
  - `GfxProceduralCloudSpec`:
    - `seed?: number` (при отсутствии генерируется утилитой RNG, как в террейне);
    - `count?: number | [number, number]` (дефолт 5);
    - `area: { kind:'rect', xMin, xMax, zMin, zMax } | { kind:'circle', center:[x,z], radius }`;
    - `altitudeY: number | [number, number]`;
    - Метапараметры внешнего вида (генерируют конкретные поля детерминированно по `seed`):
      - `appearance?: {`
      - `  stylePreset?: 'cumulus' | 'stratus' | 'cirrus' | 'storm'`,
      - `  sizeLevel?: 1 | 2 | 3 | 4 | 5`,
      - `  softnessLevel?: number /* 0..1 */`,
      - `  dynamicsLevel?: number /* 0..1 */`,
      - `  colorTone?: 'white' | 'warm' | 'cold' | 'sunset'`,
      - `  variance?: number /* 0..1, степень разброса */`
      - `}`
    - Примечание: конкретные параметры `<Cloud>` (`segments`, `bounds`, `volume`, `opacity`, `color`, `growth`, `animationSpeed`, `driftFactor`, `rotationY`) вычисляются генератором на основе метапараметров и `seed`. Для продвинутого использования допускается необязательный блок `advancedOverrides?` с частичным переопределением конкретных полей.
    - `placement: 'uniform' | 'poisson' | 'gridJitter'` (+ `minDistance?` для poisson, `cell?/jitter?` для gridJitter).
- Генератор `features/editor/scene/lib/clouds/ProceduralCloudGenerator.ts` (новый):
  - `generateClouds(spec): GfxCloudsConfig`;
  - PRNG: `xfnv1a`/`createRng` для детерминизма, равномерный выбор из диапазонов;
  - Размещение: uniform, poisson (мин. дистанция), gridJitter;
  - Если `spec.area` отсутствует — попытаться получить мировые размеры из первого Landscape/Terrain слоя (как в террейне) и построить прямоугольную область.
- SceneAPI (`features/editor/scene/lib/sceneAPI.ts`):
  - Ветер: `getWind()`, `setWind(...)`, `setWindDirection(...)`, `setWindSpeed(...)`.
  - Облака/слои: `getCloudLayers()`, `createCloudLayer(...)`, `updateCloudLayer(...)`, `removeCloudLayer(...)`.
  - Генерация: `generateProceduralClouds(spec, { layerId?, clearBefore? })` → создаёт/находит слой типа `Clouds`, очищает по флагу, добавляет сгенерированные `items`, сохраняет историю, помечает сцену как изменённую.
- Полные русскоязычные комментарии ко всем методам.

Критерии приёмки:
- Повторный вызов генерации с одинаковым `seed` и параметрами создаёт идентичный набор `items`.
- Поддерживается создание нового слоя облаков при отсутствии `layerId`; при наличии — запись в указанный слой.
- Методы ветра валидируют входные данные и обновляют состояние.
- Сборка/линт зелёные.

Изменяемые файлы (план):
- `apps/qryleth-front/src/entities/cloud/model/types.ts`
- `apps/qryleth-front/src/features/editor/scene/lib/clouds/ProceduralCloudGenerator.ts` (новый)
- `apps/qryleth-front/src/features/editor/scene/lib/sceneAPI.ts`

Риски:
- Удерживать стабильные и документированные сигнатуры SceneAPI.

### ⏳ Фаза 3: Рендер слоёв облаков и дрейф по ветру
Постановка:
- Реализовать рендер облаков как отдельных слоёв сцены и анимацию дрейфа по глобальному ветру. При отсутствии слоёв облаков — оставлять пустое небо.

Требования:
- Новый компонент `features/editor/scene/ui/renderer/environment/CloudLayers.tsx`:
  - Чтение `layers` и `environment.wind` из стора;
  - Для каждого слоя `type === GfxLayerType.Clouds` рендерить `<Clouds>` контейнер и внутри `items.map(...)` → `<Cloud .../>` (из @react-three/drei) с параметрами, полученными из генератора на основе `appearance` (позиция/поворот берутся из `GfxCloudItem`, визуальные свойства — из рассчитанных значений или `advancedOverrides`).
  - Дрейф: смещать контейнер слоя на каждом кадре по формуле `pos += wind.direction * wind.speed * dt` (вариативность допускается через коэффициент, рассчитанный генератором из `appearance` или переопределённый в `advancedOverrides`).
  - Комментарии на русском к логике анимации и влиянию ветра.
- Интеграция в сцену:
  - В `SceneContent.tsx` заменить текущий `CloudLayer` на `CloudLayers`;
  - Если слоёв облаков нет — ничего не рендерить.
- Старый компонент `CloudLayer.tsx` больше не импортировать (сам файл не удалять в этой фазе, чтобы не раздувать diff).

Критерии приёмки:
- Сцена рендерится без ошибок при отсутствии слоёв облаков.
- При наличии слоя с несколькими `items` — видны несколько облаков с параметрами из конфига.
- Изменение `environment.wind` в рантайме приводит к ожидаемому дрейфу облаков.
- Сборка/линт зелёные.

Изменяемые файлы (план):
- `apps/qryleth-front/src/features/editor/scene/ui/renderer/environment/CloudLayers.tsx` (новый)
- `apps/qryleth-front/src/features/editor/scene/ui/renderer/SceneContent.tsx`

Риски:
- Производительность при большом числе `<Cloud>`; дефолт — 5.

### ⏳ Фаза 4: Документация и примеры использования
Постановка:
- Обновить документацию по новой подсистеме облаков и глобального ветра. Добавить примеры использования SceneAPI.

Требования:
- `docs/README.md`: короткий раздел о слое облаков и глобальном ветре.
- `docs/architecture/design-principles.md`: отметить соответствие архитектуры облаков принципам (процедурные спеки, генераторы, публичный API).
- Примеры:
  - `SceneAPI.setWind([1,0], 0.2)`;
  - `SceneAPI.generateProceduralClouds({
        seed: 123,
        count: 5,
        area: { kind: 'rect', xMin: 0, xMax: 200, zMin: 0, zMax: 200 },
        altitudeY: [120, 160],
        placement: 'poisson',
        minDistance: 25,
        appearance: {
          stylePreset: 'cumulus',
          sizeLevel: 3,
          softnessLevel: 0.7,
          dynamicsLevel: 0.4,
          colorTone: 'warm',
          variance: 0.5
        },
        advancedOverrides: {
          // опционально: точечные корректировки отдельных визуальных полей результата
        }
      })`.
- Критерии приёмки и сценарии проверки детерминированности (одинаковый seed → одинаковый результат).

Критерии приёмки:
- Документация обновлена; примеры проверены; ссылки валидны.

Изменяемые файлы (план):
- `docs/README.md`
- `docs/architecture/design-principles.md`

Риски:
- Следить за единообразием терминов (depth vs height, direction [x,z]).
