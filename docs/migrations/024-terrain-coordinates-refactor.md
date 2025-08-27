Миграция: Рефакторинг координатной системы террейна (024)

Дата: 2025-08-27

Цель: устранить путаницу между вертикальной высотой (ось Y) и глубиной по оси Z, введя world.depth и area.depth.

Изменения API
- Спецификация процедурной генерации: world.depth — новая глубина по Z. world.height помечено как deprecated, временно поддерживается как fallback.
- Ограничивающие области размещения (прямоугольник): area.depth — новая длина по Z. area.height помечено как deprecated, временно поддерживается как fallback.
- В опциях generateTerrainOpsFromPool: используйте worldDepth вместо worldHeight (fallback поддерживается).
- В GfxTerrainConfig поле worldHeight по‑прежнему хранит глубину Z (переименование вне текущего рефакторинга).

Пошаговая миграция
1) Спецификации и примеры: было — world: { width: 300, height: 200 }; стало — world: { width: 300, depth: 200 }.
2) Ограничивающие области: было — area: { kind: 'rect', x, z, width, height }; стало — area: { kind: 'rect', x, z, width, depth }.
3) Вызовы генерации операций: было — generateTerrainOpsFromPool(pool, seed, { worldWidth, worldHeight }); стало — generateTerrainOpsFromPool(pool, seed, { worldWidth, worldDepth }).
4) Центрирование координат: не используйте абсолютные координаты за пределами мира (например, z: 160 при depth: 200). Помните: X в [-width/2 .. +width/2], Z в [-depth/2 .. +depth/2].

Примеры до/после
До: world { width: 300, height: 200 }; placement { type: 'uniform', area: { kind: 'rect', x: 0, z: 160, width: 300, height: 40 } }.
После: world { width: 300, depth: 200 }; placement { type: 'uniform', area: { kind: 'rect', x: -150, z: 60, width: 300, depth: 40 } }.

Частые ошибки
- Использование height вместо depth в world/area.
- Координаты X/Z вне границ мира — используйте центрированные диапазоны.
- placement.uniform не поддерживает center — применяйте ring или area.

Ссылки
- Руководство по координатам: features/scene-management/terrain-coordinates.md
- Scene API: api/scene-api.md
- Типы террейна: api/types/terrain.md
