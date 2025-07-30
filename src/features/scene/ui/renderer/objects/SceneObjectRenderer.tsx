import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PrimitiveRenderer } from '@/shared/r3f/primitives/PrimitiveRenderer.tsx'
import { useRenderMode } from '../../../model/sceneStore.ts'
import type {SceneObject, SceneObjectInstance} from "@/entities/scene/types.ts";
import type {
  ObjectTransformEvent,
  RenderMode,
  SceneClickEvent,
  SceneHoverEvent
} from '@/shared/types/ui'

export interface SceneObjectRendererProps {
  sceneObject: SceneObject
  instance: SceneObjectInstance
  instanceIndex: number
  isSelected?: boolean
  isHovered?: boolean
  renderMode?: RenderMode
  visible?: boolean
  onClick?: (event: SceneClickEvent) => void
  onHover?: (event: SceneHoverEvent) => void
}

export const SceneObjectRenderer: React.FC<SceneObjectRendererProps> = ({
  sceneObject,
  instance,
  instanceIndex,
  isSelected = false,
  isHovered = false,
  onClick,
  onHover,
  visible = true
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const renderMode = useRenderMode()

  const handleClick = (event: any) => {
    event.stopPropagation()
    if (onClick) {
      onClick({
        objectUuid: instance.objectUuid,
        instanceId: instance.uuid,
        point: event.point,
        object: event.object
      })
    }
  }

  const handlePointerOver = (event: any) => {
    event.stopPropagation()
    if (onHover) {
      onHover({
        objectUuid: instance.objectUuid,
        instanceId: instance.uuid,
        objectInstanceIndex: instanceIndex,
        object: event.object
      })
    }
  }

  const handlePointerOut = (event: any) => {
    event.stopPropagation()
    // Clear hover - this could be handled by parent component
  }


  return (
    <group
      ref={groupRef}
      name={sceneObject.name}
      position={instance.transform?.position || [0, 0, 0]}
      rotation={instance.transform?.rotation || [0, 0, 0]}
      scale={instance.transform?.scale || [1, 1, 1]}
      visible={visible}
      userData={{
        generated: true,
        objectUuid: instance.objectUuid,
        objectInstanceUuid: instance.uuid,
        layerId: sceneObject.layerId || 'objects'
      }}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {sceneObject.primitives?.map((primitive, index) => (
        <PrimitiveRenderer
          key={index}
          primitive={primitive}
          renderMode={renderMode}
          objectMaterials={sceneObject.materials}
          userData={{
            generated: true,
            objectUuid: instance.objectUuid,
            objectInstanceUuid: instance.uuid,
            layerId: sceneObject.layerId || 'objects'
          }}
        />
      ))}
    </group>
  )
}
