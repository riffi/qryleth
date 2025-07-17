import React from 'react'
import { EffectComposer, Outline, RenderPass } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useObjectSelection } from '../../../hooks/r3f/useObjectSelection'
import type { PostProcessingProps } from '../../../types/r3f'

export const PostProcessing: React.FC<PostProcessingProps> = ({
  selectedObjects: externalSelected,
  hoveredObjects: externalHovered
}) => {
  const { selectedObjects, hoveredObjects } = useObjectSelection()

  // Use external objects if provided, otherwise use from hook
  const finalSelectedObjects = externalSelected || selectedObjects
  const finalHoveredObjects = externalHovered || hoveredObjects

  return (
    <EffectComposer>
      {/* Main render pass */}
      <RenderPass />
      
      {/* Hover outline effect (green) */}
      {finalHoveredObjects.length > 0 && (
        <Outline
          selection={finalHoveredObjects}
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
      {finalSelectedObjects.length > 0 && (
        <Outline
          selection={finalSelectedObjects}
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