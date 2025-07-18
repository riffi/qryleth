import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Box } from '@mantine/core'
import * as THREE from 'three'
import { ObjectSceneContent } from './ObjectSceneContent'
import type { Scene3DProps } from '../../types/r3f'

export const ObjectScene3D: React.FC<Scene3DProps> = ({ className, onSceneReady }) => {
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
          shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap }
        }}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
        onCreated={(state) => {
          state.gl.setPixelRatio(window.devicePixelRatio)
          state.gl.shadowMap.enabled = true
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
