import React, { useEffect } from 'react'
import { Box, Group, Paper, Stack, Container } from '@mantine/core'
import { ChatInterface } from '../../ChatInterface'
import { Scene3D } from '../Scene3D'
import { ObjectManagerR3F } from './ObjectManagerR3F'
import { useSceneStore } from '../../../stores/sceneStore'
import { useSceneHistory } from '../../../hooks/r3f/useSceneHistory'
import { db } from '../../../utils/database'
import MainLayout from '../../../layouts/MainLayout'
import type { SceneResponse, SceneObject, ScenePlacement } from '../../../types/scene'

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

  const handleSceneGenerated = (scene: SceneResponse) => {
    useSceneStore.getState().loadSceneData(scene)
  }

  const handleObjectAdded = (objectData: any) => {
    const { addObject, addPlacement, objects } = useSceneStore.getState()
    const newObject: SceneObject = {
      name: objectData.name,
      primitives: objectData.primitives,
      layerId: 'objects'
    }
    const objectIndex = objects.length
    addObject(newObject)

    const placement: ScenePlacement = {
      objectIndex,
      position: objectData.position || [0, 0, 0],
      rotation: objectData.rotation || [0, 0, 0],
      scale: objectData.scale || [1, 1, 1]
    }
    addPlacement(placement)
  }

  return (
    <MainLayout>
      <Container
        size="xl"
        fluid
        h="100%"
        style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: 'var(--mantine-spacing-sm)' }}
      >
        <Paper shadow="sm" radius="md" style={{ width: 400, height: '100%' }}>
          <ChatInterface onSceneGenerated={handleSceneGenerated} onObjectAdded={handleObjectAdded} />
        </Paper>

        <Paper
          shadow="sm"
          radius="md"
          style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 400 }}
        >
          <Box style={{ width: '100%', height }}>
            <Scene3D />
          </Box>
        </Paper>

        {showObjectManager && (
          <Paper shadow="sm" radius="md" style={{ width: 350, flexShrink: 0, maxHeight: height + 60, overflow: 'auto' }}>
            <ObjectManagerR3F />
          </Paper>
        )}
      </Container>
    </MainLayout>
  )
}


