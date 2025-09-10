import React, { Suspense, useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Box, LoadingOverlay } from '@mantine/core'
import * as THREE from 'three'
import { SceneContent } from './SceneContent.tsx'
import { useSceneUISync, useSceneRealTimeSync } from '@/features/editor/scene/lib/hooks/useSceneUISync'
import { useSceneStore, useIsTerrainApplying } from '../../model/sceneStore.ts'
import { FpsProvider, useFpsContext } from '../../lib/contexts/FpsContext'
import { FpsDisplay } from './controls/FpsDisplay'
import { UiMode } from '@/shared/types/ui'

interface Scene3DProps {
  className: string,
  onSceneReady: () => void
}

const Scene3DContent: React.FC<Scene3DProps> = ({
  className,
  onSceneReady
}) => {
  // Получаем текущий профиль рендера для передачи в SceneContent
  const renderProfile = useSceneStore(state => state.renderProfile)
  // Получаем настройки освещения для извлечения exposure
  const lighting = useSceneStore(state => state.lighting)
  // Флаг применения heightmap для показа прелоадера поверх канваса
  const isTerrainApplying = useIsTerrainApplying()
  // Получаем режим UI для отображения FPS только в режиме редактирования
  const uiMode = useSceneStore(state => state.uiMode)
  // Получаем FPS из контекста
  const { fps } = useFpsContext()

  // Инициализируем синхронизацию UI и сцены
  useSceneUISync()
  useSceneRealTimeSync()

  return (
    <Box className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Важно: тонемаппинг перенесён в EffectComposer (SceneContent),
          поэтому на рендерере отключаем toneMapping (NoToneMapping),
          чтобы избежать двойного применения и некорректного влияния exposure. */}
      <Canvas
        camera={{
          position: [5, 5, 8],
          fov: 45,
          near: 0.1,
          far: 2000
        }}
        shadows="soft"
        gl={{
          antialias: true,
          alpha: true,
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.NoToneMapping,
        }}
        style={{
          background: 'transparent',
          width: '100%',
          height: '100%'
        }}
        onCreated={(state) => {
          try {
            // Set up renderer properties safely
            if (state.gl) {
              state.gl.setPixelRatio(window.devicePixelRatio)

              // Enable shadows
              if (state.gl.shadowMap) {
                state.gl.shadowMap.enabled = true
                state.gl.shadowMap.type = THREE.PCFSoftShadowMap
              }

              // Отключаем тонемаппинг на рендерере: он выполняется в EffectComposer
              state.gl.toneMapping = THREE.NoToneMapping
            }

            // Notify parent that scene is ready
            onSceneReady?.()
          } catch (error) {
            console.warn('Error initializing renderer:', error)
            // Still notify parent that scene is ready even if renderer setup fails
            onSceneReady?.()
          }
        }}
      >
        <Suspense fallback={null}>
          <SceneContent renderProfile={renderProfile} />
        </Suspense>
      </Canvas>

      {/* FPS счётчик: в Play сдвигаем ниже панели PlayControls, в Edit — у самого верха */}
      <FpsDisplay fps={fps} top={uiMode === UiMode.Play ? 58 : 10} />

      {/* Прелоадер на время применения heightmap */}
      <LoadingOverlay
        visible={isTerrainApplying}
        overlayProps={{ radius: 'sm', blur: 2, style: { position: 'absolute', inset: 0 } }}
      />

      <Suspense fallback={
        <LoadingOverlay
          visible={true}
          overlayProps={{
            radius: 'sm',
            blur: 2,
            style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
          }}
        />
      }>
        {/* Loading overlay will be shown while components are loading */}
      </Suspense>
    </Box>
  )
}

export const Scene3D: React.FC<Scene3DProps> = (props) => {
  return (
    <FpsProvider>
      <Scene3DContent {...props} />
    </FpsProvider>
  )
}
