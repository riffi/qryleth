import { API_RETURN_TYPES } from '../constants/apiReturnTypes'

export const analyzeVariableTypes = (scriptText: string): Record<string, string> => {
  const variableTypes: Record<string, string> = {}
  
  const patterns = [
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*sceneApi\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*await\s+sceneApi\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g
  ]
  
  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(scriptText)) !== null) {
      const varName = match[1]
      const methodName = match[2]
      
      if (API_RETURN_TYPES[methodName]) {
        variableTypes[varName] = methodName
      }
    }
  })
  
  return variableTypes
}

export const extractVariablesFromScript = (scriptText: string): string[] => {
  const variables = new Set<string>()
  
  const patterns = [
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
    /for\s*\(\s*(?:const|let|var)?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*/g,
    /\.forEach\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /\.map\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /\.filter\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /catch\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g
  ]
  
  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(scriptText)) !== null) {
      const varName = match[1]
      if (varName && !['true', 'false', 'null', 'undefined', 'this'].includes(varName)) {
        variables.add(varName)
      }
    }
  })
  
  return Array.from(variables)
}

export const analyzeCurrentContext = (text: string, cursorPos: number): string | null => {
  const beforeCursor = text.substring(0, cursorPos)
  
  const sceneApiPattern = /sceneApi\.(\w+)\s*\(/g
  let match
  let lastMatch = null
  
  while ((match = sceneApiPattern.exec(beforeCursor)) !== null) {
    lastMatch = match
  }
  
  if (lastMatch) {
    const methodName = lastMatch[1]
    const methodStartPos = lastMatch.index + lastMatch[0].length - 1
    
    const afterMethodStart = text.substring(methodStartPos)
    let parenCount = 0
    let insideMethod = false
    
    for (let i = 0; i < afterMethodStart.length; i++) {
      const char = afterMethodStart[i]
      if (char === '(') {
        parenCount++
        if (parenCount === 1) insideMethod = true
      } else if (char === ')') {
        parenCount--
        if (parenCount === 0) {
          insideMethod = cursorPos <= methodStartPos + i;
          break
        }
      }
    }
    
    if (insideMethod) {
      return getMethodInfo(methodName)
    }
  }
  
  return null
}

export const getMethodInfo = (methodName: string): string | null => {
  const methodInfoMap: Record<string, string> = {
    'getSceneOverview': `getSceneOverview(): SceneOverview
Возвращает: {
  totalObjects: number,
  totalInstances: number,
  objects: SceneObjectInfo[],
  instances: SceneInstanceInfo[],
  sceneName: string,
  layers: Array<{id, name, visible, objectCount}>
}`,
    'getSceneObjects': `getSceneObjects(): SceneObjectInfo[]
Возвращает массив объектов сцены`,
    'getSceneInstances': `getSceneInstances(): SceneInstanceInfo[]
Возвращает массив экземпляров объектов`,
    'findObjectByUuid': `findObjectByUuid(uuid: string): SceneObject | null
Параметры:
  uuid: string - UUID объекта для поиска`,
    'findObjectByName': `findObjectByName(name: string): SceneObject | null
Параметры:
  name: string - Имя объекта (частичное совпадение)`,
    'addObjectInstance': `addObjectInstance(objectUuid, position?, rotation?, scale?, visible?): AddInstanceResult
Параметры:
  objectUuid: string - UUID существующего объекта
  position?: Vector3 = [0, 0, 0] - Позиция [x, y, z]
  rotation?: Vector3 = [0, 0, 0] - Поворот [x, y, z] в радианах
  scale?: Vector3 = [1, 1, 1] - Масштаб [x, y, z]
  visible?: boolean = true - Видимость экземпляра`,
    'addSingleObjectInstance': `addSingleObjectInstance(objectUuid, params): AddInstancesResult
Параметры:
  objectUuid: string - UUID объекта
  params: InstanceCreationParams - Параметры создания экземпляра`,
    'addObjectInstances': `addObjectInstances(objectUuid, instances): AddInstancesResult
Параметры:
  objectUuid: string - UUID объекта
  instances: InstanceCreationParams[] - Массив параметров`,
    'addRandomObjectInstances': `addRandomObjectInstances(objectUuid, count, options?): AddInstancesResult
Параметры:
  objectUuid: string - UUID объекта
  count: number - Количество экземпляров
  options?: RandomInstanceOptions - Опции размещения`,
    'getAvailableLayers': `getAvailableLayers(): Array<LayerInfo>
Возвращает массив доступных слоев`,
    'canAddInstance': `canAddInstance(objectUuid: string): boolean
Параметры:
  objectUuid: string - UUID объекта для проверки`,
    'getSceneStats': `getSceneStats(): SceneStats
Возвращает статистику сцены`,
    'addObjectWithTransform': `addObjectWithTransform(objectData: GFXObjectWithTransform): AddObjectWithTransformResult
Параметры:
  objectData: GFXObjectWithTransform - Данные объекта с трансформацией`,
    'searchObjectsInLibrary': `searchObjectsInLibrary(query: string): Promise<ObjectRecord[]>
Параметры:
  query: string - Строка поиска`,
    'addObjectFromLibrary': `addObjectFromLibrary(objectUuid, layerId, transform?): Promise<AddObjectResult>
Параметры:
  objectUuid: string - UUID объекта в библиотеке
  layerId: string - ID слоя для размещения
  transform?: Transform - Опциональная трансформация`,
    'adjustInstancesForPerlinTerrain': `adjustInstancesForPerlinTerrain(perlinLayerId: string): TerrainAdjustResult
Параметры:
  perlinLayerId: string - ID слоя с Perlin ландшафтом`
  }
  
  return methodInfoMap[methodName] || null
}