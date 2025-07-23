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

/**
 * Функция для получения всех доступных инструментов сцены
 * Используется для избежания проблем с circular imports
 */
export function getAllSceneTools() {
  // Импортируем инструменты динамически
  const sceneTools = require('./sceneTools')
  const instanceTools = require('./instanceTools')  
  const objectTools = require('./objectTools')

  return [
    // Информационные инструменты
    sceneTools.getSceneObjectsTool,
    sceneTools.getSceneStatsTool,
    sceneTools.findObjectByNameTool,
    
    // Инструменты управления экземплярами
    instanceTools.addObjectInstanceTool,
    instanceTools.canAddInstanceTool,
    instanceTools.getObjectInstancesTool,
    
    // Инструменты создания объектов
    objectTools.addNewObjectTool
  ]
}