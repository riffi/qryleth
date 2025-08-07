/**
 * R3F технические типы
 * 
 * Технические типы для работы с React Three Fiber:
 * - Canvas configuration
 * - Renderer settings  
 * - Performance optimization types
 * - Three.js integration helpers
 */

import type { Camera, WebGLRenderer } from 'three'

// Canvas configuration types
export interface R3FCanvasConfig {
  antialias?: boolean
  alpha?: boolean
  preserveDrawingBuffer?: boolean
  powerPreference?: 'default' | 'high-performance' | 'low-power'
}

// Renderer performance settings
export interface R3FPerformanceConfig {
  min?: number
  max?: number
  debounce?: number
  regress?: boolean
}

// Camera control types
export interface R3FCameraControls {
  makeDefault?: boolean
  enablePan?: boolean
  enableZoom?: boolean
  enableRotate?: boolean
  minDistance?: number
  maxDistance?: number
}

// Future R3F types can be added here as needed
// export interface R3FLightingConfig { ... }
// export interface R3FPostProcessingConfig { ... }