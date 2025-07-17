import type { 
  SceneObject, 
  ScenePlacement, 
  SceneLayer, 
  SceneLighting,
  LightingSettings 
} from '../types/scene'
import type { SerializableSceneState } from './sceneSerializer'

/**
 * Legacy data format interfaces for backward compatibility
 */
interface LegacySceneData {
  version?: string
  objects?: any[]
  placements?: any[]
  layers?: any[]
  lighting?: any
  scene?: any
  [key: string]: any
}

interface LegacyObject {
  id?: string
  name?: string
  type?: string
  primitives?: any[]
  layerId?: string
  [key: string]: any
}

interface LegacyPlacement {
  objectIndex?: number
  position?: number[] | [number, number, number]
  rotation?: number[] | [number, number, number]
  scale?: number[] | [number, number, number]
  [key: string]: any
}

interface LegacyLayer {
  id?: string
  name?: string
  type?: 'object' | 'landscape'
  visible?: boolean
  position?: number
  width?: number
  height?: number
  shape?: 'plane' | 'perlin'
  [key: string]: any
}

/**
 * Compatibility class for handling legacy scene data formats
 */
export class LegacyCompatibility {
  private static readonly CURRENT_VERSION = '1.0.0'
  private static readonly SUPPORTED_LEGACY_VERSIONS = ['0.1.0', '0.2.0', '0.3.0', 'legacy']

  /**
   * Detect if data is in legacy format
   */
  static isLegacyFormat(data: any): boolean {
    if (!data || typeof data !== 'object') return false

    // Check for legacy indicators
    const hasLegacyStructure = (
      // Old object structure
      (data.sceneObjects && Array.isArray(data.sceneObjects)) ||
      // Old scene format
      (data.scene && data.scene.objects) ||
      // Missing version or old version
      (!data.version || this.SUPPORTED_LEGACY_VERSIONS.includes(data.version)) ||
      // Old lighting format
      (data.lighting && data.lighting.ambientColor) ||
      // Old layer format
      (data.layers && data.layers.some((l: any) => l.objects))
    )

    return hasLegacyStructure
  }

  /**
   * Migrate legacy data to current R3F format
   */
  static migrateLegacyData(legacyData: LegacySceneData): SerializableSceneState {
    console.log('Migrating legacy scene data to R3F format')

    // Extract components from legacy data
    const objects = this.migrateLegacyObjects(legacyData)
    const placements = this.migrateLegacyPlacements(legacyData)
    const layers = this.migrateLegacyLayers(legacyData)
    const lighting = this.migrateLegacyLighting(legacyData)

    // Create R3F compatible scene state
    const migratedData: SerializableSceneState = {
      version: this.CURRENT_VERSION,
      timestamp: Date.now(),
      currentScene: {
        name: legacyData.scene?.name || 'Migrated Scene',
        status: 'saved'
      },
      objects,
      placements,
      layers,
      lighting,
      viewState: {
        viewMode: 'orbit',
        renderMode: 'solid',
        transformMode: 'translate',
        gridVisible: true
      },
      metadata: {
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        author: 'Legacy Migration',
        description: 'Scene migrated from legacy format'
      }
    }

    console.log('Legacy migration completed:', {
      objectCount: objects.length,
      placementCount: placements.length,
      layerCount: layers.length
    })

    return migratedData
  }

  /**
   * Migrate legacy objects to R3F format
   */
  private static migrateLegacyObjects(legacyData: LegacySceneData): SceneObject[] {
    const legacyObjects = legacyData.objects || legacyData.sceneObjects || []
    
    return legacyObjects.map((legacyObj: LegacyObject, index: number): SceneObject => {
      return {
        id: legacyObj.id || `migrated-object-${index}`,
        name: legacyObj.name || `Object ${index + 1}`,
        type: legacyObj.type || 'composite',
        primitives: this.migrateLegacyPrimitives(legacyObj.primitives || []),
        layerId: legacyObj.layerId || 'objects'
      }
    })
  }

  /**
   * Migrate legacy primitives to R3F format
   */
  private static migrateLegacyPrimitives(legacyPrimitives: any[]): any[] {
    return legacyPrimitives.map(primitive => {
      // Normalize primitive type names
      let type = primitive.type || 'box'
      if (type === 'cube') type = 'box'
      if (type === 'ball') type = 'sphere'

      // Migrate size properties
      const size = this.migrateLegacySize(primitive.size || primitive.dimensions, type)

      // Migrate material properties
      const material = this.migrateLegacyMaterial(primitive.material || {})

      return {
        type,
        size,
        material
      }
    })
  }

