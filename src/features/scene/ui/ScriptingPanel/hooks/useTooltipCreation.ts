import {  useMemo } from 'react'
import { hoverTooltip } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { analyzeVariableTypes, getMethodInfo } from '../utils/codeAnalysis'
import { API_RETURN_TYPES } from '../constants/apiReturnTypes'

export const useTooltipCreation = () => {
  const createHoverTooltipExtension = useMemo(() => {

    return hoverTooltip((view, pos, side) => {

      try {
        const { state } = view
        const tree = syntaxTree(state)
        const node = tree.resolveInner(pos, side)

        // Получаем слово под курсором
        const word = state.doc.sliceString(node.from, node.to)

        // Получаем контекст
        const beforeNode = state.doc.sliceString(Math.max(0, node.from - 30), node.from)
        const lineText = state.doc.lineAt(pos).text


        // Простая проверка для sceneApi методов
        if (beforeNode.includes('sceneApi.') && word && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(word)) {
          const methodInfo = getMethodInfo(word)

          if (methodInfo) {
            return {
              pos: node.from,
              end: node.to,
              above: true,
              create: () => {
                const div = document.createElement('div')
                div.style.cssText = `
                  padding: 8px 12px;
                  background-color: #1e1e1e;
                  color: #d4d4d4;
                  border: 1px solid #444;
                  border-radius: 6px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                  max-width: 400px;
                  font-family: 'Fira Code', monospace;
                  font-size: 12px;
                  line-height: 1.4;
                  white-space: pre-wrap;
                  z-index: 10000;
                `
                div.textContent = methodInfo
                return { dom: div }
              }
            }
          }
        }

        // Проверка переменных с типами
        const currentScript = state.doc.toString()
        const variableTypes = analyzeVariableTypes(currentScript)

        if (word && variableTypes[word]) {
          const apiMethodName = variableTypes[word]
          const typeSchema = API_RETURN_TYPES[apiMethodName]
          if (typeSchema) {
            const typeInfo = `${word}: результат ${apiMethodName}()\n\nДоступные свойства:\n${Object.entries(typeSchema.properties).map(([prop, info]) => `• ${prop}: ${info.type} - ${info.description}`).join('\n')}`

            return {
              pos: node.from,
              end: node.to,
              above: true,
              create: () => {
                const div = document.createElement('div')
                div.style.cssText = `
                  padding: 8px 12px;
                  background-color: #1e1e1e;
                  color: #d4d4d4;
                  border: 1px solid #444;
                  border-radius: 6px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                  max-width: 400px;
                  font-family: 'Fira Code', monospace;
                  font-size: 12px;
                  line-height: 1.4;
                  white-space: pre-wrap;
                  z-index: 10000;
                `
                div.textContent = typeInfo
                return { dom: div }
              }
            }
          }
        }

        return null
      } catch (error) {
        console.error('Error in hover tooltip:', error)
        return null
      }
    })
  }, [])

  return { createHoverTooltipExtension }
}
