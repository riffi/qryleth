import React from 'react'
import { OrbitControls } from '@react-three/drei'
import { useViewMode } from '../model/sceneStore'
import { WalkControls } from './WalkControls'
import { FlyControls } from './FlyControls'

export const CameraControls: React.FC = () => {
  const viewMode = useViewMode()

  switch (viewMode) {
    case 'orbit':
      return (
        <OrbitControls
          makeDefault
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
          makeDefault
          enableDamping
          dampingFactor={0.05}
          enableZoom
          enablePan
          target={[0, 0, 0]}
        />
      )
  }
}
