/**
 * ChatInterface для ObjectEditor с поддержкой AI tools и интеграцией с layout
 */

import React, { useEffect, useState } from 'react'
import { 
  ChatInput, 
  ChatMessageItem 
} from '@/shared/entities/chat/ui'
import { useObjectChat } from './hooks'
import { ObjectToolCallbacks } from './components/ObjectToolCallbacks'
import type { GfxPrimitive } from '@/entities/primitive'
import type { CreateGfxMaterial } from '@/entities/material'

interface ObjectChatInterfaceProps {
  isVisible: boolean
  onVisibilityChange?: (visible: boolean) => void
  mode?: 'page' | 'modal'
  className?: string
  onPrimitiveAdded?: (primitive: GfxPrimitive) => void
  onMaterialCreated?: (material: CreateGfxMaterial) => void
  onObjectModified?: (modifications: any) => void
}

export const ObjectChatInterface: React.FC<ObjectChatInterfaceProps> = ({
  isVisible,
  onVisibilityChange,
  mode = 'page',
  className = '',
  onPrimitiveAdded,
  onMaterialCreated,
  onObjectModified
}) => {
  const [inputValue, setInputValue] = useState('')

  const {
    messages,
    isLoading,
    sendMessage,
    addMessage,
    clearMessages,
    objectInfo,
    contextualHints,
    addSystemMessage,
    showContextualHints,
    isCompactMode
  } = useObjectChat({
    mode,
    onPrimitiveAdded,
    onMaterialCreated,
    onObjectModified
  })

  const handleSend = async () => {
    if (inputValue.trim()) {
      await sendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  // Добавляем приветственное сообщение при первом открытии
  useEffect(() => {
    if (isVisible && messages.length === 0) {
      const welcomeMessage = objectInfo.isEmpty 
        ? `👋 Привет! Я помогу тебе создать 3D объект. 

Начнем с основ - я могу:
• Добавить примитивы (box, sphere, cylinder и др.)
• Создать материалы с настройками цвета и текстур
• Анализировать и оптимизировать структуру

Что бы ты хотел создать?`
        : `👋 Привет! Вижу, у тебя уже есть объект с ${objectInfo.primitivesCount} примитив(ами) и ${objectInfo.materialsCount} материал(ами).

Чем могу помочь?`

      addSystemMessage(welcomeMessage)
      
      // Показываем подсказки если они есть
      if (contextualHints.length > 0) {
        setTimeout(() => showContextualHints(), 1000)
      }
    }
  }, [isVisible, messages.length, objectInfo, addSystemMessage, showContextualHints, contextualHints.length])

  if (!isVisible) return null

  return (
    <div className={`object-chat-interface ${className} ${isCompactMode ? 'object-chat-interface--compact' : ''}`}>
      <div className="object-chat-header">
        <div className="header-title">
          🤖 AI Помощник
          {objectInfo.primitivesCount > 0 && (
            <span className="object-stats">
              {objectInfo.primitivesCount}P • {objectInfo.materialsCount}M
            </span>
          )}
        </div>
        
        <div className="header-actions">
          {contextualHints.length > 0 && (
            <button 
              className="hints-button"
              onClick={showContextualHints}
              title="Показать подсказки"
            >
              💡
            </button>
          )}
          
          <button 
            className="clear-button"
            onClick={clearMessages}
            title="Очистить чат"
          >
            🗑️
          </button>
          
          {onVisibilityChange && (
            <button 
              className="close-button"
              onClick={() => onVisibilityChange(false)}
              title="Скрыть чат"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="object-chat-messages" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        maxHeight: isCompactMode ? '300px' : '100%'
      }}>
        {messages.length === 0 && (
          <div className="empty-state" style={{
            textAlign: 'center',
            color: '#666',
            padding: '20px',
            fontStyle: 'italic'
          }}>
            Начните диалог с AI помощником...
          </div>
        )}
        
        {messages.map((message) => (
          <div key={message.id} className="message-wrapper">
            <ChatMessageItem 
              message={message}
              showTimestamp={!isCompactMode}
            />
            
            {message.toolCalls && message.toolCalls.length > 0 && (
              <ObjectToolCallbacks 
                toolCalls={message.toolCalls}
                className="message-tool-callbacks"
              />
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="loading-indicator">
            <div className="loading-dots">
              <span>•</span>
              <span>•</span>
              <span>•</span>
            </div>
            <span>AI думает...</span>
          </div>
        )}
      </div>

      <div className="object-chat-input">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          disabled={isLoading}
          loading={isLoading}
          placeholder={
            objectInfo.isEmpty 
              ? "Например: 'Создай базовую структуру дома'"
              : "Что хочешь изменить в объекте?"
          }
        />
      </div>

      {isCompactMode && (
        <div className="compact-info">
          <span className="compact-stats">
            {objectInfo.primitivesCount}P • {objectInfo.materialsCount}M
          </span>
          
          {contextualHints.length > 0 && (
            <button 
              className="expand-hints"
              onClick={showContextualHints}
            >
              {contextualHints.length} подсказок
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Стили для компонента (можно вынести в отдельный CSS файл)
const styles = `
.object-chat-interface {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary, #ffffff);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  overflow: hidden;
}

.object-chat-interface--compact {
  max-height: 400px;
  min-height: 300px;
}

.object-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  font-size: 14px;
  font-weight: 500;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.object-stats {
  font-size: 12px;
  color: var(--text-secondary, #666);
  background: var(--bg-tertiary, #e8e8e8);
  padding: 2px 6px;
  border-radius: 4px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-actions button {
  padding: 4px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.header-actions button:hover {
  background: var(--bg-hover, #e0e0e0);
}

.object-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message-wrapper {
  margin-bottom: 16px;
}

.message-tool-callbacks {
  margin-top: 8px;
  margin-left: 40px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  color: var(--text-secondary, #666);
  font-style: italic;
}

.loading-dots span {
  animation: loadingDots 1.4s infinite ease-in-out;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes loadingDots {
  0%, 80%, 100% { opacity: 0; }
  40% { opacity: 1; }
}

.object-chat-input {
  padding: 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  background: var(--bg-primary, #ffffff);
}

.compact-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  font-size: 12px;
  background: var(--bg-tertiary, #f8f8f8);
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.compact-stats {
  color: var(--text-secondary, #666);
}

.expand-hints {
  padding: 2px 6px;
  font-size: 11px;
  border: 1px solid var(--border-color, #e0e0e0);
  background: var(--bg-primary, #ffffff);
  border-radius: 3px;
  cursor: pointer;
}

.expand-hints:hover {
  background: var(--bg-hover, #f0f0f0);
}
`

// Инжекция стилей (в продакшене лучше использовать CSS модули или styled-components)
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}