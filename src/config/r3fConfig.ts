/**
 * Configuration for R3F (React Three Fiber) system
 * 
 * This file contains settings for controlling the migration from legacy Three.js
 * to the new React Three Fiber system.
 */

export const R3F_CONFIG = {
  // Global toggle for R3F system
  // Set to true to use the new React Three Fiber system everywhere
  // Set to false to use the legacy Three.js system (for debugging/fallback)
  ENABLE_R3F: true,

  // Feature flags for specific components
  FEATURES: {
    // Use R3F scene editor instead of legacy
    USE_R3F_SCENE_EDITOR: true,
    
    // Use R3F object manager integration
    USE_R3F_OBJECT_MANAGER: true,
    
    // Use R3F object editor
    USE_R3F_OBJECT_EDITOR: true,
    
    // Enable performance optimizations (instancing, LOD, etc.)
    ENABLE_PERFORMANCE_OPTIMIZATIONS: true,
    
    // Enable legacy data migration
    ENABLE_LEGACY_MIGRATION: true,
    
    // Enable debugging features
    ENABLE_DEBUG_MODE: false
  },

  // Performance settings
  PERFORMANCE: {
    // Minimum instances required for automatic instancing
    MIN_INSTANCES_FOR_OPTIMIZATION: 3,
    
    // Enable frustum culling for large scenes
    ENABLE_FRUSTUM_CULLING: true,
    
    // Enable LOD (Level of Detail) for complex objects
    ENABLE_LOD: true,
    
    // LOD distances [high, medium, low]
    LOD_DISTANCES: [15, 35, 70] as [number, number, number],
    
    // Maximum cull distance
    CULL_DISTANCE: 150
  },

  // Scene settings
  SCENE: {
    // Default scene dimensions
    DEFAULT_WIDTH: 1200,
    DEFAULT_HEIGHT: 800,
    
    // Show object manager sidebar by default
    SHOW_OBJECT_MANAGER: true,
    
    // Enable real-time UI synchronization
    ENABLE_UI_SYNC: true,
    
    // Auto-save interval (ms)
    AUTO_SAVE_INTERVAL: 30000 // 30 seconds
  },

  // Development settings
  DEV: {
    // Log R3F system events to console
    ENABLE_LOGGING: true,
    
    // Show performance metrics
    SHOW_PERFORMANCE_METRICS: false,
    
    // Enable test suite on load
    RUN_TESTS_ON_LOAD: false
  }
} as const

/**
 * Check if R3F system should be used
 */
export const shouldUseR3F = (): boolean => {
  return R3F_CONFIG.ENABLE_R3F && R3F_CONFIG.FEATURES.USE_R3F_SCENE_EDITOR
}

/**
 * Get performance optimization settings
 */
export const getPerformanceConfig = () => {
  return R3F_CONFIG.PERFORMANCE
}

/**
 * Get scene configuration
 */
export const getSceneConfig = () => {
  return R3F_CONFIG.SCENE
}

/**
 * Log R3F system event (only if logging is enabled)
 */
export const logR3FEvent = (event: string, data?: any) => {
  if (R3F_CONFIG.DEV.ENABLE_LOGGING) {
    console.log(`[R3F] ${event}`, data)
  }
}