import React, { useEffect } from 'react'
import { Box, Group, Paper, Stack, Container } from '@mantine/core'
import { Scene3D } from '../Scene3D'
import { ObjectManagerR3F } from './ObjectManagerR3F'
import { useSceneStore } from '../../../stores/sceneStore'
import { useSceneHistory } from '../../../hooks/r3f/useSceneHistory'
import { db } from '../../../utils/database'
import MainLayout from '../../../layouts/MainLayout'

interface SceneEditorR3FProps {
  width?: number
  height?: number
  showObjectManager?: boolean
  uuid?: string
  isNew?: boolean
}

/**
 * R3F-enabled Scene Editor that combines the 3D scene with object management
 * This replaces the traditional SceneEditor component for R3F workflows
 */
export const SceneEditorR3F: React.FC<SceneEditorR3FProps> = ({
  width = 1200,
  height = 800,
  showObjectManager = true,
  uuid,
  isNew = false
}) => {
  // Initialize scene history for undo/redo
  useSceneHistory()

  // Get scene store actions
  const { loadSceneData, clearScene, setCurrentScene } = useSceneStore.getState()

  // Load scene data from database if uuid is provided
  useEffect(() => {
    const loadScene = async () => {
      if (uuid && !isNew) {
        try {
          const sceneData = await db.getScene(uuid)
          console.log(sceneData)
          if (sceneData) {
            loadSceneData(sceneData.sceneData, sceneData.name, uuid)
          }
        } catch (error) {
          console.error('Failed to load scene:', error)
        }
      } else if (isNew) {
        // Clear scene for new scene
        clearScene()
        setCurrentScene({
          name: 'Новая сцена',
          status: 'draft'
        })
      }
    }

    loadScene()
  }, [uuid, isNew, loadSceneData, clearScene, setCurrentScene])

  // Get current scene status
  const currentScene = useSceneStore(state => state.currentScene)
  const objectCount = useSceneStore(state => state.objects.length)
  const placementCount = useSceneStore(state => state.placements.length)

  return (
    <MainLayout>
      <Container size="100%" style={{ maxWidth: 'none', padding: 0 }}>
        <Group align="flex-start" gap="md" wrap="nowrap" style={{ height: '100vh', padding: '1rem' }}>
          {/* 3D Scene Viewport */}
          <Paper withBorder style={{ flex: 1, minWidth: width * 0.7 }}>
            <Box style={{ width: '100%', height }}>
              <Scene3D />
            </Box>

            {/* Scene Stats */}
            <Stack gap="xs" p="sm" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
              <Group gap="md">
                <span style={{ fontSize: '12px', color: 'var(--mantine-color-gray-6)' }}>
                  Scene: {currentScene.name} ({currentScene.status})
                </span>
                <span style={{ fontSize: '12px', color: 'var(--mantine-color-gray-6)' }}>
                  Objects: {objectCount}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--mantine-color-gray-6)' }}>
                  Instances: {placementCount}
                </span>
              </Group>
            </Stack>
          </Paper>

          {/* Object Manager Sidebar */}
          {showObjectManager && (
            <Paper withBorder style={{ width: 350, flexShrink: 0, maxHeight: height + 60, overflow: 'auto' }}>
              <ObjectManagerR3F />
            </Paper>
          )}
        </Group>
      </Container>
    </MainLayout>
  )
}

/**
 * Hook for integrating R3F scene with external components
 * Provides the same interface as the original useThreeJSScene for compatibility
 */
export const useR3FSceneIntegration = () => {
  const store = useSceneStore()

  return {
    // Scene data
    objects: store.objects,
    placements: store.placements,
    layers: store.layers,
    lighting: store.lighting,

    // UI state
    selectedObject: store.selectedObject,
    hoveredObject: store.hoveredObject,
    viewMode: store.viewMode,
    renderMode: store.renderMode,
    transformMode: store.transformMode,
    gridVisible: store.gridVisible,

    // Scene metadata
    currentScene: store.currentScene,

    // Actions
    addObject: store.addObject,
    removeObject: store.removeObject,
    updateObject: store.updateObject,
    addPlacement: store.addPlacement,
    updatePlacement: store.updatePlacement,
    removePlacement: store.removePlacement,
    selectObject: store.selectObject,
    clearSelection: store.clearSelection,
    setHoveredObject: store.setHoveredObject,
    clearHover: store.clearHover,
    setViewMode: store.setViewMode,
    setRenderMode: store.setRenderMode,
    setTransformMode: store.setTransformMode,
    toggleGridVisibility: store.toggleGridVisibility,
    createLayer: store.createLayer,
    updateLayer: store.updateLayer,
    deleteLayer: store.deleteLayer,
    toggleLayerVisibility: store.toggleLayerVisibility,
    moveObjectToLayer: store.moveObjectToLayer,
    updateLighting: store.updateLighting,

    // Scene management
    loadSceneData: store.loadSceneData,
    getCurrentSceneData: store.getCurrentSceneData,
    clearScene: store.clearScene,
    markSceneAsModified: store.markSceneAsModified,

    // History
    undo: store.undo,
    redo: store.redo,
    canUndo: store.canUndo(),
    canRedo: store.canRedo(),

    // Serialization
    exportScene: store.exportScene,
    importScene: store.importScene,
    saveSceneToLocalStorage: store.saveSceneToLocalStorage,
    loadSceneFromLocalStorage: store.loadSceneFromLocalStorage,
    getSceneJSON: store.getSceneJSON,
    loadSceneFromJSON: store.loadSceneFromJSON
  }
}
