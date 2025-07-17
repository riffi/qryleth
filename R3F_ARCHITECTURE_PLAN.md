# React Three Fiber Migration Architecture Plan

## Overview

This document outlines the planned architecture for migrating from the current Three.js implementation to React Three Fiber (R3F). The migration will maintain all existing functionality while providing better React integration and developer experience.

## R3F Component Structure

### 1. Root Canvas Component
```typescript
// src/components/3d/Scene3D.tsx
<Canvas
  camera={{ position: [5, 5, 8], fov: 45, near: 0.1, far: 1000 }}
  shadows="soft"
  gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
>
  <SceneContent />
  <PostProcessing />
</Canvas>
```

### 2. Scene Content Component
```typescript
// src/components/3d/SceneContent.tsx
function SceneContent() {
  return (
    <>
      <SceneLighting />
      <CameraControls />
      <Environment />
      <SceneObjects />
      <LandscapeLayers />
      <TransformGizmo />
      <GridHelper />
    </>
  )
}
```

### 3. Lighting Components
```typescript
// src/components/3d/lighting/SceneLighting.tsx
function SceneLighting() {
  const lighting = useSceneStore(state => state.lighting)
  return (
    <>
      <ambientLight color={lighting.ambientColor} intensity={lighting.ambientIntensity} />
      <directionalLight
        position={[10, 10, 10]}
        color={lighting.directionalColor}
        intensity={lighting.directionalIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.001}
        shadow-normalBias={0.01}
      />
    </>
  )
}
```

### 4. Camera Controls Component
```typescript
// src/components/3d/controls/CameraControls.tsx
function CameraControls() {
  const viewMode = useSceneStore(state => state.viewMode)
  
  switch (viewMode) {
    case 'orbit':
      return <OrbitControls enableDamping dampingFactor={0.05} />
    case 'walk':
      return <WalkControls />
    case 'fly':
      return <FlyControls />
    default:
      return <OrbitControls />
  }
}
```

### 5. Primitive Components
```typescript
// src/components/3d/primitives/
- Box3D.tsx
- Sphere3D.tsx  
- Cylinder3D.tsx
- Cone3D.tsx
- Pyramid3D.tsx
- Plane3D.tsx
```

### 6. Composite Object Component
```typescript
// src/components/3d/objects/CompositeObject.tsx
function CompositeObject({ 
  sceneObject, 
  placement, 
  isSelected, 
  isHovered 
}: CompositeObjectProps) {
  return (
    <group
      position={placement.position}
      rotation={placement.rotation}
      scale={placement.scale}
      userData={{ objectIndex: placement.objectIndex }}
    >
      {sceneObject.primitives.map((primitive, index) => (
        <PrimitiveRenderer 
          key={index} 
          primitive={primitive}
          renderMode={renderMode}
        />
      ))}
    </group>
  )
}
```

### 7. Scene Objects Manager
```typescript
// src/components/3d/objects/SceneObjects.tsx
function SceneObjects() {
  const { objects, placements } = useSceneStore()
  const selectedObject = useSceneStore(state => state.selectedObject)
  
  return (
    <>
      {placements.map((placement, index) => {
        const sceneObject = objects[placement.objectIndex]
        if (!sceneObject) return null
        
        return (
          <CompositeObject
            key={`${placement.objectIndex}-${index}`}
            sceneObject={sceneObject}
            placement={placement}
            isSelected={isSelected(placement)}
            onClick={() => selectObject(placement.objectIndex, index)}
          />
        )
      })}
    </>
  )
}
```

