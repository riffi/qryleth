/**
 * Компонент для отображения результатов выполнения AI tools в ObjectEditor
 */

import React from 'react'
import type { ToolCall } from '@/shared/entities/chat'

interface ObjectToolCallbacksProps {
  toolCalls?: ToolCall[]
  className?: string
}

export const ObjectToolCallbacks: React.FC<ObjectToolCallbacksProps> = ({ 
  toolCalls = [], 
  className = '' 
}) => {
  if (toolCalls.length === 0) return null

  return (
    <div className={`object-tool-callbacks ${className}`}>
      {toolCalls.map((toolCall) => (
        <div key={toolCall.id} className="tool-call-result">
          <div className="tool-call-header">
            <span className="tool-name">🔧 {getToolDisplayName(toolCall.name)}</span>
            <span className="tool-status">
              {toolCall.result ? '✅' : '⏳'}
            </span>
          </div>
          
          {toolCall.result && (
            <div className="tool-call-result-content">
              {formatToolResult(toolCall.name, toolCall.result)}
            </div>
          )}
          
          {toolCall.arguments && (
            <details className="tool-call-args">
              <summary>Параметры</summary>
              <pre>{JSON.stringify(JSON.parse(toolCall.arguments), null, 2)}</pre>
            </details>
          )}
        </div>
      ))}
    </div>
  )
}

function getToolDisplayName(toolName: string): string {
  const displayNames: Record<string, string> = {
    addPrimitives: 'Добавление примитивов',
    modifyPrimitive: 'Изменение примитива',
    removePrimitive: 'Удаление примитива',
    duplicatePrimitive: 'Дублирование примитива',
    createMaterial: 'Создание материала',
    updateMaterial: 'Обновление материала',
    assignMaterial: 'Назначение материала',
    removeMaterial: 'Удаление материала',
    duplicateMaterial: 'Дублирование материала',
    analyzeObject: 'Анализ объекта',
    optimizeObject: 'Оптимизация объекта',
    validateObject: 'Валидация объекта',
    suggestImprovements: 'Предложения улучшений',
    calculateStats: 'Подсчет статистики',
    generateVariations: 'Генерация вариаций'
  }
  
  return displayNames[toolName] || toolName
}

function formatToolResult(toolName: string, result: any): React.ReactNode {
  if (typeof result === 'string') {
    return <div className="result-text">{result}</div>
  }
  
  if (typeof result === 'object') {
    // Специальное форматирование для разных типов результатов
    switch (toolName) {
      case 'analyzeObject':
      case 'validateObject':
      case 'calculateStats':
        return (
          <div className="result-formatted">
            {result.summary && <div className="result-summary">{result.summary}</div>}
            {result.details && (
              <div className="result-details">
                {Array.isArray(result.details) 
                  ? result.details.map((detail: string, i: number) => (
                      <div key={i} className="detail-item">• {detail}</div>
                    ))
                  : <div>{result.details}</div>
                }
              </div>
            )}
          </div>
        )
      
      default:
        return <pre className="result-json">{JSON.stringify(result, null, 2)}</pre>
    }
  }
  
  return <div className="result-other">{String(result)}</div>
}