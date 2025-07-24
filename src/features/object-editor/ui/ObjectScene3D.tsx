import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Box } from '@mantine/core'
import * as THREE from 'three'
import { ObjectSceneContent } from './ObjectSceneContent'

export interface ObjectScene3DProps {
  className?: string
  onSceneReady?: (scene: THREE.Scene) => void
}

/**
 * Компонент, отвечающий за отображение холста Three.js и содержимого сцены.
 * Вызывает колбэк onSceneReady после полной инициализации сцены.
 */
export const ObjectScene3D: React.FC<ObjectScene3DProps> = ({ className, onSceneReady }) => {
  return (
    <Box className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [5, 5, 8], fov: 45, near: 0.1, far: 1000 }}
        shadows="soft"
        gl={{
          antialias: true,
          alpha: true,
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1,
        }}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
        onCreated={(state) => {
          state.gl.setPixelRatio(window.devicePixelRatio)
          state.gl.shadowMap.enabled = false
          state.gl.shadowMap.type = THREE.PCFSoftShadowMap
          state.gl.toneMapping = THREE.ACESFilmicToneMapping
          state.gl.toneMappingExposure = 1
          onSceneReady?.()
        }}
      >
        <Suspense fallback={null}>
          <ObjectSceneContent />
        </Suspense>
      </Canvas>
    </Box>
  )
}
