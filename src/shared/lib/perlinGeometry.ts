import * as THREE from 'three'
import { generatePerlinNoise } from 'perlin-noise'

export interface PerlinGeometryResult {
  geometry: THREE.BufferGeometry
  noiseData: number[]
}

export const createPerlinGeometry = (
  width: number,
  height: number,
  existingNoiseData?: number[]
): PerlinGeometryResult => {
  console.log('Creating Perlin geometry with dimensions:', width, 'x', height)
  
  const segments = 64
  const geometry = new THREE.PlaneGeometry(width, height, segments, segments)
  geometry.rotateX(-Math.PI / 2) // Make it horizontal
  
  const positions = geometry.attributes.position.array as Float32Array
  console.log('Initial geometry vertices count:', positions.length / 3)

  // Generate Perlin noise or use existing data
  const noiseData = existingNoiseData ?? generatePerlinNoise(segments + 1, segments + 1, {
    octaveCount: 4,
    amplitude: 0.1,
    persistence: 0.5
  })

  console.log('Noise data length:', noiseData.length)
  console.log('Sample noise values:', noiseData.slice(0, 5))

  // Apply noise to vertices with edge fade-out and position distortion
  let appliedCount = 0
  const halfWidth = width / 2
  const halfHeight = height / 2
  
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const z = positions[i + 2]
    const originalY = positions[i + 1]

    // Add slight random distortion to x and z coordinates (but not at edges)
    const distortionStrength = 0.3 // Distortion amount as fraction of segment size
    const segmentSizeX = width / segments
    const segmentSizeZ = height / segments
    
    // Calculate distance from edges for distortion limiting
    const distFromEdgeX = Math.min(Math.abs(x + halfWidth), Math.abs(halfWidth - x)) / halfWidth
    const distFromEdgeZ = Math.min(Math.abs(z + halfHeight), Math.abs(halfHeight - z)) / halfHeight
    const minDistFromEdge = Math.min(distFromEdgeX, distFromEdgeZ)
    
    // Reduce distortion near edges (no distortion at edges, full distortion in center)
    const distortionFactor = Math.max(0, minDistFromEdge - 0.1) / 0.9
    
    // Apply random distortion using a deterministic seed based on position
    const seed = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
    const randomX = (seed - Math.floor(seed)) * 2 - 1 // Random value between -1 and 1
    const randomZ = Math.sin(seed * 2) * 2 - 1
    
    const distortedX = x + randomX * segmentSizeX * distortionStrength * distortionFactor
    const distortedZ = z + randomZ * segmentSizeZ * distortionStrength * distortionFactor
    
    // Update positions with distorted coordinates
    positions[i] = distortedX
    positions[i + 2] = distortedZ

    // Use original coordinates for noise sampling to maintain terrain consistency
    const noiseX = Math.floor(((x + width / 2) / width) * segments)
    const noiseZ = Math.floor(((z + height / 2) / height) * segments)

    // Get noise value
    const noiseIndex = noiseZ * (segments + 1) + noiseX
    let noiseValue = noiseData[noiseIndex] || 0
    
    // Create smooth organic edge shape using radial distance with gentle waves
    const centerX = 0
    const centerZ = 0
    const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (z - centerZ) ** 2)
    const maxRadius = Math.min(halfWidth, halfHeight) * 0.85 // 85% of max possible radius
    
    // Create gentle edge variations using low-frequency waves
    const angle = Math.atan2(z - centerZ, x - centerX)
    const edgeVariation1 = Math.sin(angle * 3) * 0.08 // 3 gentle bumps around the perimeter
    const edgeVariation2 = Math.cos(angle * 5) * 0.05 // 5 smaller variations
    const edgeVariation3 = Math.sin(angle * 7 + Math.PI/3) * 0.03 // 7 tiny variations with phase offset
    
    const totalEdgeVariation = edgeVariation1 + edgeVariation2 + edgeVariation3
    const organicRadius = maxRadius * (1 + totalEdgeVariation)
    
    // Calculate how far inside the organic boundary we are
    const distanceFromEdge = organicRadius - distanceFromCenter
    const normalizedDistance = distanceFromEdge / (organicRadius * 0.3) // 30% fade zone
    
    // Create smooth fade-out factor using smoothstep function for natural transition
    const fadeFactor = Math.max(0, Math.min(1, normalizedDistance))
    const smoothFadeFactor = fadeFactor * fadeFactor * (3 - 2 * fadeFactor) // Smoothstep interpolation
    
    // Hide vertices that are outside the organic boundary with smooth transition
    if (distanceFromEdge < 0) {
      // Make vertex invisible by setting extreme negative height
      positions[i + 1] = -1000
      continue
    }
    
    // Apply noise with smooth fade-out effect
    let heightValue = noiseValue * 4 * smoothFadeFactor
    
    // Ensure edges are at 0 or below with smooth transition
    if (smoothFadeFactor <= 0.1) {
      heightValue = Math.min(0, heightValue)
    }
    
    positions[i + 1] = heightValue

    if (appliedCount < 5) {
      console.log(`Vertex ${appliedCount}: x=${distortedX}, z=${distortedZ}, originalY=${originalY}, newY=${positions[i + 1]}, noiseValue=${noiseValue}, smoothFadeFactor=${smoothFadeFactor}, distanceFromEdge=${distanceFromEdge}`)
      appliedCount++
    }
  }

  geometry.attributes.position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()

  console.log('Final geometry bounding box:', geometry.boundingBox)

  return { geometry, noiseData }
}