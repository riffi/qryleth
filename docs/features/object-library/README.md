# Библиотека объектов: превью и препросмотр

В библиотеке объектов реализованы две связанные возможности:

- Автоматическая генерация превью (PNG) при сохранении объекта с использованием offscreen‑рендеринга.
- Интерактивный препросмотр при наведении курсора на карточку объекта: мягкий облёт камерой вокруг модели.

Обе функции используют единые R3F‑компоненты рендеринга, что гарантирует консистентный вид геометрии и материалов.

## Автогенерация превью при сохранении

- Модуль: `apps/qryleth-front/src/features/editor/object/lib/offscreen-renderer/OffscreenObjectRenderer.tsx`.
- Вызов: `generateObjectPreview(gfxObject, useCache?)` из `saveUtils.ts`.
- Формат превью: PNG (base64 Data URL), размер по умолчанию 512×512, прозрачный фон.
- Освещение: ambient + два directional, подобранные для читаемого силуэта.
- Автоматический ракурс: камера вычисляет центр и радиус сферы охвата (по AABB), дистанция берётся по максимальному из вертикального/горизонтального FOV с безопасным запасом.
- Кеширование: в памяти (Map) по детерминированному ключу содержимого объекта, для ускорения повторной генерации.

Как используется при сохранении:

1) В редакторе объектов формируется итоговый `GfxObject` (`buildUpdatedObject`).
2) Перед записью в БД вызывается `generateObjectPreview(object)`. При успехе base64 кладётся в `ObjectRecord.thumbnail`.
3) Даже при ошибках превью сохранение не прерывается (fallback: thumbnail пропускается). Ресурсы WebGL очищаются всегда.

Основные файлы интеграции:

- `apps/qryleth-front/src/features/editor/object/lib/saveUtils.ts` — генерация и кеширование превью.
- `apps/qryleth-front/src/pages/ObjectEditorPage.tsx` — вызов генерации при сохранении/создании объекта.
- `apps/qryleth-front/src/shared/ui/SaveObjectDialog.tsx` — отображение прогресса (опционально).

## Препросмотр при наведении: облёт камерой

- Компонент: `apps/qryleth-front/src/shared/ui/ObjectPreviewCard/HoverInteractivePreview.tsx`.
- Встраивание: поверх статического PNG в `ObjectPreviewCard` в момент hover.
- Жизненный цикл: Canvas создаётся только при наведении и удаляется при уходе курсора, чтобы не расходовать ресурсы.
- Совпадение фона: фон R3F‑сцены соответствует цвету PNG‑превью (#EAF4FF), чтобы не было «пересветов» при переключении.
- Камера: 
  - Автопозиционирование как в offscreen‑рендере (центр сферы охвата, дистанция по FOVX/FOVY с запасом).
  - Плавный облёт по азимуту с лёгкой модуляцией высоты и прецессией (ощущение объёма даже у осесимметричных моделей).
  - Без OrbitControls: траектория управляется кодом в `useFrame`, события мыши не блокируются — hover устойчивый.

Пользовательский эффект:

- В списке библиотечных карточек наводка поверх превью «оживляет» модель: она мягко вращается, позволяя быстро понять форму без открытия редактора.
- При уходе курсора компонент размонтируется, возвращая отображение к PNG.

## Архитектурные заметки

- Повторное использование: и offscreen‑рендер, и препросмотр на hover используют общий компонент `ObjectRendererR3F`, что исключает дублирование логики геометрии, групп и материалов.
- Безопасность ресурсов: `OffscreenObjectRenderer` гарантированно чистит R3F root и WebGL‑ресурсы (`dispose()`), а hover‑превью создаёт Canvas только на время наведения.
- Консистентный свет/фон: подобран единый набор источников света и цвет фона для совпадения с PNG‑превью.

## Быстрые ссылки (код)

- Offscreen превью: `apps/qryleth-front/src/features/editor/object/lib/offscreen-renderer/OffscreenObjectRenderer.tsx`
- R3F‑рендерер объекта: `apps/qryleth-front/src/features/editor/object/lib/offscreen-renderer/ObjectRendererR3F.tsx`
- Генерация превью и кеш: `apps/qryleth-front/src/features/editor/object/lib/saveUtils.ts`
- Карточка с превью: `apps/qryleth-front/src/shared/ui/ObjectPreviewCard/ObjectPreviewCard.tsx`
- Hover‑препросмотр: `apps/qryleth-front/src/shared/ui/ObjectPreviewCard/HoverInteractivePreview.tsx`


