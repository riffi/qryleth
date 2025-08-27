---
id: 25
epic: null
title: "Fit‑хелперы террейна (ValleyFit/RidgeBandFit), авто‑параметры и бюджет"
status: planned
created: 2025-08-27
updated: 2025-08-27
owner: team-ui
tags: [terrain, scripting-panel, usability, generator, docs]
phases:
  total: 7
  completed: 4
---

# Fit‑хелперы террейна (ValleyFit/RidgeBandFit), авто‑параметры и бюджет

## Контекст

Пользователям ScriptingPanel сложно вручную подбирать низкоуровневые параметры процедурной генерации (`step`, `radius`, `aspect`, `intensity`) для ожидаемой формы рельефа (например, «долина через весь мир» или «гряда по краю»). Это требует расчётов в голове, учёта размеров мира, зоны затухания `edgeFade` и влияния бюджета `pool.global.maxOps`.

Предлагается ввести высокоуровневые «fit‑хелперы», которые принимают простые намерения пользователя ("впиши долину в этот прямоугольник такой толщины и глубины") и автоматически рассчитывают корректные параметры, формируя один или несколько рецептов (`GfxTerrainOpRecipe`) под текущую архитектуру. 

Сопутствующие улучшения:
- Семантика поворота: по умолчанию `rotation` = 0 (вдоль X), `randomRotationEnabled` включает случайный поворот. Уже внедрено в кодовой базе и задокументировано.
- Детальная документация по `step` и бюджету — добавлена.

## Цели
- Спрятать сложность подбора `step/radius/aspect/intensity` за высокоуровневыми API.
- Сделать результат детерминированным и предсказуемым, с учётом `edgeFade` и габаритов мира.
- Облегчить контроль за «бюджетом» операций: оценка, распределение и автоматическое подрезание при нехватке.
- Улучшить UX ScriptingPanel (в т.ч. шаблоны и подсказки).

## Область работ (высокоуровневая спецификация)

Новые хелперы (интерфейсы/намерения):
- Общий принцип: Хелперы НЕ создают террейн/слои. Они возвращают массив рецептов (`GfxTerrainOpRecipe[]`) и вспомогательные оценки/предупреждения. Пользователь/SceneAPI собирают `pool: { global, recipes }` и далее вызывают стандартный пайплайн `createProceduralLayer(...)`.

- ValleyFit(rect, options)
  - Вписывает долину в прямоугольник `rect` (по плоскости XZ) с указанной толщиной и глубиной.
  - `options`: { thickness, depth|prominencePct, direction: 'auto'|'x'|'z'|angle, continuity: 'continuous'|'segmented', variation: 'low'|'mid'|'high', edgeMargin?, budgetShare? }
  - Возвращает набор корректно настроенных рецептов типа `valley` (stroke либо сегментированный набор) для добавления в `pool`, а также оценки: `estimateOps`, `orientation`, `warnings`.

- RidgeBandFit(rect, options)
  - Аналогично для горной гряды/хребта: формирует `ridge` рецепты с автоподбором.
  - При `direction: 'auto'` — автоматически поворачивает гряду вдоль длинной стороны прямоугольника `rect` (вдоль длинной грани области).
  - Возвращает рецепты `ridge` и оценки: `estimateOps`, `orientation`, `warnings`.

Эвристики автоподбора (кратко):
- Ось/угол: if `direction=auto`, ориентируем вдоль длинной стороны `rect`.
- Stroke (ridge/valley): 5 центров на `i ∈ {-2,-1,0,1,2}` → длина покрытия ≈ `4*step + 2*radius`; подобрать `step` и `radius` так, чтобы покрыть длину `L` с перекрытием `k≈0.6..0.8`, при этом `2*step + radius ≤ L/2 - margin`.
- Толщина: `aspect = (thickness/2) / radius` (с обрезкой в разумные пределы 0.3..2.0).
- Интенсивность: по метрам или по доле от базовой амплитуды Perlin с коррекцией близости к краям (учёт `edgeFade`).
- Защита от краёв: уменьшение рабочей зоны на `edgeMargin`.
- Непрерывность: `continuous` → stroke (`step>0`), `segmented` → множество одиночных эллипсов с лёгким jitter.

Бюджет:
- Оценщик «стоимости» рецептов: ridge/valley (stroke) → 5 оп/центр; crater → 2; terrace → ~4; hill/basin/plateau/dune → 1.
- Поддержка `budgetShare` для каждого fit‑элемента и/или `pool.global.maxOps = 'auto'` (выставление бюджета по потребности с запасом).
- При нехватке — приоритетная обрезка: сначала детализация, затем бордюры, затем структурные формы.

