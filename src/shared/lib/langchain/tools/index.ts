/**
 * Экспорты всех LangChain инструментов
 */

// Scene information tools
export {
  getSceneObjectsTool,
  getSceneStatsTool,
  findObjectByNameTool
} from './sceneTools'

// Object instance management tools
export {
  addObjectInstanceTool,
  canAddInstanceTool,
  getObjectInstancesTool
} from './instanceTools'

// Object creation tools
export {
  addNewObjectTool
} from './objectTools'

// Список всех доступных инструментов для регистрации
export const allSceneTools = [
  // Информационные инструменты
  getSceneObjectsTool,
  getSceneStatsTool,
  findObjectByNameTool,
  
  // Инструменты управления экземплярами
  addObjectInstanceTool,
  canAddInstanceTool,
  getObjectInstancesTool,
  
  // Инструменты создания объектов
  addNewObjectTool
]