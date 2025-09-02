---
id: 28
phase: 2
title: "Фаза 2: Теги в библиотеке и UI редактирования"
status: done
created: 2025-09-02
updated: 2025-09-02
filesChanged: 10
---

# Фаза 2: Теги в библиотеке и UI редактирования

## Что сделано
- Расширен тип `ObjectRecord` полем `tags?: string[]` и добавлены индексы в Dexie (`tags`, `*tags`) для быстрого поиска.
  - `apps/qryleth-front/src/shared/api/types.ts`
  - `apps/qryleth-front/src/shared/lib/database.ts`
- Нормализация тегов при сохранении/обновлении: lowercase, trim, uniq; дублирование в `objectData.tags` и в корневое `ObjectRecord.tags`.
- Редактирование тегов в ObjectEditor:
  - мини‑store метаданных: `apps/qryleth-front/src/features/editor/object/model/objectMetaStore.ts`
  - панель свойств с `TagsInput`: `apps/qryleth-front/src/features/editor/object/ui/PropertiesPanel/ObjectPropertiesPanel.tsx`
  - вкладка «Свойства» в менеджере: `apps/qryleth-front/src/features/editor/object/ui/ObjectManagementPanel/ObjectManagementPanel.tsx`
  - интеграция в сохранение: `apps/qryleth-front/src/features/editor/object/lib/saveUtils.ts`
- Библиотека: поиск по тегам и вывод тегов на карточках; кликабельные теги, «+N/Свернуть»
  - поиск: `apps/qryleth-front/src/features/object-library/ui/LibraryBrowser.tsx`
  - вывод тегов: `apps/qryleth-front/src/entities/object/ui/ObjectCard/ObjectCard.tsx`
  - клик по тегу → строка поиска: `apps/qryleth-front/src/features/object-library/ui/LibraryObjectCard/LibraryObjectCard.tsx`

## Примечания
- Теги храним в нижнем регистре для консистентности.
- UI и хранилище обратносуместимы; отсутствующие теги не ломают существующие объекты.

## Следующие шаги
- Реализовать ядро скаттеринга (фаза 3) и использовать теги для выбора источников объектов.

