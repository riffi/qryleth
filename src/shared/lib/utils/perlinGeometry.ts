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

  // Apply noise to vertices
  let appliedCount = 0
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const z = positions[i + 2]
    const originalY = positions[i + 1]

    // Normalize coordinates to noise array indices
    const noiseX = Math.floor(((x + width / 2) / width) * segments)
    const noiseZ = Math.floor(((z + height / 2) / height) * segments)

    // Get noise value and apply to height
    const noiseIndex = noiseZ * (segments + 1) + noiseX
    const noiseValue = noiseData[noiseIndex] || 0
    positions[i + 1] = noiseValue * 4 // Multiply by 4 for more pronounced effect

    if (appliedCount < 5) {
      console.log(`Vertex ${appliedCount}: x=${x}, z=${z}, originalY=${originalY}, newY=${positions[i + 1]}, noiseValue=${noiseValue}`)
      appliedCount++
    }
  }

  geometry.attributes.position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()

  console.log('Final geometry bounding box:', geometry.boundingBox)

  return { geometry, noiseData }
}