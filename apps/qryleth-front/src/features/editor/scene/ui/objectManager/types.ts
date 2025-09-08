/**
 * Типы менеджера объектов сцены.
 * Здесь собраны интерфейсы, которые используются несколькими компонентами.
 */

import type { SceneLayer } from '@/entities/scene/types'
import { GfxLayerType } from '@/entities/layer'
import type React from 'react'

/**
 * Тип режима модального окна слоя сцены.
 * 'create' - создание нового слоя, 'edit' - редактирование.
 */
export type SceneLayerModalMode = 'create' | 'edit'

/**
 * Тип данных формы слоя сцены.
 * Использует стандартный SceneLayer, но поле id необязательное,
 * так как при создании оно ещё не известно.
 */
export type SceneLayerFormData = Omit<SceneLayer, 'id'> & { id?: string }

/**
 * Примечание: поле `type` в SceneLayerFormData теперь имеет тип перечисления GfxLayerType,
 * что исключает использование произвольных строк и предотвращает опечатки.
 */

/**
 * Внешние пропсы SceneObjectManager.
 * Позволяют переопределить основные действия при необходимости.
 */
export interface ObjectManagerProps {
    /** Переопределение сохранения сцены в библиотеку */
    onSaveSceneToLibrary?: () => void
    /** Внешний обработчик редактирования объекта */
    onEditObject?: (objectUuid: string, instanceId?: string) => void
}

/**
 * Краткая информация об объекте сцены для списков и деревьев.
 * Используется в менеджере объектов для отображения и действий.
 */
export interface ObjectInfo {
  /** Человекочитаемое имя объекта */
  name: string
  /** Количество инстансов данного объекта в сцене */
  count: number
  /** Флаг видимости объекта */
  visible: boolean
  /** UUID объекта в сцене */
  objectUuid: string
  /** UUID записи объекта в библиотеке, если он добавлен из неё */
  libraryUuid?: string
  /** Идентификатор слоя, к которому относится объект */
  layerId?: string
}
