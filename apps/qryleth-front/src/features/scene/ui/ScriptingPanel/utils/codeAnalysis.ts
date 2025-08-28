import { API_RETURN_TYPES } from '../constants/apiReturnTypes'
import { getMethodDoc } from '../constants/methodDocs'

/**
 * Проанализировать текст скрипта и вывести карту типов переменных,
 * присвоенных результатам вызовов sceneApi.*. Это позволяет автокомплиту
 * подсказывать вложенные свойства результата конкретного метода API.
 * Возвращает объект вида { varName: apiMethodName }.
 */
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

/**
 * Извлечь имена переменных из пользовательского скрипта для показа их
 * в общем списке автокомплита. Метод использует набор регулярных выражений
 * для типичных конструкций объявления/использования переменных.
 */
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

// analyzeCurrentContext удалён: hover‑подсказки и автокомплит используют единый
// источник документации и контекст, отдельная панель подсказок не используется.

/**
 * Вернуть текстовую справку по методу SceneAPI по его имени. Справка
 * содержит сигнатуру и описание основных параметров/возвращаемых данных.
 */
export const getMethodInfo = (methodName: string): string | null => {
  return getMethodDoc(methodName)
}
