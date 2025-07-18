import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ScenePrimitive } from '../../../types/scene'

// Material cache to reuse materials with same properties
const materialCache = new Map<string, THREE.Material>()

// Geometry cache to reuse geometries with same parameters
const geometryCache = new Map<string, THREE.BufferGeometry>()

interface OptimizedMaterialProps {
  primitive: ScenePrimitive
  renderMode?: 'solid' | 'wireframe'
}

export const OptimizedMaterial: React.FC<OptimizedMaterialProps> = ({ 
  primitive, 
  renderMode = 'solid' 
}) => {
  const { material } = primitive
  
  const optimizedMaterial = useMemo(() => {
    const materialKey = JSON.stringify({
      color: material?.color || '#ffffff',
      opacity: material?.opacity || 1,
      wireframe: renderMode === 'wireframe' || material?.wireframe || false,
      transparent: material?.opacity !== undefined && material.opacity < 1
    })

    // Check if material already exists in cache
    if (materialCache.has(materialKey)) {
      return materialCache.get(materialKey)!
    }

    // Create new material and cache it
    const newMaterial = new THREE.MeshLambertMaterial({
      color: material?.color || '#ffffff',
      transparent: material?.opacity !== undefined && material.opacity < 1,
      opacity: material?.opacity || 1,
      wireframe: renderMode === 'wireframe' || material?.wireframe || false,
      side: THREE.DoubleSide
    })

    materialCache.set(materialKey, newMaterial)
    return newMaterial
  }, [material, renderMode])

  return <primitive object={optimizedMaterial} attach="material" />
}

interface OptimizedGeometryProps {
  primitive: ScenePrimitive
  quality?: 'low' | 'medium' | 'high'
}

export const OptimizedGeometry: React.FC<OptimizedGeometryProps> = ({ 
  primitive, 
  quality = 'medium' 
}) => {
  const { type, size } = primitive
  
  const optimizedGeometry = useMemo(() => {
    // Determine segments based on quality
    const segments = quality === 'high' ? 32 : quality === 'medium' ? 16 : 8
    
    const geometryKey = JSON.stringify({
      type,
      size,
      quality,
      segments
    })

    // Check if geometry already exists in cache
    if (geometryCache.has(geometryKey)) {
      return geometryCache.get(geometryKey)!
    }

    let geometry: THREE.BufferGeometry

    switch (type) {
      case 'box':
        geometry = new THREE.BoxGeometry(
          size?.width || 1,
          size?.height || 1,
          size?.depth || 1
        )
        break
      
      case 'sphere':
        geometry = new THREE.SphereGeometry(
          size?.radius || 0.5,
          segments,
          segments
        )
        break
      
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(
          size?.radiusTop || 0.5,
          size?.radiusBottom || 0.5,
          size?.height || 1,
          segments
        )
        break
      
      case 'cone':
        geometry = new THREE.ConeGeometry(
          size?.radius || 0.5,
          size?.height || 1,
          segments
        )
        break
      
      case 'pyramid':
        geometry = new THREE.ConeGeometry(
          size?.radius || 0.5,
          size?.height || 1,
          4 // 4 sides for pyramid
        )
        break
      
      case 'plane':
        geometry = new THREE.PlaneGeometry(
          size?.width || 1,
          size?.height || 1,
          quality === 'low' ? 1 : segments,
          quality === 'low' ? 1 : segments
        )
        break
      
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1)
    }

    // Cache the geometry
    geometryCache.set(geometryKey, geometry)
    return geometry
  }, [type, size, quality])

  return <primitive object={optimizedGeometry} attach="geometry" />
}

interface OptimizedPrimitiveProps {
  primitive: ScenePrimitive
  renderMode?: 'solid' | 'wireframe'
  quality?: 'low' | 'medium' | 'high'
  castShadow?: boolean
  receiveShadow?: boolean
}

export const OptimizedPrimitive: React.FC<OptimizedPrimitiveProps> = ({
  primitive,
  renderMode = 'solid',
  quality = 'medium',
  castShadow = true,
  receiveShadow = true
}) => {
  return (
    <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
      <OptimizedGeometry primitive={primitive} quality={quality} />
      <OptimizedMaterial primitive={primitive} renderMode={renderMode} />
    </mesh>
  )
}

// Batch material updates component
interface BatchedMaterialUpdatesProps {
  children: React.ReactNode
  updateInterval?: number // Update materials every N frames
}

export const BatchedMaterialUpdates: React.FC<BatchedMaterialUpdatesProps> = ({
  children,
  updateInterval = 10
}) => {
  const frameCount = useRef(0)
  const pendingUpdates = useRef<Array<() => void>>([])

  useFrame(() => {
    frameCount.current++
    
    // Process pending updates every updateInterval frames
    if (frameCount.current % updateInterval === 0 && pendingUpdates.current.length > 0) {
      pendingUpdates.current.forEach(update => update())
      pendingUpdates.current = []
    }
  })

  // Provide batched update function through context if needed
  return <>{children}</>
}

// Dynamic quality adjustment based on performance
export const useDynamicQuality = () => {
  const [quality, setQuality] = React.useState<'low' | 'medium' | 'high'>('medium')
  const frameTimeRef = useRef(0)
  const frameCountRef = useRef(0)
  
  useFrame((state, delta) => {
    frameTimeRef.current += delta
    frameCountRef.current++
    
    // Check performance every 60 frames
    if (frameCountRef.current % 60 === 0) {
      const avgFrameTime = frameTimeRef.current / 60
      const fps = 1 / avgFrameTime
      
      // Adjust quality based on FPS
      if (fps > 50) {
        setQuality('high')
      } else if (fps > 30) {
        setQuality('medium')
      } else {
        setQuality('low')
      }
      
      // Reset counters
      frameTimeRef.current = 0
      frameCountRef.current = 0
    }
  })
  
  return quality
}

// Cleanup function for caches
export const clearOptimizationCaches = () => {
  // Dispose all cached materials
  materialCache.forEach(material => {
    material.dispose()
  })
  materialCache.clear()
  
  // Dispose all cached geometries
  geometryCache.forEach(geometry => {
    geometry.dispose()
  })
  geometryCache.clear()
  
  console.log('Optimization caches cleared')
}

// Hook to get cache statistics
export const useOptimizationStats = () => {
  return useMemo(() => ({
    materialCacheSize: materialCache.size,
    geometryCacheSize: geometryCache.size,
    memoryUsage: {
      materials: materialCache.size,
      geometries: geometryCache.size
    }
  }), [])
}