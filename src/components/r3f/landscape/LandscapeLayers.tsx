import React from 'react'
import { useSceneLayers } from '../../../stores/sceneStore'

// Placeholder for landscape layers - will be implemented in Phase 4
export const LandscapeLayers: React.FC = () => {
  const layers = useSceneLayers()
  
  const landscapeLayers = layers.filter(layer => layer.type === 'landscape')
  
  if (landscapeLayers.length === 0) return null

  // For now, just render a comment
  // Full landscape implementation will be done in Phase 4
  return (
    <group>
      {/* Landscape layers will be implemented in Phase 4 */}
    </group>
  )
}