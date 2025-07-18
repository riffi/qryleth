import type { 
  SceneObject, 
  ScenePlacement, 
  SceneLayer, 
  SceneLighting,
  SceneState 
} from '../types/scene'
import { LegacyCompatibility } from './legacyCompatibility'

// Serializable scene state interface
export interface SerializableSceneState {
  version: string
  timestamp: number
  currentScene: {
    name: string
    status: 'saved' | 'modified'
  }
  objects: SceneObject[]
  placements: ScenePlacement[]
  layers: SceneLayer[]
  lighting: SceneLighting
  viewState: {
    viewMode: 'orbit' | 'walk' | 'fly'
    renderMode: 'solid' | 'wireframe'
    transformMode: 'translate' | 'rotate' | 'scale'
    gridVisible: boolean
  }
  metadata: {
    createdAt: number
    modifiedAt: number
    author?: string
    description?: string
  }
}

// Scene serialization utilities
export class SceneSerializer {
  private static readonly VERSION = '1.0.0'
  
  /**
   * Serialize the current scene state to a JSON-compatible object
   */
  static serialize(sceneState: Partial<SceneState>): SerializableSceneState {
    const now = Date.now()
    
    return {
      version: this.VERSION,
      timestamp: now,
      currentScene: {
        name: sceneState.currentScene?.name || 'Untitled Scene',
        status: sceneState.currentScene?.status || 'saved'
      },
      objects: this.serializeObjects(sceneState.objects || []),
      placements: this.serializePlacements(sceneState.placements || []),
      layers: this.serializeLayers(sceneState.layers || []),
      lighting: this.serializeLighting(sceneState.lighting || this.getDefaultLighting()),
      viewState: {
        viewMode: sceneState.viewMode || 'orbit',
        renderMode: sceneState.renderMode || 'solid',
        transformMode: sceneState.transformMode || 'translate',
        gridVisible: sceneState.gridVisible !== false
      },
      metadata: {
        createdAt: now,
        modifiedAt: now,
        author: 'R3F Scene Editor',
        description: 'Scene created with React Three Fiber migration'
      }
    }
  }

  /**
   * Deserialize a JSON object back to scene state
   */
  static deserialize(data: SerializableSceneState): Partial<SceneState> {
    this.validateVersion(data.version)
    
    return {
      currentScene: {
        name: data.currentScene.name,
        status: data.currentScene.status
      },
      objects: this.deserializeObjects(data.objects),
      placements: this.deserializePlacements(data.placements),
      layers: this.deserializeLayers(data.layers),
      lighting: this.deserializeLighting(data.lighting),
      viewMode: data.viewState.viewMode,
      renderMode: data.viewState.renderMode,
      transformMode: data.viewState.transformMode,
      gridVisible: data.viewState.gridVisible,
      // Reset selection and interaction state
      selectedObject: null,
      hoveredObject: null,
      // Reset history
      history: [],
      historyIndex: -1
    }
  }

  /**
   * Serialize scene to JSON string
   */
  static toJSON(sceneState: Partial<SceneState>): string {
    const serialized = this.serialize(sceneState)
    return JSON.stringify(serialized, null, 2)
  }

  /**
   * Deserialize scene from JSON string with legacy compatibility
   */
  static fromJSON(json: string): Partial<SceneState> {
    try {
      const rawData = JSON.parse(json)
      
      // Check if this is legacy data and migrate if necessary
      if (LegacyCompatibility.isLegacyFormat(rawData)) {
        console.log('Legacy scene format detected, migrating to R3F format')
        const migratedData = LegacyCompatibility.migrateLegacyData(rawData)
        
        // Generate migration report
        const report = LegacyCompatibility.createMigrationReport(rawData, migratedData)
        console.log(report)
        
        return this.deserialize(migratedData)
      }
      
      // Handle current format
      const data = rawData as SerializableSceneState
      return this.deserialize(data)
    } catch (error) {
      throw new Error(`Failed to parse scene JSON: ${error}`)
    }
  }

  /**
   * Save scene to localStorage
   */
  static saveToLocalStorage(sceneState: Partial<SceneState>, key: string = 'r3f-scene'): void {
    try {
      const json = this.toJSON(sceneState)
      localStorage.setItem(key, json)
      console.log(`Scene saved to localStorage with key: ${key}`)
    } catch (error) {
      console.error('Failed to save scene to localStorage:', error)
      throw error
    }
  }

  /**
   * Load scene from localStorage
   */
  static loadFromLocalStorage(key: string = 'r3f-scene'): Partial<SceneState> | null {
    try {
      const json = localStorage.getItem(key)
      if (!json) return null
      
      const sceneState = this.fromJSON(json)
      console.log(`Scene loaded from localStorage with key: ${key}`)
      return sceneState
    } catch (error) {
      console.error('Failed to load scene from localStorage:', error)
      return null
    }
  }

