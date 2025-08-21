---
id: 15
phase: 6
title: "Фаза 6: RenderProfile флаг и прокидка в рендер (enum)"
status: done
created: 2025-08-21
updated: 2025-08-21
filesChanged: 2
notes:
  - scope: render profile integration, Scene3D/SceneContent props
---

# Фаза 6: RenderProfile флаг и прокидка в рендер (enum)

## Что сделано

### Автоматическое переключение renderProfile
- Убедился, что в методе `togglePlay()` стора уже реализовано автоматическое переключение `renderProfile`:
  - При переходе в `UiMode.Play` → `RenderProfile.View`
  - При переходе в `UiMode.Edit` → `RenderProfile.Edit`
  - Это было реализовано ещё в предыдущих фазах и работает корректно

### Прокидка renderProfile в компоненты рендера
- Обновил компонент `Scene3D`: 
  - Добавил получение `renderProfile` из стора через `useSceneStore`
  - Прокинул `renderProfile` как prop в `SceneContent`
  - Добавил подробный комментарий о назначении профиля рендера

- Обновил компонент `SceneContent`:
  - Добавил интерфейс `SceneContentProps` с полем `renderProfile: RenderProfile`
  - Добавил подробную JSDoc документацию на русском языке
  - Добавил комментарий в теле функции о возможных применениях `renderProfile` в будущем
  - Компонент готов к использованию различных настроек рендера для режимов Edit/View

### Подготовка к будущим настройкам
- Флаг `renderProfile` корректно передается через всю цепочку компонентов: `sceneStore` → `Scene3D` → `SceneContent`
- На данном этапе видимых различий в рендере нет, но инфраструктура подготовлена
- В комментариях описаны возможные применения: post-processing, качество теней, LOD и др.

## Изменённые файлы
- `apps/qryleth-front/src/features/scene/ui/renderer/Scene3D.tsx`
- `apps/qryleth-front/src/features/scene/ui/renderer/SceneContent.tsx`

## Результат
- [x] `renderProfile` корректно переключается между `edit` и `view` при смене `uiMode`
- [x] Профиль прокинут в компоненты Scene3D/SceneContent через props
- [x] Добавлены подробные комментарии на русском языке о назначении и использовании
- [x] Инфраструктура подготовлена для будущих различий в настройках рендера между режимами
- [x] Код готов к расширению в последующих задачах/фазах для реализации конкретных отличий между профилями