### 8. Landscape Layer Components
```typescript
// src/components/3d/landscape/LandscapeLayers.tsx
function LandscapeLayers() {
  const layers = useSceneStore(state => state.layers)
  
  return (
    <>
      {layers
        .filter(layer => layer.type === 'landscape')
        .map(layer => (
          <LandscapeLayer key={layer.id} layer={layer} />
        ))}
    </>
  )
}

// src/components/3d/landscape/LandscapeLayer.tsx
function LandscapeLayer({ layer }: { layer: SceneLayer }) {
  const geometry = useMemo(() => {
    if (layer.shape === 'perlin') {
      return createPerlinGeometry(layer.width!, layer.height!, layer.noiseData)
    }
    return new THREE.PlaneGeometry(layer.width, layer.height)
  }, [layer])
  
  return (
    <mesh 
      geometry={geometry}
      visible={layer.visible}
      rotation={layer.shape === 'perlin' ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <meshLambertMaterial 
        color={layer.shape === 'perlin' ? 0x4a7c59 : 0x8B4513}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
```

### 9. Transform Controls
```typescript
// src/components/3d/controls/TransformGizmo.tsx
function TransformGizmo() {
  const { scene } = useThree()
  const selectedObject = useSceneStore(state => state.selectedObject)
  const transformMode = useSceneStore(state => state.transformMode)
  
  const targetObject = useMemo(() => {
    if (!selectedObject) return undefined
    return scene.children.find(child => 
      child.userData.objectIndex === selectedObject.objectIndex &&
      child.userData.placementIndex === selectedObject.instanceId
    )
  }, [selectedObject, scene])
  
  return (
    <TransformControls
      object={targetObject}
      mode={transformMode}
      onObjectChange={handleTransformChange}
    />
  )
}
```

### 10. Post-Processing
```typescript
// src/components/3d/effects/PostProcessing.tsx
import { EffectComposer, Outline, RenderPass } from '@react-three/postprocessing'

function PostProcessing() {
  const selectedObjects = useSelectedObjects()
  const hoveredObjects = useHoveredObjects()
  
  return (
    <EffectComposer>
      <RenderPass />
      <Outline 
        selection={hoveredObjects}
        edgeStrength={3}
        edgeGlow={0.5}
        edgeThickness={2}
        visibleEdgeColor={0x00ff00}
        hiddenEdgeColor={0x00ff00}
      />
      <Outline
        selection={selectedObjects}
        edgeStrength={4}
        edgeGlow={0.8}
        edgeThickness={3}
        visibleEdgeColor={0xff6600}
        hiddenEdgeColor={0x423a34}
        pulse={2}
      />
    </EffectComposer>
  )
}
```

## State Management with Zustand

### Scene Store
```typescript
// src/stores/sceneStore.ts
interface SceneState {
  // Scene data
  objects: SceneObject[]
  placements: ScenePlacement[]
  layers: SceneLayer[]
  lighting: LightingSettings
  
  // UI state
  viewMode: ViewMode
  renderMode: RenderMode
  transformMode: TransformMode
  selectedObject: SelectedObject | null
  hoveredObject: HoveredObject | null
  gridVisible: boolean
  
  // Scene metadata
  currentScene: CurrentScene
  
  // Actions
  setObjects: (objects: SceneObject[]) => void
  setPlacements: (placements: ScenePlacement[]) => void
  updatePlacement: (index: number, placement: Partial<ScenePlacement>) => void
  setLighting: (lighting: LightingSettings) => void
  selectObject: (objectIndex: number, instanceId?: string) => void
  clearSelection: () => void
  setViewMode: (mode: ViewMode) => void
  switchRenderMode: (mode: RenderMode) => void
  
  // Layer management
  createLayer: (layer: SceneLayer) => void
  updateLayer: (layerId: string, updates: Partial<SceneLayer>) => void
  deleteLayer: (layerId: string) => void
  toggleLayerVisibility: (layerId: string) => void
  
  // History
  history: SceneState[]
  historyIndex: number
  saveToHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}
```

### Camera Store
```typescript
// src/stores/cameraStore.ts
interface CameraState {
  position: Vector3
  target: Vector3
  viewMode: ViewMode
  
  setPosition: (position: Vector3) => void
  setTarget: (target: Vector3) => void
  setViewMode: (mode: ViewMode) => void
}
```

## Hook Migration Strategy

### Breaking Down useThreeJSScene

