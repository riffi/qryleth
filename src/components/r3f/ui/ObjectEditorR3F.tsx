import React, { useState } from 'react'
import { Modal, Paper, Box, Group, Button, Stack, Text, Badge } from '@mantine/core'
import { IconCheck, IconX } from '@tabler/icons-react'
import { Scene3D } from '../Scene3D'
import { useSceneStore } from '../../../stores/sceneStore'
import { useSceneActions } from '../../../stores/optimizedSelectors'
import type { SceneObject, ScenePlacement } from '../../../types/scene'

interface ObjectEditorR3FProps {
  opened: boolean
  onClose: () => void
  objectIndex?: number
  instanceId?: string
  width?: number
  height?: number
}

/**
 * R3F-enabled Object Editor that provides isolated object editing
 * Similar to the original ObjectEditor but using R3F components
 */
export const ObjectEditorR3F: React.FC<ObjectEditorR3FProps> = ({
  opened,
  onClose,
  objectIndex,
  instanceId,
  width = 800,
  height = 600
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editingObject, setEditingObject] = useState<SceneObject | null>(null)
  
  // Get scene data
  const objects = useSceneStore(state => state.objects)
  const placements = useSceneStore(state => state.placements)
  const { updateObject, updatePlacement } = useSceneActions()

  // Get the object being edited
  const currentObject = React.useMemo(() => {
    if (objectIndex !== undefined && objects[objectIndex]) {
      return objects[objectIndex]
    }
    return null
  }, [objectIndex, objects])

  // Get the placement being edited
  const currentPlacement = React.useMemo(() => {
    if (instanceId && objectIndex !== undefined) {
      const placementIndex = parseInt(instanceId.split('-')[1])
      return placements[placementIndex] || null
    }
    return null
  }, [instanceId, objectIndex, placements])

  // Initialize editing state when object changes
  React.useEffect(() => {
    if (currentObject && opened) {
      setEditingObject({ ...currentObject })
      setIsEditing(true)
    }
  }, [currentObject, opened])

  // Create isolated scene data for editing
  const isolatedSceneData = React.useMemo(() => {
    if (!editingObject || !currentPlacement) return null

    return {
      objects: [editingObject],
      placements: [{
        ...currentPlacement,
        objectIndex: 0 // Use index 0 in isolated scene
      }],
      layers: [
        {
          id: 'objects',
          name: 'Объекты',
          type: 'object' as const,
          visible: true,
          position: 0
        }
      ]
    }
  }, [editingObject, currentPlacement])

  const handleSave = React.useCallback(() => {
    if (!editingObject || objectIndex === undefined) return

    // Update the object in the main scene
    updateObject(objectIndex, editingObject)

    // If we have placement changes, update them too
    if (currentPlacement && instanceId) {
      const placementIndex = parseInt(instanceId.split('-')[1])
      if (!isNaN(placementIndex)) {
        // The placement would be updated through the transform controls
        // For now, we'll keep the existing placement
      }
    }

    setIsEditing(false)
    onClose()
  }, [editingObject, objectIndex, updateObject, currentPlacement, instanceId, onClose])

  const handleCancel = React.useCallback(() => {
    setIsEditing(false)
    setEditingObject(null)
    onClose()
  }, [onClose])

  const handlePrimitiveUpdate = React.useCallback((primitiveIndex: number, updates: any) => {
    if (!editingObject) return

    const updatedPrimitives = [...editingObject.primitives]
    updatedPrimitives[primitiveIndex] = {
      ...updatedPrimitives[primitiveIndex],
      ...updates
    }

    setEditingObject({
      ...editingObject,
      primitives: updatedPrimitives
    })
  }, [editingObject])

  if (!opened || !currentObject) {
    return null
  }

  return (
    <Modal
      opened={opened}
      onClose={handleCancel}
      title={`Edit Object: ${currentObject.name}`}
      size="xl"
      fullScreen
    >
      <Stack gap="md" style={{ height: '90vh' }}>
        {/* Editor Header */}
        <Group justify="space-between">
          <Group>
            <Text size="lg" fw={500}>
              {currentObject.name}
            </Text>
            <Badge variant="light" color="blue">
              {currentObject.type}
            </Badge>
            <Badge variant="light" color="gray">
              {currentObject.primitives.length} primitive(s)
            </Badge>
          </Group>
          
          <Group>
            <Button 
              variant="outline" 
              leftSection={<IconX size={16} />}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button 
              leftSection={<IconCheck size={16} />}
              onClick={handleSave}
              disabled={!isEditing}
            >
              Save Changes
            </Button>
          </Group>
        </Group>

        {/* 3D Editor Viewport */}
        <Paper withBorder style={{ flex: 1 }}>
          <Box style={{ width: '100%', height: '100%', minHeight: height }}>
            {isolatedSceneData && (
              <ObjectEditorScene
                sceneData={isolatedSceneData}
                onPrimitiveUpdate={handlePrimitiveUpdate}
              />
            )}
          </Box>
        </Paper>

        {/* Primitive List */}
        <Paper withBorder p="md">
          <Stack gap="sm">
            <Text size="sm" fw={500}>Primitives</Text>
            {editingObject?.primitives.map((primitive, index) => (
              <Group key={index} justify="space-between">
                <Text size="sm">{primitive.type}</Text>
                <Badge variant="light" size="sm">
                  {primitive.type}
                </Badge>
              </Group>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Modal>
  )
}

/**
 * Isolated scene component for object editing
 */
interface ObjectEditorSceneProps {
  sceneData: {
    objects: SceneObject[]
    placements: ScenePlacement[]
    layers: any[]
  }
  onPrimitiveUpdate: (primitiveIndex: number, updates: any) => void
}

const ObjectEditorScene: React.FC<ObjectEditorSceneProps> = ({
  sceneData,
  onPrimitiveUpdate
}) => {
  // Create a temporary store for the isolated editing environment
  const [isolatedStore] = useState(() => {
    // This would need a separate store instance for isolation
    // For now, we'll render the object in the main scene with different camera
    return null
  })

  return (
    <Box style={{ width: '100%', height: '100%' }}>
      <Scene3D 
        // Override camera position for object editing
        cameraPosition={[5, 5, 5]}
        // Enable transform controls
        showTransformControls={true}
        // Set editing mode
        editingMode={true}
      />
    </Box>
  )
}

/**
 * Hook for managing object editor state
 */
export const useObjectEditorR3F = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [editingObjectIndex, setEditingObjectIndex] = useState<number | undefined>()
  const [editingInstanceId, setEditingInstanceId] = useState<string | undefined>()

  const openEditor = React.useCallback((objectIndex: number, instanceId?: string) => {
    setEditingObjectIndex(objectIndex)
    setEditingInstanceId(instanceId)
    setIsOpen(true)
  }, [])

  const closeEditor = React.useCallback(() => {
    setIsOpen(false)
    setEditingObjectIndex(undefined)
    setEditingInstanceId(undefined)
  }, [])

  return {
    isOpen,
    objectIndex: editingObjectIndex,
    instanceId: editingInstanceId,
    openEditor,
    closeEditor
  }
}