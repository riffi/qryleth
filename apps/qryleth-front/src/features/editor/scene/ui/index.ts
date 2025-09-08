/**
 * Экспорт UI-компонентов фичи сцены.
 */
export * from './ChatInterface'
export * from './objectManager/AddObjectFromLibraryModal.tsx'
export * from './objectManager/LightingControls.tsx'
export * from './renderer/Scene3D.tsx'
export * from './renderer/SceneContent.tsx'
export * from './SceneEditorR3F.tsx'
export * from './SceneHeaderRight.tsx'
// Legacy SceneLayerModals удалён после перехода на тонкие слои и окна содержимого
export * from './objectManager/SceneObjectManager.tsx'

// Controls
export * from './renderer/controls/CameraControls'
export * from './renderer/controls/FlyControls'
export * from './renderer/controls/WalkControls'
export * from './renderer/controls/ObjectTransformGizmo.tsx'


// Landscape
export * from './renderer/landscape/LandscapeLayer'
export * from './renderer/landscape/LandscapeLayers'
// Legacy water rendering removed: use WaterContentLayers instead

// Lighting
export * from './renderer/lighting/SceneLighting'

// Objects
export * from './renderer/objects/SceneObjectRenderer.tsx'
export * from './renderer/objects/SceneObjects'

// Optimization helpers
export * from './renderer/optimization/OptimizedComponents'