1. **useSceneRenderer** - Canvas and basic rendering setup
2. **useSceneObjects** - Object creation and management
3. **useSceneLighting** - Lighting controls
4. **useSceneControls** - Camera and transform controls
5. **useSceneSelection** - Object selection and highlighting
6. **useSceneHistory** - Undo/redo functionality
7. **useSceneLayers** - Layer management
8. **useSceneExport** - Save/load functionality

### Custom Hooks for R3F

```typescript
// src/hooks/r3f/useSceneEvents.ts
function useSceneEvents() {
  const selectObject = useSceneStore(state => state.selectObject)
  const clearSelection = useSceneStore(state => state.clearSelection)
  
  const handleClick = useCallback((event) => {
    if (event.object.userData.generated) {
      selectObject(event.object.userData.objectIndex)
    } else {
      clearSelection()
    }
  }, [])
  
  return { handleClick }
}

// src/hooks/r3f/useObjectSelection.ts
function useObjectSelection() {
  const selectedObject = useSceneStore(state => state.selectedObject)
  const hoveredObject = useSceneStore(state => state.hoveredObject)
  
  const selectedObjects = useMemo(() => {
    // Return array of Three.js objects for outline effect
  }, [selectedObject])
  
  const hoveredObjects = useMemo(() => {
    // Return array of Three.js objects for hover effect  
  }, [hoveredObject])
  
  return { selectedObjects, hoveredObjects }
}
```

## Component Integration Strategy

### Existing UI Components
All existing UI components will continue to work with minimal changes:

1. **ObjectManager** - Connect to Zustand store instead of prop drilling
2. **ObjectEditor** - Use store actions for object updates
3. **LightingControls** - Connect to lighting state in store
4. **SceneHeader** - Use store for scene operations

### Updated Props Interface
```typescript
// Before (prop drilling)
interface ObjectManagerProps {
  objects: ObjectInfo[]
  onToggleVisibility?: (objectIndex: number) => void
  // ... 20+ props
}

// After (store integration)
interface ObjectManagerProps {
  // Minimal props, most state from store
  className?: string
}
```

## Performance Optimization Strategy

### Instance Management
```typescript
// src/components/3d/objects/InstancedObjects.tsx
function InstancedObjects({ objectType, placements }: InstancedObjectsProps) {
  const positions = useMemo(() => 
    placements.map(p => p.position).flat()
  , [placements])
  
  return (
    <instancedMesh args={[geometry, material, placements.length]}>
      <instancedBufferAttribute 
        attach="geometry-attributes-instancePosition"
        array={positions}
        count={placements.length}
        itemSize={3}
      />
    </instancedMesh>
  )
}
```

### Selective Rendering
- Use React.memo for expensive components
- Implement frustum culling for large scenes
- Layer-based LOD (Level of Detail) system

## Migration Phases

### Phase 1: Foundation Setup
1. Install R3F packages
2. Create basic Canvas structure
3. Migrate simple components (lighting, grid)

### Phase 2: Object System
1. Create primitive components
2. Implement composite object rendering
3. Migrate object management

### Phase 3: Interaction
1. Migrate selection system
2. Implement transform controls
3. Add event handling

### Phase 4: Advanced Features
1. Post-processing effects
2. Landscape system
3. Performance optimizations

### Phase 5: Integration
1. Update UI components
2. State management integration
3. Testing and refinement

## Testing Strategy

### Unit Tests
- Component rendering tests
- Store action tests
- Hook behavior tests

### Integration Tests
- Scene loading/saving
- Object manipulation
- Camera controls

### Performance Tests
- Rendering performance comparison
- Memory usage analysis
- Frame rate benchmarks

## Rollback Plan

The migration will be implemented in a separate branch with feature flags to allow gradual rollout:

1. Feature flag: `USE_R3F_RENDERER`
2. Side-by-side implementation
3. Gradual migration of features
4. Performance comparison tools
5. Easy rollback to Three.js implementation

This architecture maintains all existing functionality while providing better React integration, improved performance, and enhanced developer experience.