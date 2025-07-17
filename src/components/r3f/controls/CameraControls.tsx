import React from 'react'
import { OrbitControls, PointerLockControls } from '@react-three/drei'
import { useViewMode } from '../../../stores/sceneStore'
import { WalkControls } from './WalkControls'
import { FlyControls } from './FlyControls'

export const CameraControls: React.FC = () => {
  const viewMode = useViewMode()

  switch (viewMode) {
    case 'orbit':
      return (
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          enableZoom
          enablePan
          target={[0, 0, 0]}
        />
      )
    
    case 'walk':
      return <WalkControls />
    
    case 'fly':
      return <FlyControls />
    
    default:
      return (
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          enableZoom
          enablePan
          target={[0, 0, 0]}
        />
      )
  }
}