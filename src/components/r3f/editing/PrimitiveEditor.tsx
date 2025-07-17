import React, { useState, useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import { useSceneStore } from '../../../stores/sceneStore'
import { useSceneActions } from '../../../stores/optimizedSelectors'
import type { ScenePrimitive, SceneObject } from '../../../types/scene'
import * as THREE from 'three'

interface PrimitiveEditorProps {
  objectIndex: number
  primitiveIndex: number
  enabled?: boolean
  mode?: 'translate' | 'rotate' | 'scale'
  onPrimitiveChange?: (primitiveIndex: number, updates: Partial<ScenePrimitive>) => void
}

/**
 * R3F component for editing individual primitives within an object
 * Provides transform controls and real-time feedback
 */
export const PrimitiveEditor: React.FC<PrimitiveEditorProps> = ({
  objectIndex,
  primitiveIndex,
  enabled = false,
  mode = 'translate',
  onPrimitiveChange
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const transformRef = useRef<any>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  const { camera, gl } = useThree()
  const objects = useSceneStore(state => state.objects)
  const { updateObject } = useSceneActions()
  
  const currentObject = objects[objectIndex]
  const currentPrimitive = currentObject?.primitives[primitiveIndex]
  
  if (!currentObject || !currentPrimitive) {
    return null
  }

  const handleTransformStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleTransformEnd = useCallback(() => {
    setIsDragging(false)
    
    if (meshRef.current && transformRef.current) {
      const mesh = meshRef.current
      const { position, rotation, scale } = mesh
      
      // Update primitive properties based on transform changes
      const updatedPrimitive: ScenePrimitive = {
        ...currentPrimitive,
        // For primitives, we need to update their relative transforms
        // This is a simplified version - actual implementation would depend on primitive type
        material: {
          ...currentPrimitive.material,
          // Material properties don't change with transforms
        }
      }

      // Update the object with the modified primitive
      const updatedPrimitives = [...currentObject.primitives]
      updatedPrimitives[primitiveIndex] = updatedPrimitive
      
      updateObject(objectIndex, {
        primitives: updatedPrimitives
      })

      // Notify parent component
      onPrimitiveChange?.(primitiveIndex, updatedPrimitive)
    }
  }, [currentPrimitive, currentObject, objectIndex, primitiveIndex, updateObject, onPrimitiveChange])

  // Render the primitive geometry
  const renderPrimitiveGeometry = () => {
    const { type, size } = currentPrimitive
    
    switch (type) {
      case 'box':
        return (
          <boxGeometry 
            args={[
              size?.width || 1,
              size?.height || 1,
              size?.depth || 1
            ]} 
          />
        )
      
      case 'sphere':
        return (
          <sphereGeometry 
            args={[
              size?.radius || 0.5,
              32, 32
            ]} 
          />
        )
      
      case 'cylinder':
        return (
          <cylinderGeometry 
            args={[
              size?.radiusTop || 0.5,
              size?.radiusBottom || 0.5,
              size?.height || 1,
              32
            ]} 
          />
        )
      
      case 'cone':
        return (
          <coneGeometry 
            args={[
              size?.radius || 0.5,
              size?.height || 1,
              32
            ]} 
          />
        )
      
      case 'pyramid':
        return (
          <coneGeometry 
            args={[
              size?.radius || 0.5,
              size?.height || 1,
              4 // 4 sides for pyramid
            ]} 
          />
        )
      
      case 'plane':
        return (
          <planeGeometry 
            args={[
              size?.width || 1,
              size?.height || 1
            ]} 
          />
        )
      
      default:
        return <boxGeometry args={[1, 1, 1]} />
    }
  }

  // Render the primitive material
  const renderPrimitiveMaterial = () => {
    const { material } = currentPrimitive
    
    return (
      <meshLambertMaterial
        color={material?.color || '#ffffff'}
        transparent={material?.opacity !== undefined}
        opacity={material?.opacity || 1}
        wireframe={material?.wireframe || false}
      />
    )
  }

  return (
    <group>
      {/* The editable primitive mesh */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
      >
        {renderPrimitiveGeometry()}
        {renderPrimitiveMaterial()}
      </mesh>

      {/* Transform controls for editing */}
      {enabled && (
        <TransformControls
          ref={transformRef}
          object={meshRef.current}
          mode={mode}
          onObjectChange={handleTransformEnd}
          onMouseDown={handleTransformStart}
          onMouseUp={handleTransformEnd}
        />
      )}
    </group>
  )
}

/**
 * Hook for managing primitive editing state and operations
 */
export const usePrimitiveEditor = (objectIndex: number) => {
  const [editingPrimitiveIndex, setEditingPrimitiveIndex] = useState<number | null>(null)
  const [editMode, setEditMode] = useState<'translate' | 'rotate' | 'scale'>('translate')
  
  const objects = useSceneStore(state => state.objects)
  const { updateObject } = useSceneActions()
  
  const currentObject = objects[objectIndex]

  // Start editing a specific primitive
  const startEditingPrimitive = useCallback((primitiveIndex: number) => {
    setEditingPrimitiveIndex(primitiveIndex)
  }, [])

  // Stop editing primitives
  const stopEditingPrimitive = useCallback(() => {
    setEditingPrimitiveIndex(null)
  }, [])

  // Clone a primitive
  const clonePrimitive = useCallback((primitiveIndex: number) => {
    if (currentObject) {
      const originalPrimitive = currentObject.primitives[primitiveIndex]
      if (originalPrimitive) {
        const clonedPrimitive: ScenePrimitive = {
          ...originalPrimitive,
          // Offset the cloned primitive slightly
        }
        
        const updatedPrimitives = [...currentObject.primitives, clonedPrimitive]
        updateObject(objectIndex, { primitives: updatedPrimitives })
      }
    }
  }, [currentObject, objectIndex, updateObject])

  // Delete a primitive
  const deletePrimitive = useCallback((primitiveIndex: number) => {
    if (currentObject && currentObject.primitives.length > 1) {
      const updatedPrimitives = currentObject.primitives.filter((_, index) => index !== primitiveIndex)
      updateObject(objectIndex, { primitives: updatedPrimitives })
      
      // Stop editing if we were editing the deleted primitive
      if (editingPrimitiveIndex === primitiveIndex) {
        setEditingPrimitiveIndex(null)
      }
    }
  }, [currentObject, objectIndex, updateObject, editingPrimitiveIndex])

  // Update primitive properties
  const updatePrimitive = useCallback((primitiveIndex: number, updates: Partial<ScenePrimitive>) => {
    if (currentObject) {
      const updatedPrimitives = [...currentObject.primitives]
      updatedPrimitives[primitiveIndex] = {
        ...updatedPrimitives[primitiveIndex],
        ...updates
      }
      updateObject(objectIndex, { primitives: updatedPrimitives })
    }
  }, [currentObject, objectIndex, updateObject])

  // Add a new primitive to the object
  const addPrimitive = useCallback((primitiveType: ScenePrimitive['type']) => {
    if (currentObject) {
      const newPrimitive: ScenePrimitive = {
        type: primitiveType,
        size: getDefaultSizeForType(primitiveType),
        material: {
          color: '#ffffff',
          opacity: 1,
          wireframe: false
        }
      }
      
      const updatedPrimitives = [...currentObject.primitives, newPrimitive]
      updateObject(objectIndex, { primitives: updatedPrimitives })
      
      // Start editing the new primitive
      setEditingPrimitiveIndex(updatedPrimitives.length - 1)
    }
  }, [currentObject, objectIndex, updateObject])

  return {
    editingPrimitiveIndex,
    editMode,
    setEditMode,
    startEditingPrimitive,
    stopEditingPrimitive,
    clonePrimitive,
    deletePrimitive,
    updatePrimitive,
    addPrimitive,
    primitives: currentObject?.primitives || []
  }
}

/**
 * Container component for editing all primitives in an object
 */
interface ObjectPrimitiveEditorProps {
  objectIndex: number
  enabled?: boolean
}

export const ObjectPrimitiveEditor: React.FC<ObjectPrimitiveEditorProps> = ({
  objectIndex,
  enabled = false
}) => {
  const {
    editingPrimitiveIndex,
    editMode,
    startEditingPrimitive,
    updatePrimitive,
    primitives
  } = usePrimitiveEditor(objectIndex)

  const handlePrimitiveClick = useCallback((primitiveIndex: number) => {
    if (enabled) {
      startEditingPrimitive(primitiveIndex)
    }
  }, [enabled, startEditingPrimitive])

  return (
    <group>
      {primitives.map((primitive, index) => (
        <group
          key={index}
          onClick={(e) => {
            e.stopPropagation()
            handlePrimitiveClick(index)
          }}
        >
          <PrimitiveEditor
            objectIndex={objectIndex}
            primitiveIndex={index}
            enabled={enabled && editingPrimitiveIndex === index}
            mode={editMode}
            onPrimitiveChange={updatePrimitive}
          />
        </group>
      ))}
    </group>
  )
}

// Helper function to get default size for primitive types
function getDefaultSizeForType(type: ScenePrimitive['type']) {
  switch (type) {
    case 'box':
      return { width: 1, height: 1, depth: 1 }
    case 'sphere':
      return { radius: 0.5 }
    case 'cylinder':
      return { radiusTop: 0.5, radiusBottom: 0.5, height: 1 }
    case 'cone':
      return { radius: 0.5, height: 1 }
    case 'pyramid':
      return { radius: 0.5, height: 1 }
    case 'plane':
      return { width: 1, height: 1 }
    default:
      return { width: 1, height: 1, depth: 1 }
  }
}