Интеграция:
- Добавить класс `TerrainHelpers` со статическими методами (возвращают ТОЛЬКО рецепты/оценки), располагать по пути: `features/scene/lib/terrain/fit/TerrainHelpers.ts`.
- SceneAPI: предоставить вспомогательные методы верхнего уровня ДВУХ видов:
  - а) «Чистые» — проксируют вызовы к `TerrainHelpers` и возвращают рецепты/оценки (без создания слоя).
  - б) «Удобные» (опционально) — принимают `rect+options`, подмешивают рецепты в `spec.pool` и вызывают `createProceduralLayer(...)` (оркестрация остаётся в SceneAPI, хелперы не создают слой).
- ScriptingPanel: 
  - Экспонировать новые чистые методы через `sceneApi` или отдельный объект `terrainHelpers` для продвинутых сценариев.
  - Добавить мини‑мастер (форма) + предпросмотр оси/толщины/покрытия, подсказки по бюджету.
- Документация: раздел «Fit‑инструменты» с примерами.

## Схема возвращаемых данных и примеры использования

Типы (спецификация):
- `FitRect = { x: number, z: number, width: number, depth: number }` — прямоугольник в плоскости XZ (мировые координаты).
- `ValleyFitOptions = { thickness: number, depth?: number, prominencePct?: number, direction?: 'auto'|'x'|'z'|number, continuity?: 'continuous'|'segmented', variation?: 'low'|'mid'|'high', edgeMargin?: number, budgetShare?: number, randomRotationEnabled?: boolean }`
- `RidgeBandFitOptions = { thickness: number, height?: number, prominencePct?: number, direction?: 'auto'|'x'|'z'|number, continuity?: 'continuous'|'segmented', variation?: 'low'|'mid'|'high', edgeMargin?: number, budgetShare?: number, randomRotationEnabled?: boolean }`
- `WorldSize = { width: number, depth: number }`
- `FitResult = { recipes: GfxTerrainOpRecipe[], estimateOps: number, orientation: number, warnings: string[] }`

Сигнатуры `TerrainHelpers`:
- `static valleyFitToRecipes(rect: FitRect, options: ValleyFitOptions, world: WorldSize, edgeFade?: number): FitResult`
- `static ridgeBandFitToRecipes(rect: FitRect, options: RidgeBandFitOptions, world: WorldSize, edgeFade?: number): FitResult`
- `static estimateOpsForRecipes(recipes: GfxTerrainOpRecipe[]): number`
- `static suggestGlobalBudget(recipes: GfxTerrainOpRecipe[], margin?: number): number` — вернёт рекомендованный `maxOps` с запасом (по умолчанию +20%).

Пример в ScriptingPanel (использование «чистых» хелперов):
```js
const world = { width: 300, depth: 200 }
const rect = { x: -140, z: -10, width: 280, depth: 20 }
const fit = sceneApi.terrainHelpers.valleyFitToRecipes(
  rect,
  { thickness: 40, depth: 8, direction: 'auto', continuity: 'continuous' },
  world,
  0.15
)

const spec = {
  world: { ...world, edgeFade: 0.15 },
  base: { seed: 1001, octaveCount: 4, amplitude: 6, persistence: 0.5, width: 128, height: 128 },
  pool: {
    global: { intensityScale: 1.2, maxOps: Math.ceil(fit.estimateOps * 1.2) },
    recipes: [ ...fit.recipes ]
  },
  seed: 1001
}

const res = await sceneApi.createProceduralLayer(spec, { name: 'ValleyFit Demo' })
console.log(res, fit.warnings)
```

Комбинация valley + ridge:
```js
const v = sceneApi.terrainHelpers.valleyFitToRecipes(rectV, { thickness: 40, depth: 8 }, world, 0.15)
const r = sceneApi.terrainHelpers.ridgeBandFitToRecipes(rectR, { thickness: 30, height: 10, direction: 'auto' }, world, 0.15)
const recipes = [...v.recipes, ...r.recipes]
const maxOps = Math.ceil((v.estimateOps + r.estimateOps) * 1.2)
// собрать spec и вызвать sceneApi.createProceduralLayer(...)
```

## Список фаз

