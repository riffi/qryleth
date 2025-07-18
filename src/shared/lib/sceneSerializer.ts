import type {
  SceneObject,
  ScenePlacement,
  SceneLayer,
  SceneLighting,
  SceneState
} from '../types/scene'


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
      transform: {
        position: placement.transform?.position || [0, 0, 0],
        rotation: placement.transform?.rotation || [0, 0, 0],
        scale: placement.transform?.scale || [1, 1, 1]
      },
      visible: placement.visible !== false
    }))
  }

  private static deserializePlacements(placements: ScenePlacement[]): ScenePlacement[] {
    return placements.map(placement => ({
      ...placement,
      transform: {
        position: placement.transform?.position || [0, 0, 0],
        rotation: placement.transform?.rotation || [0, 0, 0],
        scale: placement.transform?.scale || [1, 1, 1]
      },
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
