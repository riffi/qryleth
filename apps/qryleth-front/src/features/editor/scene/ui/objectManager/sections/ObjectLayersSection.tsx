import React, { useMemo } from 'react'
import { IconLayersLinked, IconCube, IconPlus, IconEdit, IconTrash, IconBookmark } from '@tabler/icons-react'
import type { TreeNodeBase } from '@/shared/ui/tree/types'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { useSceneObjectsOptimized, useSceneLayersOptimized, useSelectionState } from '@/features/editor/scene/model/optimizedSelectors'
import { GfxLayerType } from '@/entities/layer'
// Контекстный доступ к действиям убран: передаём необходимые обработчики
// через параметры, чтобы не зависеть от порядка инициализации провайдера.

/**
 * Секция объектных слоёв. Формирует дерево узлов: слой → объекты.
 * Возвращает массив корневых узлов (каждый соответствует объектному слою).
 */
export interface ObjectLayerNodesParams {
  selectedObject?: { objectUuid: string; instanceId?: string } | null
  highlightObject: (uuid: string, instanceId?: string) => void
  clearHighlight: () => void
  selectObject: (uuid: string, instanceId?: string) => void
  toggleObjectVisibility: (uuid: string) => void
  removeObject: (uuid: string) => void
  saveObjectToLibrary: (uuid: string) => void
  editObject: (uuid: string, instanceId?: string) => void
  exportObject: (uuid: string) => void
  copyObject: (uuid: string) => void
  dragStart: (e: React.DragEvent, uuid: string) => void
  contextMenu: (e: React.MouseEvent, uuid: string) => void
  addObjectFromLibrary: (layerId: string) => void
  toggleLayerVisibility: (layerId: string) => void
  openEditLayerModal: (layer: any) => void
  deleteLayer: (layerId: string) => void
  dragOver: (e: React.DragEvent, layerId: string) => void
  dragLeave: (e: React.DragEvent) => void
  drop: (e: React.DragEvent, layerId: string) => void
}

export const useObjectLayerNodes = (params: ObjectLayerNodesParams): TreeNodeBase[] => {
  const sceneObjects = useSceneObjectsOptimized()
  const objectInstances = useSceneStore(s => s.objectInstances)
  const layers = useSceneLayersOptimized()
  const { selectedObject } = useSelectionState()

  const instanceCountByObject = useMemo(() => {
    const m = new Map<string, number>()
    for (const inst of objectInstances) {
      m.set(inst.objectUuid, (m.get(inst.objectUuid) || 0) + 1)
    }
    return m
  }, [objectInstances])

  // Группируем объекты по layerId
  const objectsByLayer = useMemo(() => {
    const map = new Map<string, typeof sceneObjects>()
    for (const o of sceneObjects) {
      const lid = (o.layerId as string) || 'objects'
      if (!map.has(lid)) map.set(lid, [])
      map.get(lid)!.push(o)
    }
    return map
  }, [sceneObjects])

  const layerNodes: TreeNodeBase[] = (layers || [])
    .filter(l => l.type === GfxLayerType.Object)
    .map(layer => {
      const objs = objectsByLayer.get(layer.id) || []
      const objectNodes: TreeNodeBase[] = objs.map(o => {
        const count = instanceCountByObject.get(o.uuid) || 0
        return {
          id: o.uuid,
          name: o.name,
          // Иконка объекта с маркером «из библиотеки», если есть libraryUuid
          icon: (
            <span style={{ position: 'relative', width: 16, height: 16, display: 'inline-block' }}>
              <IconCube size={12} color="var(--mantine-color-blue-4)" />
              {o.libraryUuid && (
                <span style={{ position: 'absolute', right: -2, bottom: -2 }}>
                  <IconBookmark size={10} color="var(--mantine-color-yellow-5)" />
                </span>
              )}
            </span>
          ),
          count,
          visible: o.visible !== false,
          selected: params.selectedObject?.objectUuid === o.uuid,
          isDraggable: true,
          onClick: () => params.selectObject(o.uuid),
          onMouseEnter: () => params.highlightObject(o.uuid),
          onMouseLeave: () => params.clearHighlight(),
          onDragStart: (e) => params.dragStart(e, o.uuid),
          onContextMenu: (e) => params.contextMenu(e, o.uuid),
          onToggleVisibility: () => params.toggleObjectVisibility(o.uuid),
          actions: [
            { id: 'edit', label: 'Редактировать', icon: <IconEdit size={14} />, onClick: () => params.editObject(o.uuid) },
            ...(o.libraryUuid ? [] : [{ id: 'save', label: 'Сохранить в библиотеку', icon: <IconPlus size={14} />, onClick: () => params.saveObjectToLibrary(o.uuid) }] as any),
            { id: 'export', label: 'Выгрузить JSON', onClick: () => params.exportObject(o.uuid) },
            { id: 'copy', label: 'Копировать JSON', onClick: () => params.copyObject(o.uuid) },
            { id: 'delete', label: 'Удалить объект', color: 'red', icon: <IconTrash size={14} />, onClick: () => params.removeObject(o.uuid) },
          ]
        }
      })

      return {
        id: layer.id,
        name: layer.name,
        icon: <IconLayersLinked size={14} color="var(--mantine-color-blue-4)" />,
        count: objectNodes.length,
        visible: !!layer.visible,
        isExpandable: true,
        onToggleVisibility: () => params.toggleLayerVisibility(layer.id),
        onDragOver: (e) => params.dragOver(e, layer.id),
        onDragLeave: params.dragLeave,
        onDrop: (e) => params.drop(e, layer.id),
        actions: [
          { id: 'add', label: 'Добавить объект из библиотеки', icon: <IconPlus size={14} />, onClick: () => params.addObjectFromLibrary(layer.id) },
          { id: 'rename', label: 'Переименовать', icon: <IconEdit size={14} />, onClick: () => params.openEditLayerModal(layer) },
          ...(layer.id !== 'objects' ? [{ id: 'delete-layer', label: 'Удалить слой', color: 'red', icon: <IconTrash size={14} />, onClick: () => params.deleteLayer(layer.id) }] : []) as any
        ],
        children: objectNodes,
      } as TreeNodeBase
    })

  return layerNodes
}
