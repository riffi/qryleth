# Процедурная генерация деревьев

Краткое описание возможностей генератора деревьев в Object Editor, набора параметров, а также используемых при рендеринге оптимизаций. Документ относится к разделу «Функциональность» и описывает поведение и UX‑потоки. За реализацию типов/компонентов см. ссылки в конце.

## Назначение

- Создание параметрических деревьев внутри редактора объектов (Object Editor).
- Получение готового набора примитивов (ствол/ветви/листья) и материалов.
- Быстрый предпросмотр в Object Editor с тем же визуальным видом, что и в Scene Editor.

## Как пользоваться

1. Откройте Object Editor → вкладка «Генерация» справа (Object Management Panel).
2. Задайте параметры (см. ниже) и цвета материалов «Кора»/«Листья».
3. При необходимости включите «Очистить перед генерацией», чтобы заменить текущие примитивы.
4. Нажмите «Сгенерировать» — дерево появится в сцене Object Editor.

## Параметры генерации

- seed — сид случайности (результат детерминирован при одинаковом seed).
- trunkHeight — высота ствола; trunkSegments — число сегментов; trunkRadius — радиус у основания.
- branchLevels — глубина ветвления; branchesPerSegment — среднее число ветвей на сегмент ствола.
- branchLength — базовая длина ветви (уменьшается на верхних уровнях); branchRadius — радиус ветви первого уровня.
- branchAngleDeg — угол наклона ветви от вертикали (в градусах).
- angleSpread (0..1) — разброс наклона относительно branchAngleDeg:
  - 0 — без разброса (точно branchAngleDeg),
  - 1 — максимальный джиттер наклона (порядка ±50% от branchAngleDeg).
  - Азимут ветвей выбирается случайно равномерно в [0..2π].
- randomness — доля случайности для некоторых величин (например, длина ветви, количество ветвей).
- leavesPerBranch — число листьев на конце ветви (на последнем уровне).
- leafSize — базовый размер листа.
- leafShape — тип листвы: billboard (плоскость с маской) | sphere (объёмная сфера).

## Что создаётся

Генератор возвращает примитивы и материалы; при сохранении объект будет состоять из:

- Ствол и ветви: примитивы `trunk` и `branch` (цилиндрическая геометрия сужения по высоте).
- Листья: примитив `leaf` с геометрией `{ radius, shape }`, где `shape = 'billboard' | 'sphere'`.
- Материалы: «Кора» и «Листья» (PBR‑параметры совместимы с MeshStandardMaterial). При отсутствии в объекте создаются автоматически.

Примечание: для корректных AABB Bounding Box утилита учитывает `trunk/branch` как цилиндры, `leaf` — как сферы по радиусу.

## Оптимизация производительности

Для сцен с большим количеством экземпляров деревьев и/или высокой детализацией применяется инстанс‑рендеринг.

Scene Editor
- Кора (`trunk/branch`): один InstancedMesh на объект с модифицированным вершинным шейдером (unit‑cylinder + атрибуты aHeight/aRadiusTop/aRadiusBottom).
- Листья (billboard): один InstancedMesh на объект с плоской геометрией 1×1 и `alphaTest` маской формы (мягкие края, лёгкий изгиб, простая подсветка «на просвет»).
- Листья (sphere): отдельный InstancedMesh с единой сферой 1×1 и равномерным масштабом по радиусу.

Object Editor
- Используются эквивалентные инстанс‑компоненты для несгруппированных примитивов, чтобы предпросмотр соответствовал сцене по виду и скорости.

Планы (кратко)
- Инстанс‑рендер внутри групп в Object Editor; CPU‑куллинг чанков; LOD для листвы; шейдер «ветер».

## Ссылки на реализацию (API/код)

Типы и генератор
- Типы примитивов: `apps/qryleth-front/src/entities/primitive/model/types.ts` (trunk, branch, leaf).
- Параметры генерации: `apps/qryleth-front/src/features/editor/object/lib/generators/tree/types.ts`.
- Генерация: `apps/qryleth-front/src/features/editor/object/lib/generators/tree/generateTree.ts`.

UI
- Панель генерации: `apps/qryleth-front/src/features/editor/object/ui/GeneratorPanels/TreeGeneratorPanel.tsx`.

Инстанс‑рендер (Scene Editor)
- Кора: `apps/qryleth-front/src/shared/r3f/optimization/InstancedBranches.tsx`.
- Листья‑билборды: `apps/qryleth-front/src/shared/r3f/optimization/InstancedLeaves.tsx`.
- Листья‑сферы: `apps/qryleth-front/src/shared/r3f/optimization/InstancedLeafSpheres.tsx`.

Инстанс‑рендер (Object Editor)
- Кора: `apps/qryleth-front/src/features/editor/object/ui/renderer/objects/InstancedBranchesOE.tsx`.
- Листья‑билборды: `apps/qryleth-front/src/features/editor/object/ui/renderer/objects/InstancedLeavesOE.tsx`.
- Листья‑сферы: `apps/qryleth-front/src/features/editor/object/ui/renderer/objects/InstancedLeafSpheresOE.tsx`.