  /**
   * Migrate legacy size/dimensions to R3F format
   */
  private static migrateLegacySize(legacySize: any, type: string): any {
    if (!legacySize) {
      return this.getDefaultSizeForType(type)
    }

    switch (type) {
      case 'box':
        return {
          width: legacySize.width || legacySize.x || 1,
          height: legacySize.height || legacySize.y || 1,
          depth: legacySize.depth || legacySize.z || 1
        }
      
      case 'sphere':
        return {
          radius: legacySize.radius || legacySize.size || 0.5
        }
      
      case 'cylinder':
        return {
          radiusTop: legacySize.radiusTop || legacySize.radius || 0.5,
          radiusBottom: legacySize.radiusBottom || legacySize.radius || 0.5,
          height: legacySize.height || 1
        }
      
      case 'cone':
      case 'pyramid':
        return {
          radius: legacySize.radius || legacySize.size || 0.5,
          height: legacySize.height || 1
        }
      
      case 'plane':
        return {
          width: legacySize.width || legacySize.x || 1,
          height: legacySize.height || legacySize.y || 1
        }
      
      default:
        return legacySize
    }
  }

  /**
   * Migrate legacy material properties
   */
  private static migrateLegacyMaterial(legacyMaterial: any): any {
    return {
      color: legacyMaterial.color || legacyMaterial.diffuse || '#ffffff',
      opacity: legacyMaterial.opacity !== undefined ? legacyMaterial.opacity : 1,
      wireframe: legacyMaterial.wireframe || false
    }
  }

  /**
   * Migrate legacy placements to R3F format
   */
  private static migrateLegacyPlacements(legacyData: LegacySceneData): ScenePlacement[] {
    const legacyPlacements = legacyData.placements || []
    
    return legacyPlacements.map((legacyPlacement: LegacyPlacement): ScenePlacement => {
      return {
        objectIndex: legacyPlacement.objectIndex || 0,
        position: this.normalizeVector3(legacyPlacement.position, [0, 0, 0]),
        rotation: this.normalizeVector3(legacyPlacement.rotation, [0, 0, 0]),
        scale: this.normalizeVector3(legacyPlacement.scale, [1, 1, 1])
      }
    })
  }

  /**
   * Migrate legacy layers to R3F format
   */
  private static migrateLegacyLayers(legacyData: LegacySceneData): SceneLayer[] {
    const legacyLayers = legacyData.layers || []
    
    // Ensure we always have a default objects layer
    const migratedLayers: SceneLayer[] = []

    // Add default objects layer if it doesn't exist
    if (!legacyLayers.find((l: any) => l.id === 'objects')) {
      migratedLayers.push({
        id: 'objects',
        name: 'Объекты',
        type: 'object',
        visible: true,
        position: 0
      })
    }

    // Migrate existing layers
    legacyLayers.forEach((legacyLayer: LegacyLayer, index: number) => {
      const migratedLayer: SceneLayer = {
        id: legacyLayer.id || `layer-${index}`,
        name: legacyLayer.name || `Layer ${index + 1}`,
        type: legacyLayer.type || 'object',
        visible: legacyLayer.visible !== false,
        position: legacyLayer.position !== undefined ? legacyLayer.position : index
      }

      // Add landscape-specific properties
      if (migratedLayer.type === 'landscape') {
        if (legacyLayer.width) migratedLayer.width = legacyLayer.width
        if (legacyLayer.height) migratedLayer.height = legacyLayer.height
        if (legacyLayer.shape) migratedLayer.shape = legacyLayer.shape
      }

      migratedLayers.push(migratedLayer)
    })

    return migratedLayers
  }

