/**
 * Scene AI integration module
 */

import React from 'react'
import type { ToolProvider } from '@/shared/lib/langchain/types'
import { toolRegistry } from '@/shared/lib/langchain/toolRegistry'
import {
  getSceneObjectsTool,
  getSceneStatsTool,
  findObjectByNameTool,
  addObjectInstanceTool,
  canAddInstanceTool,
  getObjectInstancesTool,
  createAddNewObjectTool,
  addNewObjectTool
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
    getObjectInstancesTool,
    addNewObjectTool
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

/**
 * React-хук для автоматической регистрации инструментов сцены
 * Вызывает регистрацию при монтировании и отмену регистрации при размонтировании
 */
export function useSceneToolRegistration(): void {
  // Регистрация выполняется один раз при монтировании компонента
  React.useEffect(() => {
    registerSceneTools()
    // Отписка при размонтировании компонента
    return () => unregisterSceneTools()
  }, [])
}
