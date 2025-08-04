/**
 * Хук для chat функциональности в ObjectEditor
 */

import { useCallback, useMemo, useEffect, useRef, useState } from 'react'
import { useChat } from '@/shared/entities/chat'
import type { ChatConfig, ChatMessage } from '@/shared/entities/chat'
import { langChainChatService } from '@/shared/lib/langchain'
import { useObjectStore } from '@/features/object-editor'
import { createObjectEditorTools } from '@/features/object-editor/lib/ai/tools'
import { useObjectContextPrompt } from './useObjectContextPrompt'
import type { GfxPrimitive } from '@/entities/primitive'
import type { CreateGfxMaterial } from '@/entities/material'
import { generateUUID } from '@/shared/lib/uuid'
import { nanoid } from 'nanoid'

interface UseObjectChatOptions {
  mode?: 'page' | 'modal'
  onPrimitiveAdded?: (primitive: GfxPrimitive) => void
  onMaterialCreated?: (material: CreateGfxMaterial) => void
  onObjectModified?: (modifications: any) => void
}

export const useObjectChat = (options: UseObjectChatOptions = {}) => {
  const { mode = 'page', onPrimitiveAdded, onMaterialCreated, onObjectModified } = options
  
  const objectStore = useObjectStore()
  const { systemPrompt, objectInfo, contextualHints } = useObjectContextPrompt()
  const [isLoading, setIsLoading] = useState(false)

  // Конфигурация чата для object-editor
  const chatConfig: ChatConfig = useMemo(() => ({
    feature: 'object-editor',
    tools: [], // LangChain tools регистрируются отдельно
    systemPrompt,
    debugMode: false, // Менее verbose чем scene
    maxMessages: 50, // Ограничение для производительности
    autoScroll: true
  }), [systemPrompt])

  // Tool callbacks для object-editor специфичных действий
  const handleToolCall = useCallback(async (toolName: string, args: any) => {
    try {
      switch (toolName) {
        case 'addPrimitives': {
          const { primitives } = args
          for (const primitiveData of primitives) {
            const newPrimitive: GfxPrimitive = {
              id: generateUUID(),
              primitiveType: primitiveData.primitiveType,
              position: primitiveData.position || { x: 0, y: 0, z: 0 },
              rotation: primitiveData.rotation || { x: 0, y: 0, z: 0 },
              scale: primitiveData.scale || { x: 1, y: 1, z: 1 },
              materialUuid: primitiveData.materialUuid || null,
              name: primitiveData.name || `${primitiveData.primitiveType}_${Date.now()}`,
              visible: true
            }
            objectStore.addPrimitive(newPrimitive)
            onPrimitiveAdded?.(newPrimitive)
          }
          return `Добавлено ${primitives.length} примитив(ов)`
        }

        case 'modifyPrimitive': {
          const { index, updates } = args
          objectStore.updatePrimitive(index, updates)
          onObjectModified?.({ type: 'primitiveModified', index, updates })
          return `Примитив ${index} обновлен`
        }

        case 'removePrimitive': {
          const { index } = args
          objectStore.removePrimitive(index)
          onObjectModified?.({ type: 'primitiveRemoved', index })
          return `Примитив ${index} удален`
        }

        case 'duplicatePrimitive': {
          const { index, offset = { x: 1, y: 0, z: 0 }, count = 1 } = args
          const originalPrimitive = objectStore.primitives[index]
          if (originalPrimitive) {
            for (let i = 1; i <= count; i++) {
              const duplicatedPrimitive: GfxPrimitive = {
                ...originalPrimitive,
                id: generateUUID(),
                name: `${originalPrimitive.name}_copy_${i}`,
                position: {
                  x: originalPrimitive.position.x + offset.x * i,
                  y: originalPrimitive.position.y + offset.y * i,
                  z: originalPrimitive.position.z + offset.z * i
                }
              }
              objectStore.addPrimitive(duplicatedPrimitive)
            }
            return `Создано ${count} копий примитива ${originalPrimitive.name}`
          }
          return 'Примитив не найден'
        }

        case 'createMaterial': {
          const { name, color, metalness = 0, roughness = 0.5, opacity = 1, emissive, emissiveIntensity = 0 } = args
          const newMaterial: CreateGfxMaterial = {
            name,
            color,
            metalness,
            roughness,
            opacity,
            ...(emissive && { emissive }),
            ...(emissiveIntensity > 0 && { emissiveIntensity })
          }
          const createdMaterial = objectStore.addMaterial(newMaterial)
          onMaterialCreated?.(newMaterial)
          return `Материал "${name}" создан`
        }

        case 'updateMaterial': {
          const { materialUuid, updates } = args
          objectStore.updateMaterial(materialUuid, updates)
          onObjectModified?.({ type: 'materialUpdated', materialUuid, updates })
          return `Материал обновлен`
        }

        case 'assignMaterial': {
          const { materialUuid, primitiveIndices } = args
          for (const index of primitiveIndices) {
            objectStore.updatePrimitive(index, { materialUuid })
          }
          return `Материал назначен ${primitiveIndices.length} примитив(ам)`
        }

        case 'removeMaterial': {
          const { materialUuid, replacementMaterialUuid } = args
          if (replacementMaterialUuid) {
            // Заменить материал во всех примитивах перед удалением
            objectStore.primitives.forEach((primitive, index) => {
              if (primitive.materialUuid === materialUuid) {
                objectStore.updatePrimitive(index, { materialUuid: replacementMaterialUuid })
              }
            })
          }
          objectStore.removeMaterial(materialUuid)
          return 'Материал удален'
        }

        case 'duplicateMaterial': {
          const { sourceMaterialUuid, newName, modifications = {} } = args
          const sourceMaterial = objectStore.materials.find(m => m.uuid === sourceMaterialUuid)
          if (sourceMaterial) {
            const duplicatedMaterial: CreateGfxMaterial = {
              ...sourceMaterial,
              name: newName,
              ...modifications
            }
            objectStore.addMaterial(duplicatedMaterial)
            return `Материал "${newName}" создан на основе "${sourceMaterial.name}"`
          }
          return 'Исходный материал не найден'
        }

        case 'analyzeObject': {
          const { analysisType, detailed = false } = args
          const analysis = performObjectAnalysis(objectStore, analysisType, detailed)
          return analysis
        }

        case 'validateObject': {
          const { checkTypes = ['geometry', 'materials', 'transforms'], strict = false } = args
          const validation = performObjectValidation(objectStore, checkTypes, strict)
          return validation
        }

        case 'calculateStats': {
          const { includeEstimates = true, compareWithStandards = false } = args
          const stats = calculateObjectStats(objectStore, includeEstimates, compareWithStandards)
          return stats
        }

        default:
          return `Инструмент "${toolName}" пока не реализован`
      }
    } catch (error) {
      return `Ошибка выполнения "${toolName}": ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    }
  }, [objectStore, onPrimitiveAdded, onMaterialCreated, onObjectModified])

  // Базовый useChat без отправки сообщений
  const baseChatState = useChat({
    config: chatConfig,
    generateMessageId: () => nanoid()
  })

  // Переопределенный sendMessage с интеграцией LangChain
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    baseChatState.addMessage(userMessage)
    setIsLoading(true)

    try {
      // Используем LangChain агент для обработки сообщений
      const langChainResponse = await langChainChatService.chat([...baseChatState.messages, userMessage])

      const assistantMessage: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: langChainResponse.message,
        timestamp: new Date()
      }
      baseChatState.addMessage(assistantMessage)

    } catch (error) {
      console.error('ObjectEditor chat error:', error)
      const errorMessage: ChatMessage = {
        id: nanoid(),
        role: 'assistant',  
        content: `Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        timestamp: new Date()
      }
      baseChatState.addMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [baseChatState, isLoading])

  // Добавление системного сообщения с контекстом
  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'system',
      content,
      timestamp: new Date()
    }
    baseChatState.addMessage(systemMessage)
  }, [baseChatState])

  // Информационное сообщение с подсказками
  const showContextualHints = useCallback(() => {
    if (contextualHints.length > 0) {
      const hintsMessage = `💡 Подсказки:\n${contextualHints.map(hint => `• ${hint}`).join('\n')}`
      addSystemMessage(hintsMessage)
    }
  }, [contextualHints, addSystemMessage])

  // Tool callback для LangChain сервиса
  const handleToolCallbackRef = useRef(handleToolCall)

  // Синхронизация актуального callback'а инструментов с сервисом LangChain
  useEffect(() => {
    handleToolCallbackRef.current = handleToolCall
    langChainChatService.setToolCallback(handleToolCall)
  }, [handleToolCall])

  // Инициализация LangChain сервиса при монтировании
  useEffect(() => {
    const initializeService = async () => {
      try {
        await langChainChatService.initialize()
        
        // Очищаем существующие tools и регистрируем наши
        langChainChatService.clearTools()
        
        // Создаем и регистрируем ObjectEditor tools
        const objectEditorTools = createObjectEditorTools()
        
        objectEditorTools.forEach(tool => {
          langChainChatService.registerDynamicTool(tool)
        })
        
        langChainChatService.setToolCallback(handleToolCallbackRef.current)
        console.log('ObjectEditor LangChain сервис инициализирован с', objectEditorTools.length, 'инструментами')
      } catch (error) {
        console.error('Ошибка инициализации ObjectEditor LangChain сервиса:', error)
        
        const errorMessage: ChatMessage = {
          id: nanoid(),
          role: 'assistant',
          content: `❌ Ошибка инициализации чата: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
          timestamp: new Date()
        }
        baseChatState.addMessage(errorMessage)
      }
    }

    initializeService()
  }, [baseChatState.addMessage])

  return {
    ...baseChatState,
    isLoading,
    sendMessage, // Переопределенный sendMessage
    objectInfo,
    contextualHints,
    addSystemMessage,
    showContextualHints,
    isCompactMode: mode === 'modal'
  }
}

// Вспомогательные функции для анализа
function performObjectAnalysis(objectStore: any, analysisType: string, detailed: boolean): string {
  const { primitives, materials } = objectStore
  
  switch (analysisType) {
    case 'structure':
      return `Структурный анализ:
- Примитивы: ${primitives.length}
- Типы: ${[...new Set(primitives.map((p: any) => p.primitiveType))].join(', ')}
- Материалы: ${materials.length}
${detailed ? '\n- Рекомендуется группировка схожих примитивов' : ''}`

    case 'materials':
      return `Анализ материалов:
- Всего материалов: ${materials.length}
- Неиспользуемые материалы: ${materials.filter((m: any) => 
  !primitives.some((p: any) => p.materialUuid === m.uuid)
).length}
${detailed ? '\n- Рекомендуется удалить неиспользуемые материалы' : ''}`

    case 'performance':
      return `Анализ производительности:
- Примитивы: ${primitives.length} (${primitives.length > 100 ? 'много' : 'нормально'})
- Материалы: ${materials.length} (${materials.length > 10 ? 'много' : 'нормально'})
${detailed ? '\n- При >100 примитивах рассмотрите объединение в группы' : ''}`

    default:
      return 'Общий анализ выполнен успешно'
  }
}

function performObjectValidation(objectStore: any, checkTypes: string[], strict: boolean): string {
  const issues: string[] = []
  const { primitives, materials } = objectStore

  if (checkTypes.includes('geometry')) {
    const invalidPrimitives = primitives.filter((p: any) => 
      !p.primitiveType || p.scale.x <= 0 || p.scale.y <= 0 || p.scale.z <= 0
    )
    if (invalidPrimitives.length > 0) {
      issues.push(`${invalidPrimitives.length} примитив(ов) с некорректной геометрией`)
    }
  }

  if (checkTypes.includes('materials')) {
    const invalidMaterials = materials.filter((m: any) => !m.name || !m.color)
    if (invalidMaterials.length > 0) {
      issues.push(`${invalidMaterials.length} материал(ов) с некорректными данными`)
    }
  }

  return issues.length > 0 
    ? `Найдены проблемы:\n${issues.map(issue => `• ${issue}`).join('\n')}`
    : 'Объект прошел валидацию успешно ✅'
}

function calculateObjectStats(objectStore: any, includeEstimates: boolean, compareWithStandards: boolean): string {
  const { primitives, materials } = objectStore
  
  let stats = `Статистика объекта:
- Примитивы: ${primitives.length}
- Материалы: ${materials.length}
- Видимые примитивы: ${primitives.filter((p: any) => p.visible).length}`

  if (includeEstimates) {
    const estimatedPolygons = primitives.length * 100 // Примерная оценка
    stats += `\n- Примерное количество полигонов: ${estimatedPolygons}`
  }

  if (compareWithStandards) {
    const performanceLevel = primitives.length < 50 ? 'Отличная' : 
                            primitives.length < 200 ? 'Хорошая' : 'Требует оптимизации'
    stats += `\n- Производительность: ${performanceLevel}`
  }

  return stats
}
