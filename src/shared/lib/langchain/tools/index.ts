/**
 * Экспорты всех LangChain инструментов
 */

// Импортируем модули с инструментами. Используем явные импорты,
// чтобы избежать использования `require` и сохранить поддержку ESM.
import * as sceneTools from './sceneTools'
import * as instanceTools from './instanceTools'
import * as objectTools from './objectTools'

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
 * Функция для получения всех доступных инструментов сцены.
 * Благодаря статическим импортам исключаются проблемы с `require`
 * и поддерживается работа в модуле ES.
 */
export function getAllSceneTools() {
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
