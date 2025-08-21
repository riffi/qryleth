---
id: 15
phase: 4
title: "Фаза 4: Принудительный Orbit в edit и сохранение/восстановление позы камеры"
status: done
created: 2025-08-21
updated: 2025-08-21
filesChanged: 3
notes:
  - scope: camera-controls, walk/fly init pose, pose-persistence
---

# Фаза 4: Принудительный Orbit в edit и сохранение/восстановление позы камеры

## Что сделано
- В `CameraControls`:
  - Принудительно включаем Orbit при входе в `UiMode.Edit`.
  - При входе в Orbit восстанавливаем позу камеры из стора: позицию и `target` (если сохранены).
  - В cleanup при смене режима/размонтаже сохраняем текущую позу: для Orbit — позицию+`target`, для Walk/Fly — позицию+`rotation`.
- В `WalkControls` и `FlyControls`:
  - На маунте инициализируем камеру из сохранённой позы (позиция и, при наличии, ориентация), с дефолтом при отсутствии позы.
- Все изменения без пересоздания сцены; соблюдены требования производительности и расширяемости.

### Примечание (фикс однокнопочного выхода)
- Добавлены обработчики `onUnlock` в `PointerLockControls` (и для Walk, и для Fly), которые при снятии pointer lock в Play автоматически переключают камеру на Orbit и выходят из Play. Это убирает необходимость второго нажатия Esc в Fly/Walk.

## Изменённые файлы
- `apps/qryleth-front/src/features/scene/ui/renderer/controls/CameraControls.tsx`
- `apps/qryleth-front/src/features/scene/ui/renderer/controls/WalkControls.tsx`
- `apps/qryleth-front/src/features/scene/ui/renderer/controls/FlyControls.tsx`

## Результат
- [x] В режиме редактирования всегда используется Orbit.
- [x] Поза камеры (позиция/цель для Orbit, позиция/ориентация для Walk/Fly) сохраняется при переключениях и восстанавливается при входе в соответствующий режим.
- [x] В Walk/Fly выход по Esc однокнопочный; курсор сразу свободен.
- [x] Переключение режимов без мерцаний и пересоздания сцены.
