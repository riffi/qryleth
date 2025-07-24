/**
 * Scene AI integration module
 */

import type { ToolProvider } from '@/shared/lib/langchain/types'
import { toolRegistry } from '@/shared/lib/langchain/toolRegistry'
import {
  getSceneObjectsTool,
  getSceneStatsTool,
  findObjectByNameTool,
  addObjectInstanceTool,
  canAddInstanceTool,
  getObjectInstancesTool
} from './tools'

/**
 * Scene tools provider for LangChain
 */
export const sceneToolProvider: ToolProvider = {
  featureName: 'scene',
  getTools: () => [
    getSceneObjectsTool,
    getSceneStatsTool,
    findObjectByNameTool,
    addObjectInstanceTool,
    canAddInstanceTool,
    getObjectInstancesTool
  ]
}

/**
 * Register scene tools with the global tool registry
 */
export function registerSceneTools(): void {
  toolRegistry.registerProvider(sceneToolProvider)
}

/**
 * Unregister scene tools from the global tool registry
 */
export function unregisterSceneTools(): void {
  toolRegistry.unregisterProvider('scene')
}