import React, { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Box, LoadingOverlay } from '@mantine/core'
import * as THREE from 'three'
import { SceneContent } from './SceneContent.tsx'
import { useSceneUISync, useSceneRealTimeSync } from '@/features/editor/scene/lib/hooks/useSceneUISync'
import { useSceneStore, useIsTerrainApplying } from '../../model/sceneStore.ts'
import { FpsProvider, useFpsContext } from '../../lib/contexts/FpsContext'
import { FpsDisplay } from './controls/FpsDisplay'
import { UiMode } from '@/shared/types/ui'
import { TerrainTextureDebugPanel } from './landscape/TerrainTextureDebugPanel'

interface Scene3DProps {
  className: string,
  onSceneReady: () => void
}

// Внутренний стабильный блок Canvas + содержимое сцены.
// Обёрнут в React.memo, чтобы частые апдейты FPS контекста не приводили к ре-рендеру Canvas-компонента
// и, как следствие, к переинициализации postprocessing-пайплайна (создание новых служебных three.Scene).
const CanvasArea: React.FC<{
  className: string
  onSceneReady: () => void
  renderProfile: any
  cameraOptions: any
  glOptions: any
}> = React.memo(({ className, onSceneReady, renderProfile, cameraOptions, glOptions }) => {
  return (
    <Canvas
      camera={cameraOptions}
      shadows="soft"
      gl={glOptions}
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
  )
})

CanvasArea.displayName = 'CanvasArea'

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

  // ВАЖНО: R3F <Canvas> чувствителен к стабильности ссылочных пропсов.
  // Если передавать новые литералы объектов при каждом ре-рендере родителя (например, из-за обновления FPS),
  // R3F может пересоздавать внутренние ресурсы (renderer/scene/passes). Это приводит к «размножению» пустых сцен в three.js devtools.
  // Поэтому мемоизируем конфиги камеры и WebGLRenderer, чтобы их ссылка оставалась стабильной между кадрами.
  const cameraOptions = useMemo(() => ({
    position: [5, 5, 8] as [number, number, number],
    fov: 45,
    near: 0.1,
    far: 2000,
  }), [])

  const glOptions = useMemo(() => ({
    antialias: true,
    alpha: true,
    outputColorSpace: THREE.SRGBColorSpace,
    toneMapping: THREE.NoToneMapping,
  }), [])

  // Делаем стабильный колбэк для CanvasArea, чтобы React.memo не срабатывал впустую
  // из-за новой ссылки onSceneReady при родительских ре-рендерах.
  const onReadyRef = useRef<() => void>(() => {})
  useEffect(() => { onReadyRef.current = () => { try { onSceneReady?.() } catch {} } }, [onSceneReady])
  const stableOnSceneReady = useMemo(() => ((..._args: any[]) => onReadyRef.current()), [])

  return (
    <Box className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Важно: тонемаппинг перенесён в EffectComposer (SceneContent),
          поэтому на рендерере отключаем toneMapping (NoToneMapping),
          чтобы избежать двойного применения и некорректного влияния exposure. */}
      <CanvasArea
        className={className}
        onSceneReady={stableOnSceneReady}
        renderProfile={renderProfile}
        cameraOptions={cameraOptions}
        glOptions={glOptions}
      />

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

      {/* Отладочная панель атласов/splatmap террейна */}
      <TerrainTextureDebugPanel />
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
