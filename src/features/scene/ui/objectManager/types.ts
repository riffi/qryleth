/**
 * Типы менеджера объектов сцены.
 * Здесь собраны интерфейсы, которые используются несколькими компонентами.
 */

import type { SceneLayer } from '@/entities/scene/types'
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
    // --- Create layer modal ---
    createLayerModalOpened: boolean
    setCreateLayerModalOpened: (opened: boolean) => void
    newLayerName: string
    setNewLayerName: (name: string) => void
    newLayerType: 'object' | 'landscape' | 'water'
    setNewLayerType: (t: 'object' | 'landscape' | 'water') => void
    newLayerWidth: number
    setNewLayerWidth: (v: number) => void
    newLayerHeight: number
    setNewLayerHeight: (v: number) => void
    newLayerShape: 'plane' | 'perlin'
    setNewLayerShape: (shape: 'plane' | 'perlin') => void
    newLayerColor: string
    setNewLayerColor: (color: string) => void
    handleCreateLayer: () => void

    // --- Edit layer modal ---
    editLayerModalOpened: boolean
    setEditLayerModalOpened: (opened: boolean) => void
    editingLayerType: 'object' | 'landscape' | 'water'
    setEditingLayerType: (t: 'object' | 'landscape' | 'water') => void
    editingLayerWidth: number
    setEditingLayerWidth: (v: number) => void
    editingLayerHeight: number
    setEditingLayerHeight: (v: number) => void
    editingLayerShape: 'plane' | 'perlin'
    setEditingLayerShape: (shape: 'plane' | 'perlin') => void
    editingLayerColor: string
    setEditingLayerColor: (color: string) => void
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