  /**
   * Migrate legacy lighting to R3F format
   */
  private static migrateLegacyLighting(legacyData: LegacySceneData): SceneLighting {
    const legacyLighting = legacyData.lighting || {}

    // Handle old LightingSettings format
    if (legacyLighting.ambientColor) {
      return {
        ambient: {
          color: legacyLighting.ambientColor || '#404040',
          intensity: legacyLighting.ambientIntensity || 0.6
        },
        directional: {
          color: legacyLighting.directionalColor || '#ffffff',
          intensity: legacyLighting.directionalIntensity || 1.0,
          position: [10, 10, 5],
          castShadow: true
        }
      }
    }

    // Handle partial R3F format
    return {
      ambient: {
        color: legacyLighting.ambient?.color || '#404040',
        intensity: legacyLighting.ambient?.intensity || 0.6
      },
      directional: {
        color: legacyLighting.directional?.color || '#ffffff',
        intensity: legacyLighting.directional?.intensity || 1.0,
        position: legacyLighting.directional?.position || [10, 10, 5],
        castShadow: legacyLighting.directional?.castShadow !== false
      }
    }
  }

  /**
   * Normalize vector3 arrays to ensure proper format
   */
  private static normalizeVector3(vector: any, defaultValue: [number, number, number]): [number, number, number] {
    if (!vector) return defaultValue
    if (!Array.isArray(vector)) return defaultValue
    if (vector.length < 3) return defaultValue
    
    return [
      typeof vector[0] === 'number' ? vector[0] : defaultValue[0],
      typeof vector[1] === 'number' ? vector[1] : defaultValue[1],
      typeof vector[2] === 'number' ? vector[2] : defaultValue[2]
    ]
  }

  /**
   * Get default size for primitive type
   */
  private static getDefaultSizeForType(type: string): any {
    switch (type) {
      case 'box':
        return { width: 1, height: 1, depth: 1 }
      case 'sphere':
        return { radius: 0.5 }
      case 'cylinder':
        return { radiusTop: 0.5, radiusBottom: 0.5, height: 1 }
      case 'cone':
      case 'pyramid':
        return { radius: 0.5, height: 1 }
      case 'plane':
        return { width: 1, height: 1 }
      default:
        return { width: 1, height: 1, depth: 1 }
    }
  }

  /**
   * Validate migrated data
   */
  static validateMigratedData(data: SerializableSceneState): { isValid: boolean; issues: string[] } {
    const issues: string[] = []

    // Check required fields
    if (!data.objects || !Array.isArray(data.objects)) {
      issues.push('Missing or invalid objects array')
    }

    if (!data.placements || !Array.isArray(data.placements)) {
      issues.push('Missing or invalid placements array')
    }

    if (!data.layers || !Array.isArray(data.layers)) {
      issues.push('Missing or invalid layers array')
    }

    // Check object references
    data.placements.forEach((placement, index) => {
      if (placement.objectIndex >= data.objects.length) {
        issues.push(`Placement ${index} references non-existent object ${placement.objectIndex}`)
      }
    })

    // Check layer references
    data.objects.forEach((obj, index) => {
      if (obj.layerId) {
        const layer = data.layers.find(l => l.id === obj.layerId)
        if (!layer) {
          issues.push(`Object ${index} references non-existent layer ${obj.layerId}`)
        }
      }
    })

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  /**
   * Create migration report
   */
  static createMigrationReport(originalData: any, migratedData: SerializableSceneState): string {
    const report = [
      '=== Legacy Scene Migration Report ===',
      `Migration Date: ${new Date().toISOString()}`,
      `Original Format: ${originalData.version || 'Unknown/Legacy'}`,
      `New Format: ${migratedData.version}`,
      '',
      '--- Data Summary ---',
      `Objects: ${migratedData.objects.length}`,
      `Placements: ${migratedData.placements.length}`,
      `Layers: ${migratedData.layers.length}`,
      '',
      '--- Migration Details ---'
    ]

    // Add object type breakdown
    const objectTypes: { [key: string]: number } = {}
    migratedData.objects.forEach(obj => {
      objectTypes[obj.type] = (objectTypes[obj.type] || 0) + 1
    })

    report.push('Object Types:')
    Object.entries(objectTypes).forEach(([type, count]) => {
      report.push(`  ${type}: ${count}`)
    })

    // Add layer breakdown
    report.push('', 'Layers:')
    migratedData.layers.forEach(layer => {
      report.push(`  ${layer.name} (${layer.type}): ${layer.visible ? 'visible' : 'hidden'}`)
    })

    const validation = this.validateMigratedData(migratedData)
    if (!validation.isValid) {
      report.push('', '--- WARNINGS ---')
      validation.issues.forEach(issue => {
        report.push(`  ⚠️ ${issue}`)
      })
    } else {
      report.push('', '✅ Migration completed successfully with no issues')
    }

    return report.join('\n')
  }
}