### ✅ Фаза 1: Спецификация типов и каркас хелперов
- Добавить типы Fit‑опций: `ValleyFitOptions`, `RidgeBandFitOptions`, `FitRect` (XZ‑прямоугольник).
- Определить контракты: вход (rect+options) → выход (набор `GfxTerrainOpRecipe` или готовый `GfxTerrainConfig`‑фрагмент).
- Сохранить полную обратную совместимость текущего API.
- Документация разработчикам: формат опций, допущения, дефолты.

Критерии приёмки:
- Типы экспортируются из `@/entities/terrain`.
- Сборка зелёная, линт/тесты без регрессий.

**Отчёт**: [phases/phase_1_summary.md](phases/phase_1_summary.md)

### ✅ Фаза 2: Ядро вычислений (эвристики step/radius/aspect/intensity)
- Реализовать расчёт направления (auto|x|z|angle) и безопасную рабочую зону (edgeMargin).
- Реализовать подбор пары `step/radius` под длину `rect` с перекрытием и невыходом за мир.
- Реализовать вычисление `aspect` из желаемой толщины.
- Реализовать интенсивность: по метрам или доле от базовой амплитуды (с нормализацией).
- Поддержать режимы `continuous` (stroke, 5 центров) и `segmented` (множественные одиночные операции).

 Критерии приёмки:
- Для тестовых кейсов (мир 300×200) «долина через весь мир» покрывает ширину и визуально непрерывна.
 - Хелпер не выплёвывает центры за пределы мира; учитывает edgeFade.

**Отчёт**: [phases/phase_2_summary.md](phases/phase_2_summary.md)

### ✅ Фаза 3: Бюджет и приоритезация
- Добавить оценщик «стоимости» рецептов (ops‑count) и функцию распределения общего `maxOps`.
- Поддержать `budgetShare` и режим `pool.global.maxOps = 'auto'`.
- При нехватке — автоматом уменьшать `count`/плотность или разбирать stroke в сегменты.

Критерии приёмки:
- В сцене со смешанными рецептами структурные элементы гарантированно попадают в результат, детализация подрезается прогнозируемо.
- Док‑примеры показывают связь параметров и итогового числа операций.
**Отчёт**: [phases/phase_3_summary.md](phases/phase_3_summary.md)

**Отчёт**: [phases/phase_3_summary.md](phases/phase_3_summary.md)

### ✅ Фаза 4: Интеграция в SceneAPI и ScriptingPanel
- SceneAPI: использовать хелперы ТОЛЬКО для генерации операций и встраивать их в существующий сценарий (формирование `pool` и вызов `createProceduralLayer(...)` остаются в текущем пайплайне).
- ScriptingPanel: экспонировать `sceneApi.terrainHelpers.*` (без создания слоя); далее пользователь сам собирает `spec.pool` и вызывает `createProceduralLayer`.
- Обновить шаблоны и автокомплит (tooltips) под новые опции.

Критерии приёмки:
- Пользователь может сделать долину через прямоугольник без ручного подбора `step/radius/aspect`.
- Превью адекватно отражает направление/толщину/покрытие.
**Отчёт**: [phases/phase_4_summary.md](phases/phase_4_summary.md)

### ⏳ Фаза 5: Тестирование и устойчивость
- Юнит‑тесты для эвристик (детерминированность, невыход за мир, поведение на узких зонах).
- Интеграционные тесты SceneAPI (создание слоя, проверка количества опов/бюджета).
- Прогоны перформанса на средних сценах.

Критерии приёмки:
- Тесты зелёные; нет регрессий в существующих сценариях.

### ⏳ Фаза 6: Документация и примеры
- Раздел «Fit‑инструменты» в `terrain-in-scripting-panel.md` с понятными примерами «до/после».
- Обновить разделы про `step` и `budget` (ссылки на fit‑подход).
- Обновить шаблоны ScriptingPanel.

Критерии приёмки:
- Документация само‑достаточна для пользователя без чтения исходников.

### ⏳ Фаза 7: Обновление шаблонов ScriptingPanel под fit‑хелперы
- Обновить `ScriptingPanel` шаблоны (`constants/scriptTemplates.ts`):
  - Добавить 2–3 новых примера, использующих `sceneApi.terrainHelpers.*` для генерации рецептов и создание слоя через `createProceduralLayer`.
  - Переписать часть существующих шаблонов (минимум «Долина с горами по краям») на fit‑подход.
- Подсветить в шаблонах работу с бюджетом: как использовать `estimateOps` и выставлять `maxOps` с запасом.

Критерии приёмки:
- В меню шаблонов есть раздел/примеры с fit‑подходом; они выполняются из коробки и создают предсказуемый рельеф.
