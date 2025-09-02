/**
 * Экспорт UI-компонентов фичи сцены.
 */
// Перенаправление экспортов UI сцены в новое расположение editor/scene/ui
export * from '@/features/editor/scene/ui/ChatInterface'
export * from '@/features/editor/scene/ui/objectManager/AddObjectFromLibraryModal.tsx'
export * from '@/features/editor/scene/ui/objectManager/LightingControls.tsx'
export * from '@/features/editor/scene/ui/renderer/Scene3D.tsx'
export * from '@/features/editor/scene/ui/renderer/SceneContent.tsx'
export * from '@/features/editor/scene/ui/SceneEditorR3F.tsx'
export * from '@/features/editor/scene/ui/objectManager/SceneHeader.tsx'
export * from '@/features/editor/scene/ui/objectManager/SceneLayerItem.tsx'
export * from '@/features/editor/scene/ui/objectManager/SceneLayerModals.tsx'
export * from '@/features/editor/scene/ui/objectManager/SceneObjectItem.tsx'
export * from '@/features/editor/scene/ui/objectManager/SceneObjectManager.tsx'
export * from '@/features/editor/scene/ui/objectManager/SceneObjectManagerContext.tsx'

// Controls
export * from '@/features/editor/scene/ui/renderer/controls/CameraControls'
export * from '@/features/editor/scene/ui/renderer/controls/FlyControls'
export * from '@/features/editor/scene/ui/renderer/controls/WalkControls'
export * from '@/features/editor/scene/ui/renderer/controls/ObjectTransformGizmo.tsx'


// Landscape
export * from '@/features/editor/scene/ui/renderer/landscape/LandscapeLayer'
export * from '@/features/editor/scene/ui/renderer/landscape/LandscapeLayers'
export * from '@/features/editor/scene/ui/renderer/landscape/WaterLayer'
export * from '@/features/editor/scene/ui/renderer/landscape/WaterLayers'

// Lighting
export * from '@/features/editor/scene/ui/renderer/lighting/SceneLighting'

// Objects
export * from '@/features/editor/scene/ui/renderer/objects/SceneObjectRenderer.tsx'
export * from '@/features/editor/scene/ui/renderer/objects/SceneObjects'

// Optimization helpers
export * from '@/features/editor/scene/ui/renderer/optimization/OptimizedComponents'

