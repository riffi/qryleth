---
id: 15
phase: 2
title: "Фаза 2: UI переключение (Play ▶ / Exit ⏹) и скрытие"
status: done
created: 2025-08-21
updated: 2025-08-21
filesChanged: 2
notes:
  - scope: layout, scene-editor-ui
---

# Фаза 2: UI переключение (Play ▶ / Exit ⏹) и скрытие

## Что сделано
- В `MainLayout` добавлены управляемые пропсы `headerVisible` и `navbarVisible` (c JSDoc на русском) и условный рендер `Header`/`Navbar`.
- В `SceneEditorR3F` подключён `uiMode` из стора и добавлены:
  - Кнопка `Play` в хедере (только в режиме редактирования).
  - Скрытие хедера/навигации и боковых панелей в режиме `Play`; рендерится только канва.
  - Overlay c кнопкой `Exit` в правом верхнем углу канвы для выхода из `Play`.
  - Плавные CSS‑анимации (opacity/width ≈200ms) при показе/скрытии панелей.
- Переходы между режимами не пересоздают сцену и происходят без мерцаний.

## Изменённые файлы
- `apps/qryleth-front/src/widgets/layouts/MainLayout.tsx`
- `apps/qryleth-front/src/features/scene/ui/SceneEditorR3F.tsx`

## Результат
- [x] Нажатие Play скрывает UI, остаётся канва и кнопка Exit.
- [x] Нажатие Exit возвращает интерфейс; переключение без мерцаний.
- [x] Подготовлено основание для следующих фаз (горячие клавиши, принудительный Orbit и пр.).

