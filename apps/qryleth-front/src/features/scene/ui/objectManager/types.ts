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
 * Данные и действия, передаваемые через контекст SceneObjectManager.
 * Используется дочерними компонентами вместо prop drilling.
 */
export interface SceneObjectManagerContextValue {
    // --- Единое модальное окно управления слоем ---
    /** Флаг отображения модального окна */
    layerModalOpened: boolean
    /** Изменить состояние открытия модального окна */
    setLayerModalOpened: (opened: boolean) => void
    /** Текущий режим модального окна */
    layerModalMode: SceneLayerModalMode
    /** Изменить режим модального окна */
    setLayerModalMode: (mode: SceneLayerModalMode) => void
    /** Данные формы слоя */
    layerFormData: SceneLayerFormData
    /** Установить данные формы слоя */
    setLayerFormData: (data: SceneLayerFormData) => void
    /** Создать новый слой сцены */
    handleCreateLayer: () => void
    /** Сохранить изменения слоя */
    handleUpdateLayer: () => void

    // --- Context menu ---
    contextMenuOpened: boolean
    setContextMenuOpened: (opened: boolean) => void
    contextMenuPosition: { x: number; y: number }
    layers: SceneLayer[]
    handleMoveToLayer: (layerId: string) => void
    /** Переключить раскрытие слоя в списке */
    toggleLayerExpanded: (layerId: string) => void
    /** Переключить видимость слоя */
    toggleLayerVisibility: (layerId: string) => void
    /** Открыть модальное окно редактирования слоя */
    openEditLayerModal: (layer: SceneLayer) => void
    /** Удалить слой по идентификатору */
    deleteLayer: (layerId: string) => void

    // --- Object actions ---
    toggleObjectExpanded: (objectUuid: string) => void
    highlightObject: (objectUuid: string, instanceId?: string) => void
    clearHighlight: () => void
    selectObject: (objectUuid: string, instanceId?: string) => void
    toggleObjectVisibility: (objectUuid: string) => void
    removeObject: (objectUuid: string) => void
    saveObjectToLibrary: (objectUuid: string) => void
    editObject: (objectUuid: string, instanceId?: string) => void
    toggleInstanceVisibility: (objectUuid: string, instanceId: string) => void
    removeInstance: (objectUuid: string, instanceId: string) => void
    dragStart: (e: React.DragEvent, objectUuid: string) => void
    contextMenu: (e: React.MouseEvent, objectUuid: string) => void
    dragOver: (e: React.DragEvent, layerId: string) => void
    dragLeave: (e: React.DragEvent) => void
    drop: (e: React.DragEvent, layerId: string) => void
    addObjectFromLibrary: (layerId: string) => void
    exportObject: (objectUuid: string) => void
    copyObject: (objectUuid: string) => void
}
