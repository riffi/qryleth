# Three.js Architecture Analysis - Phase 1

## Current Three.js Architecture Overview

The application currently uses a complex Three.js implementation centered around the `useThreeJSScene` hook located in `src/hooks/useThreeJSScene.ts`. This hook manages the entire 3D scene lifecycle.

## Core Three.js Entities

### Scene Setup (lines 182-185)
- **Scene**: Basic THREE.Scene with dark background (`0x222`)
- **Scene Management**: Generated objects tracked via `userData.generated = true`

### Camera System (lines 187-195)
- **Type**: THREE.PerspectiveCamera 
- **FOV**: 45 degrees
- **Aspect**: Container aspect ratio
- **Near/Far**: 0.1 to 1000
- **Default Position**: (5, 5, 8)

### Renderer Configuration (lines 197-209)
- **Type**: THREE.WebGLRenderer
- **Features**: Antialias, alpha transparency
- **Shadows**: PCFSoftShadowMap enabled
- **Tone Mapping**: ACESFilmicToneMapping with exposure 1.0
- **Pixel Ratio**: Device pixel ratio

### Post-Processing Pipeline (lines 211-244)
- **EffectComposer**: Main composition pipeline
- **RenderPass**: Base scene rendering
- **OutlinePass (Hover)**: Green outline for hover effects
  - Edge strength: 3, glow: 0.5, thickness: 2
  - Color: #00ff00
- **OutlinePass (Selection)**: Orange outline for selected objects
  - Edge strength: 4, glow: 0.8, thickness: 3
  - Pulse period: 2, Color: #ff6600
- **OutputPass**: Final tone mapping and gamma correction

### Controls System (lines 246-272)

#### OrbitControls (Default)
- Damping enabled (factor 0.05)
- Zoom and pan enabled

#### PointerLockControls (Walk/Fly modes)
- WASD movement controls
- Mouse look navigation
- Walk mode: Height locked to landscape + 1.8 units
- Fly mode: Free 3D movement

### Transform Controls (lines 254-272)
- Integrated TransformControls for object manipulation
- Modes: translate, rotate, scale
- Auto-disables camera controls during transformation
- Updates placement data on object changes

### Lighting System (lines 274-317)

#### Ambient Light
- Color: 0x404040 (dark gray)
- Intensity: 0.6

#### Directional Light  
- Color: 0xffffff (white)
- Intensity: 1.0
- Position: (10, 10, 10)
- Shadow mapping: 2048x2048 resolution
- Shadow camera: 100x100 unit area, near 0.1, far 100
- Shadow bias: -0.001, normal bias: 0.01

### Grid Helper (lines 307-312)
- Size: 100x100 units
- Divisions: 100
- Position: (0, 0.01, 0) - slightly above ground
- Colors: Primary 0x444444, Secondary 0x888888
- Toggleable visibility

## Object Management System

### Primitive Types
Supports 6 basic primitive types:
1. **Box**: width, height, depth parameters
2. **Sphere**: radius parameter 
3. **Cylinder**: radiusTop, radiusBottom, height, radialSegments
4. **Cone**: radius, height, radialSegments
5. **Pyramid**: baseSize, height (4-sided cone)
6. **Plane**: width, height (auto-rotated horizontal)

### Composite Objects
- Objects are THREE.Group containers holding multiple primitive meshes
- Each primitive has relative position/rotation within the group
- Material system supports: color, opacity, emissive properties

### Placement System
- **ScenePlacement** interface: objectIndex, position, rotation, scale
- Multiple instances of same object can exist
- Each instance tracked by `userData.placementIndex`

### Object State Management
- **sceneObjects**: Array of SceneObject definitions
- **placementsRef**: Array of placement transformations
- **objectVisibilityRef**: Map tracking per-object visibility
- **objectsInfo**: Derived state for UI display

## Layer System

### Layer Types
1. **Object Layers**: Container for 3D objects
2. **Landscape Layers**: Terrain surfaces
   - **Plane**: Flat rectangular surface
   - **Perlin**: Height-mapped terrain using Perlin noise

### Layer Management
- Default "objects" layer always exists
- Drag & drop between layers supported
- Per-layer visibility controls
- Landscape layers use PlaneGeometry with optional Perlin height mapping

## Event Handling System

### Mouse Interaction (lines 354-396)
- Raycasting for object selection
- Click-to-select objects or clear selection
- Mode-aware clicking (walk/fly modes lock pointer)

### Keyboard Controls
- **Escape**: Clear selection
- **WASD**: Movement in walk/fly modes
- Focus management for proper event capture

### Object Manipulation
- Transform controls for selected objects
- Keyboard shortcuts for movement/scaling
- Real-time transform updates

## State Management Architecture

### Refs for Three.js Objects
- sceneRef, rendererRef, cameraRef, controlsRef
- lightsRef, transformControlsRef, composerRef
- All major Three.js objects stored in refs for direct access

### React State
- UI-driven state: viewMode, renderMode, transformMode
- Selection state: selectedObject
- Scene metadata: currentScene, layers
- Derived state: objectsInfo

### History System (lines 86-89, 1403-1457)
- Undo/redo functionality with 50-state limit
- JSON serialization of scene state
- Restore prevention during history operations

## Integration Points

### UI Components
- **ObjectManager**: Displays object hierarchy and controls
- **ObjectEditor**: Edits primitive properties
- **LightingControls**: Adjusts scene lighting
- **SceneHeader**: Scene save/load operations

### Database Integration
- Dexie-based local storage for scenes and objects
- Scene serialization includes: objects, placements, layers, lighting
- Library system for reusable objects and scenes

## Performance Considerations

### Optimization Strategies
- Object visibility culling per layer
- Geometry/material disposal on cleanup
- Efficient raycasting with filtered object sets
- Minimal re-renders through ref-based Three.js management

### Resource Management
- Proper disposal of geometries and materials
- Animation frame cleanup
- Event listener cleanup
- WebGL context management

## Key Migration Challenges

1. **Complex State Management**: Large useThreeJSScene hook with many responsibilities
2. **Imperative Three.js Code**: Direct object manipulation vs R3F declarative approach
3. **Post-Processing Pipeline**: Custom EffectComposer setup
4. **Transform Controls**: Complex interaction between controls and React state
5. **Event Handling**: Direct DOM event management vs R3F event system
6. **Landscape System**: Custom Perlin noise terrain generation
7. **History/Undo System**: State serialization and restoration
8. **Performance**: Maintaining performance with React reconciliation

## Next Steps for R3F Migration

The analysis reveals a sophisticated Three.js application that will require careful planning to migrate to R3F while maintaining all current functionality. The main areas requiring attention are:

1. Breaking down the monolithic useThreeJSScene hook
2. Converting imperative object management to declarative components  
3. Migrating the post-processing pipeline to @react-three/postprocessing
4. Adapting the transform controls and event handling
5. Maintaining the complex state management and history system