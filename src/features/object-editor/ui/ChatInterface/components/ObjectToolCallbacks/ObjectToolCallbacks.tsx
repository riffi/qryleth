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
    getObjectData: 'Получение данных объекта',
    addPrimitives: 'Добавление примитивов'
  }

  return displayNames[toolName] || toolName
}

function formatToolResult(toolName: string, result: any): React.ReactNode {
  if (typeof result === 'string') {
    return <div className="result-text">{result}</div>
  }

  if (typeof result === 'object') {
    return <pre className="result-json">{JSON.stringify(result, null, 2)}</pre>
  }

  return <div className="result-other">{String(result)}</div>
}

