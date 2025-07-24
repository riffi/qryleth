import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Box, LoadingOverlay } from '@mantine/core'
import * as THREE from 'three'
import { SceneContent } from './SceneContent.tsx'
import { useSceneUISync, useSceneRealTimeSync } from '@/features/scene/lib/hooks/useSceneUISync'

interface Scene3DProps {
  className: string,
  onSceneReady: () => void
}

export const Scene3D: React.FC<Scene3DProps> = ({
  className,
  onSceneReady
}) => {
  // Инициализируем синхронизацию UI и сцены
  useSceneUISync()
  useSceneRealTimeSync()

  return (
    <Box className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{
          position: [5, 5, 8],
          fov: 45,
          near: 0.1,
          far: 1000
        }}
        shadows="soft"
        gl={{
          antialias: true,
          alpha: true,
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          shadowMap: {
            enabled: true,
            type: THREE.PCFSoftShadowMap
          }
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

              // Set tone mapping
              state.gl.toneMapping = THREE.ACESFilmicToneMapping
              state.gl.toneMappingExposure = 1.0
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
          <SceneContent />
        </Suspense>
      </Canvas>

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
