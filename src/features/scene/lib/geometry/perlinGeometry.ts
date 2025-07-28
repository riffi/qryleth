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

  const segments = width > 200 ? 200 : width
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

  // Apply noise to vertices with edge fade-out
  let appliedCount = 0
  const halfWidth = width / 2
  const halfHeight = height / 2

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const z = positions[i + 2]
    const originalY = positions[i + 1]

    // Normalize coordinates to noise array indices
    const noiseX = Math.floor(((x + width / 2) / width) * segments)
    const noiseZ = Math.floor(((z + height / 2) / height) * segments)

    // Get noise value
    const noiseIndex = noiseZ * (segments + 1) + noiseX
    const noiseValue = noiseData[noiseIndex] || 0

    // Calculate distance from edges (0 at edge, 1 at center)
    const distFromLeftEdge = (x + halfWidth) / width
    const distFromRightEdge = (halfWidth - x) / width
    const distFromTopEdge = (z + halfHeight) / height
    const distFromBottomEdge = (halfHeight - z) / height

    // Find minimum distance to any edge
    const edgeDistance = Math.min(distFromLeftEdge, distFromRightEdge, distFromTopEdge, distFromBottomEdge)

    // Create fade-out factor (0 at edges, 1 towards center)
    const fadeOutDistance = 0.15 // 15% of the terrain from edges will fade to 0
    const fadeFactor = Math.max(0, Math.min(1, edgeDistance / fadeOutDistance))

    // Apply noise with fade-out effect
    let heightValue = noiseValue * 4 * fadeFactor

    // Ensure edges are at 0 or below
    if (fadeFactor === 0) {
      heightValue = Math.min(0, heightValue)
    }

    positions[i + 1] = heightValue

    if (appliedCount < 5) {
      console.log(`Vertex ${appliedCount}: x=${x}, z=${z}, originalY=${originalY}, newY=${positions[i + 1]}, noiseValue=${noiseValue}, fadeFactor=${fadeFactor}`)
      appliedCount++
    }
  }

  geometry.attributes.position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()

  console.log('Final geometry bounding box:', geometry.boundingBox)

  return { geometry, noiseData }
}
