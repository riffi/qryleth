import React, { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Detailed, useBounds } from '@react-three/drei'
import * as THREE from 'three'
import type { SceneObject, ScenePlacement } from '../../../types/scene'

interface LODObjectProps {
  sceneObject: SceneObject
  placement: ScenePlacement
  placementIndex: number
  children: React.ReactNode
  lodDistances?: [number, number, number] // [high, medium, low] distances
}

export const LODObject: React.FC<LODObjectProps> = ({
  sceneObject,
  placement,
  placementIndex,
  children,
  lodDistances = [10, 25, 50]
}) => {
  const meshRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  
  // Calculate object position
  const position = useMemo(() => {
    const [x, y, z] = placement.position || [0, 0, 0]
    return new THREE.Vector3(x, y, z)
  }, [placement.position])

  // Create simplified versions for different LOD levels
  const createSimplifiedObject = (complexity: 'high' | 'medium' | 'low') => {
    const segments = complexity === 'high' ? 32 : complexity === 'medium' ? 16 : 8
    
    return (
      <group>
        {sceneObject.primitives.map((primitive, index) => {
          const { type, size, material } = primitive
          
          switch (type) {
            case 'sphere':
              return (
                <mesh key={index} castShadow receiveShadow>
                  <sphereGeometry 
                    args={[
                      size?.radius || 0.5,
                      segments, segments
                    ]} 
                  />
                  <meshLambertMaterial 
                    color={material?.color || '#ffffff'}
                    wireframe={complexity === 'low'}
                  />
                </mesh>
              )
            
            case 'cylinder':
              return (
                <mesh key={index} castShadow receiveShadow>
                  <cylinderGeometry 
                    args={[
                      size?.radiusTop || 0.5,
                      size?.radiusBottom || 0.5,
                      size?.height || 1,
                      segments
                    ]} 
                  />
                  <meshLambertMaterial 
                    color={material?.color || '#ffffff'}
                    wireframe={complexity === 'low'}
                  />
                </mesh>
              )
            
            default:
              // For box, cone, pyramid, plane - use original children for high detail
              return complexity === 'high' ? children : (
                <mesh key={index} castShadow receiveShadow>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshLambertMaterial 
                    color={material?.color || '#ffffff'}
                    wireframe={complexity === 'low'}
                  />
                </mesh>
              )
          }
        })}
      </group>
    )
  }

  return (
    <group
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      rotation={placement.rotation}
      scale={placement.scale}
    >
      <Detailed distances={lodDistances}>
        {/* High detail */}
        {children}
        
        {/* Medium detail */}
        {createSimplifiedObject('medium')}
        
        {/* Low detail */}
        {createSimplifiedObject('low')}
      </Detailed>
    </group>
  )
}

interface FrustumCulledObjectProps {
  sceneObject: SceneObject
  placement: ScenePlacement
  children: React.ReactNode
  cullDistance?: number
}

export const FrustumCulledObject: React.FC<FrustumCulledObjectProps> = ({
  sceneObject,
  placement,
  children,
  cullDistance = 100
}) => {
  const meshRef = useRef<THREE.Group>(null)
  const [visible, setVisible] = React.useState(true)
  const { camera } = useThree()
  
  const position = useMemo(() => {
    const [x, y, z] = placement.position || [0, 0, 0]
    return new THREE.Vector3(x, y, z)
  }, [placement.position])

  useFrame(() => {
    if (!meshRef.current) return
    
    // Distance culling
    const distance = camera.position.distanceTo(position)
    if (distance > cullDistance) {
      if (visible) setVisible(false)
      return
    }
    
    // Frustum culling
    const frustum = new THREE.Frustum()
    const matrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    )
    frustum.setFromProjectionMatrix(matrix)
    
    // Create bounding sphere for object
    const sphere = new THREE.Sphere(position, 2) // Approximate radius
    const isInFrustum = frustum.intersectsSphere(sphere)
    
    if (isInFrustum !== visible) {
      setVisible(isInFrustum)
    }
  })

  if (!visible) return null

  return (
    <group
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      rotation={placement.rotation}
      scale={placement.scale}
    >
      {children}
    </group>
  )
}

// Combined optimization component
interface OptimizedObjectProps {
  sceneObject: SceneObject
  placement: ScenePlacement
  placementIndex: number
  children: React.ReactNode
  enableLOD?: boolean
  enableFrustumCulling?: boolean
  lodDistances?: [number, number, number]
  cullDistance?: number
}

export const OptimizedObject: React.FC<OptimizedObjectProps> = ({
  sceneObject,
  placement,
  placementIndex,
  children,
  enableLOD = false,
  enableFrustumCulling = true,
  lodDistances,
  cullDistance
}) => {
  let content = children

  // Apply LOD if enabled
  if (enableLOD) {
    content = (
      <LODObject
        sceneObject={sceneObject}
        placement={placement}
        placementIndex={placementIndex}
        lodDistances={lodDistances}
      >
        {content}
      </LODObject>
    )
  }

  // Apply frustum culling if enabled
  if (enableFrustumCulling) {
    content = (
      <FrustumCulledObject
        sceneObject={sceneObject}
        placement={placement}
        cullDistance={cullDistance}
      >
        {content}
      </FrustumCulledObject>
    )
  }

  return <>{content}</>
}

// Hook to determine if performance optimizations should be enabled
export const usePerformanceOptimization = () => {
  const { camera, scene } = useThree()
  
  return useMemo(() => {
    // Count total objects in scene
    let objectCount = 0
    scene.traverse(() => {
      objectCount++
    })
    
    return {
      enableLOD: objectCount > 100, // Enable LOD for scenes with 100+ objects
      enableFrustumCulling: objectCount > 50, // Enable culling for scenes with 50+ objects
      lodDistances: [15, 35, 70] as [number, number, number],
      cullDistance: 150
    }
  }, [scene])
}