import { useCallback } from 'react'
import { CompletionContext } from '@codemirror/autocomplete'
import { SceneAPI } from '../../../lib/sceneAPI'
import { analyzeVariableTypes, extractVariablesFromScript } from '../utils/codeAnalysis'
import { API_RETURN_TYPES } from '../constants/apiReturnTypes'
import { getSceneApiCompletions, getConsoleCompletions, getBaseCompletions, getKeywords } from '../constants/completionData'
import { createStyledTooltip } from '../utils/tooltipUtils'
/**
 * Хук автодополнения для редактора скриптов.
 * Поддержка только JavaScript: ключевые слова JS, переменные, методы SceneAPI и их свойства.
 */
export const useCodeCompletion = () => {
  const getApiVariables = useCallback(() => {
    try {
      const overview = SceneAPI.getSceneOverview()
      const apiVars = []
      
      if (overview.objects.length > 0) {
        apiVars.push({
          label: 'overview',
          type: 'variable',
          info: 'Обзор сцены с объектами и экземплярами'
        })
      }
      
      overview.objects.forEach((obj, index) => {
        if (index < 10) {
          apiVars.push({
            label: `object_${obj.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
            type: 'variable',
            info: `Объект "${obj.name}" (UUID: ${obj.uuid})`
          })
        }
      })
      
      return apiVars
    } catch {
      return []
    }
  }, [])

  const enhancedCompletions = useCallback((context: CompletionContext) => {
    const word = context.matchBefore(/\w*/)
    if (!word) return null
    if (word.from === word.to && !context.explicit) return null

    const currentScript = context.state.doc.toString()
    const beforeWord = context.state.doc.sliceString(Math.max(0, word.from - 20), word.from)
    
    const isAfterSceneApi = beforeWord.endsWith('sceneApi.')
    const isAfterConsole = beforeWord.endsWith('console.')
    const isAfterDot = beforeWord.endsWith('.')
    
    const variableTypes = analyzeVariableTypes(currentScript)
    
    const variableAccess = beforeWord.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\.$/)
    const isAfterTypedVariable = variableAccess && variableTypes[variableAccess[1]]
    
    const nestedAccess = beforeWord.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z_$][a-zA-Z0-9_$]*)\.$/)
    const isAfterNestedProperty = nestedAccess && variableTypes[nestedAccess[1]]

    let completions = []

    if (isAfterNestedProperty) {
      const variableName = nestedAccess[1]
      const propertyName = nestedAccess[2]
      const apiMethodName = variableTypes[variableName]
      const typeSchema = API_RETURN_TYPES[apiMethodName]
      
      if (typeSchema && typeSchema.properties[propertyName]?.properties) {
        completions = Object.entries(typeSchema.properties[propertyName].properties!).map(([propName, propInfo]) => ({
          label: propName,
          type: 'property',
          info: createStyledTooltip(`${propName}: ${propInfo.type}\n${propInfo.description}`)
        }))
      }
    } else if (isAfterTypedVariable) {
      const variableName = variableAccess[1]
      const apiMethodName = variableTypes[variableName]
      const typeSchema = API_RETURN_TYPES[apiMethodName]
      
      if (typeSchema) {
        completions = Object.entries(typeSchema.properties).map(([propName, propInfo]) => ({
          label: propName,
          type: propInfo.type.includes('function') ? 'function' : 
                propInfo.type.includes('[]') ? 'variable' : 
                propInfo.type === 'object' ? 'variable' : 'property',
          info: createStyledTooltip(`${propName}: ${propInfo.type}\n${propInfo.description}`)
        }))
      }
    } else if (isAfterSceneApi) {
      completions = getSceneApiCompletions()
    } else if (isAfterConsole) {
      completions = getConsoleCompletions()
    } else if (!isAfterDot) {
      completions = [
        ...getBaseCompletions(),
        ...getKeywords()
      ]
      
      const scriptVariables = extractVariablesFromScript(currentScript)
      scriptVariables.forEach(varName => {
        if (!completions.some(c => c.label === varName)) {
          const inferredType = variableTypes[varName]
          const typeInfo = inferredType ? ` (тип: результат ${inferredType})` : ''
          
          completions.push({
            label: varName,
            type: 'variable',
            info: `Переменная из скрипта: ${varName}${typeInfo}`
          })
        }
      })
      
      const apiVariables = getApiVariables()
      completions.push(...apiVariables)
    }

    return {
      from: word.from,
      options: completions.filter(item =>
        item.label.toLowerCase().includes(word.text.toLowerCase())
      )
    }
  }, [getApiVariables])

  return { enhancedCompletions }
}