  /**
   * Export scene to downloadable file
   */
  static exportToFile(sceneState: Partial<SceneState>, filename?: string): void {
    const json = this.toJSON(sceneState)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `scene-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    console.log(`Scene exported to file: ${a.download}`)
  }

  /**
   * Import scene from file
   */
  static async importFromFile(file: File): Promise<Partial<SceneState>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const json = e.target?.result as string
          const sceneState = this.fromJSON(json)
          console.log(`Scene imported from file: ${file.name}`)
          resolve(sceneState)
        } catch (error) {
          reject(new Error(`Failed to import scene from file: ${error}`))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsText(file)
    })
  }

  // Private helper methods
  private static serializeObjects(objects: SceneObject[]): SceneObject[] {
    return objects.map(obj => ({
      ...obj,
      // Ensure all required properties are present
      id: obj.id,
      name: obj.name,
      type: obj.type,
      primitives: obj.primitives,
      layerId: obj.layerId || 'objects',
      visible: obj.visible !== false
    }))
  }

  private static deserializeObjects(objects: SceneObject[]): SceneObject[] {
    return objects.map(obj => ({
      ...obj,
      layerId: obj.layerId || 'objects',
      visible: obj.visible !== false
    }))
  }

  private static serializePlacements(placements: ScenePlacement[]): ScenePlacement[] {
    return placements.map(placement => ({
      ...placement,
      position: placement.position || [0, 0, 0],
      rotation: placement.rotation || [0, 0, 0],
      scale: placement.scale || [1, 1, 1],
      visible: placement.visible !== false
    }))
  }

  private static deserializePlacements(placements: ScenePlacement[]): ScenePlacement[] {
    return placements.map(placement => ({
      ...placement,
      position: placement.position || [0, 0, 0],
      rotation: placement.rotation || [0, 0, 0],
      scale: placement.scale || [1, 1, 1],
      visible: placement.visible !== false
    }))
  }

  private static serializeLayers(layers: SceneLayer[]): SceneLayer[] {
    return layers.map(layer => ({
      ...layer,
      visible: layer.visible !== false,
      position: layer.position || 0
    }))
  }

  private static deserializeLayers(layers: SceneLayer[]): SceneLayer[] {
    return layers.map(layer => ({
      ...layer,
      visible: layer.visible !== false,
      position: layer.position || 0
    }))
  }

  private static serializeLighting(lighting: SceneLighting): SceneLighting {
    return {
      ambient: {
        intensity: lighting.ambient?.intensity || 0.4,
        color: lighting.ambient?.color || '#ffffff'
      },
      directional: {
        intensity: lighting.directional?.intensity || 1,
        color: lighting.directional?.color || '#ffffff',
        position: lighting.directional?.position || [10, 10, 5],
        castShadow: lighting.directional?.castShadow !== false
      }
    }
  }

  private static deserializeLighting(lighting: SceneLighting): SceneLighting {
    return {
      ambient: {
        intensity: lighting.ambient?.intensity || 0.4,
        color: lighting.ambient?.color || '#ffffff'
      },
      directional: {
        intensity: lighting.directional?.intensity || 1,
        color: lighting.directional?.color || '#ffffff',
        position: lighting.directional?.position || [10, 10, 5],
        castShadow: lighting.directional?.castShadow !== false
      }
    }
  }

  private static getDefaultLighting(): SceneLighting {
    return {
      ambient: {
        intensity: 0.4,
        color: '#ffffff'
      },
      directional: {
        intensity: 1,
        color: '#ffffff',
        position: [10, 10, 5],
        castShadow: true
      }
    }
  }

  private static validateVersion(version: string): void {
    if (version !== this.VERSION) {
      console.warn(`Scene version mismatch. Expected: ${this.VERSION}, Got: ${version}`)
      // In the future, implement migration logic here
    }
  }

  /**
   * Create a snapshot of the current scene state for history
   */
  static createSnapshot(sceneState: Partial<SceneState>): string {
    // Only serialize essential state for history to save memory
    const snapshot = {
      objects: sceneState.objects || [],
      placements: sceneState.placements || [],
      layers: sceneState.layers || [],
      lighting: sceneState.lighting || this.getDefaultLighting()
    }
    return JSON.stringify(snapshot)
  }

  /**
   * Restore scene state from snapshot
   */
  static restoreSnapshot(snapshot: string): Partial<SceneState> {
    try {
      const data = JSON.parse(snapshot)
      return {
        objects: data.objects || [],
        placements: data.placements || [],
        layers: data.layers || [],
        lighting: data.lighting || this.getDefaultLighting()
      }
    } catch (error) {
      console.error('Failed to restore snapshot:', error)
      return {}
    }
  }
}
