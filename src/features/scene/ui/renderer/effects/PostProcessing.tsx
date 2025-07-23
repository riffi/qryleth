import React from 'react'
import { EffectComposer, Outline } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useMeshSelection } from '../../../lib/hooks/useMeshSelection.ts'




export const PostProcessing: React.FC = () => {
  const { selectedMeshes, hoveredMeshes } = useMeshSelection()


  console.log("finalSelectedObjects", selectedMeshes)

  return (
    <EffectComposer>

      {/* Hover outline effect (green) */}
      {hoveredMeshes.length > 0 && (
        <Outline
          selection={hoveredMeshes}
          edgeStrength={3}
          edgeGlow={0.5}
          edgeThickness={2}
          pulsePeriod={0}
          visibleEdgeColor={0x00ff00}  // Green
          hiddenEdgeColor={0x00ff00}   // Green
          blendFunction={BlendFunction.ALPHA}
          kernelSize={3}
          blur={false}
        />
      )}

      {/* Selection outline effect (orange) */}
      {selectedMeshes.length > 0 && (
        <Outline
          selection={selectedMeshes}
          edgeStrength={4}
          edgeGlow={0.8}
          edgeThickness={3}
          pulsePeriod={2}              // Pulsing effect
          visibleEdgeColor={0xff6600}  // Orange
          hiddenEdgeColor={0x423a34}   // Dark brown
          blendFunction={BlendFunction.ALPHA}
          kernelSize={3}
          blur={false}
        />
      )}
    </EffectComposer>
  )
}
