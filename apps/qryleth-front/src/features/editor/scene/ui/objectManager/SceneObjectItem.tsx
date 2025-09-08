import React from 'react'
import { IconCube, IconEdit, IconBookmark, IconTrash, IconDownload, IconCopy } from '@tabler/icons-react'
import { useSceneObjectManager } from './SceneObjectManagerContext.tsx'
import { TreeRow } from '@/shared/ui/tree/TreeRow'

export interface ObjectInfo {
    name: string
    count: number
    visible: boolean
    objectUuid: string
    /** UUID объекта в библиотеке, если он был добавлен из неё */
    libraryUuid?: string
    layerId?: string
}

interface ObjectItemProps {
    obj: ObjectInfo
    isSelected: boolean
}

/**
 * Компонент отображения отдельного объекта сцены.
 * Теперь использует унифицированную строку TreeRow для единообразия UI.
 */
const SceneObjectItemComponent: React.FC<ObjectItemProps> = ({ obj, isSelected }) => {
  const {
    highlightObject,
    clearHighlight,
    selectObject,
    toggleObjectVisibility,
    removeObject,
    saveObjectToLibrary,
    editObject,
    exportObject,
    copyObject,
    dragStart,
    contextMenu,
  } = useSceneObjectManager()

  return (
    <TreeRow
      id={obj.objectUuid}
      name={obj.name}
      icon={<IconCube size={12} color="var(--mantine-color-blue-4)" />}
      count={obj.count}
      visible={obj.visible}
      selected={isSelected}
      onClick={() => selectObject(obj.objectUuid)}
      onMouseEnter={() => highlightObject(obj.objectUuid)}
      onMouseLeave={clearHighlight}
      draggable
      onDragStart={(e) => dragStart(e, obj.objectUuid)}
      onContextMenu={(e) => contextMenu(e, obj.objectUuid)}
      onToggleVisibility={() => toggleObjectVisibility(obj.objectUuid)}
      actions={[
        { id: 'edit', label: 'Редактировать', icon: <IconEdit size={14} />, onClick: () => editObject(obj.objectUuid) },
        ...(obj.libraryUuid ? [] : [{ id: 'save', label: 'Сохранить в библиотеку', icon: <IconBookmark size={14} />, onClick: () => saveObjectToLibrary(obj.objectUuid) } as const]),
        { id: 'export', label: 'Выгрузить JSON', icon: <IconDownload size={14} />, onClick: () => exportObject(obj.objectUuid) },
        { id: 'copy', label: 'Копировать JSON', icon: <IconCopy size={14} />, onClick: () => copyObject(obj.objectUuid) },
        { id: 'delete', label: 'Удалить объект', color: 'red', icon: <IconTrash size={14} />, onClick: () => removeObject(obj.objectUuid) },
      ]}
    />
  )
}

/**
 * Мемоизированная версия элемента объекта сцены.
 */
export const SceneObjectItem = React.memo(SceneObjectItemComponent)
