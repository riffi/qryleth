# `ObjectPreviewCard`

Компонент карточки объекта библиотеки с отображением статического превью (PNG) и интерактивным препросмотром при наведении.

- Файл: `apps/qryleth-front/src/shared/ui/ObjectPreviewCard/ObjectPreviewCard.tsx`
- Доп. сцена для hover: `apps/qryleth-front/src/shared/ui/ObjectPreviewCard/HoverInteractivePreview.tsx`

## Пропсы

- `object: ObjectRecord`: запись объекта из БД (с `objectData` и опциональным `thumbnail`).
- `onEdit?: (object) => void`: обработчик редактирования.
- `onDelete?: (object) => void`: обработчик удаления.
- `onAdd?: (object) => void`: обработчик добавления в сцену.
- `showAddButton?: boolean` — показывать кнопку «Добавить».
- `showDeleteButton?: boolean` — показывать кнопку «Удалить».
- `showDate?: boolean` — показывать дату обновления.
- `size?: 'sm' | 'md' | 'lg'` — размер карточки (влияет на габариты превью).
- `loading?: boolean` — состояние загрузки действий.

## Поведение

- Показывает PNG‑превью из `object.thumbnail`, с плейсхолдером при отсутствии/ошибке.
- При hover поверх PNG монтируется `HoverInteractivePreview`, который рендерит 3D‑сцену:
  - Фон и освещение совпадают с генератором PNG.
  - Камера автоматически подбирает ракурс и мягко облетает объект.
  - Canvas создаётся только на время наведения.

## Размеры превью

- `sm`: 80×80
- `md` (по умолчанию): 120×120
- `lg`: 200×200

## Важные детали

- PNG остаётся под Canvas и скрывается только когда hover‑сцена готова, чтобы избежать «пустых» кадров.
- Стили: `ObjectPreviewCard.module.css` — тени, оверлеи, адаптация под тёмную тему.

