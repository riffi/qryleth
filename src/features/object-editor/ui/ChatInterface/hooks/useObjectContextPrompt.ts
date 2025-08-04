/**
 * Хук для генерации контекстных промптов на основе состояния объекта
 */

import { useMemo } from 'react'
import { useObjectStore } from '@/features/object-editor'

interface ObjectInfo {
  name?: string
  primitivesCount: number
  materialsCount: number
  selectedPrimitiveIds: number[]
  selectedMaterialUuid: string | null
  primitiveTypes: string[]
  isEmpty: boolean
}

export const useObjectContextPrompt = () => {
  const { 
    primitives, 
    materials, 
    selectedPrimitiveIds, 
    selectedMaterialUuid 
  } = useObjectStore()

  const objectInfo: ObjectInfo = useMemo(() => {
    const primitiveTypes = [...new Set(primitives.map(p => p.primitiveType))]
    
    return {
      primitivesCount: primitives.length,
      materialsCount: materials.length,
      selectedPrimitiveIds,
      selectedMaterialUuid,
      primitiveTypes,
      isEmpty: primitives.length === 0
    }
  }, [primitives, materials, selectedPrimitiveIds, selectedMaterialUuid])

  const systemPrompt = useMemo(() => {
    const basePrompt = `
Ты помощник для редактирования 3D объектов в ObjectEditor. У тебя есть доступ к следующим инструментам:

🔧 **Работа с примитивами:**
- addPrimitives: добавить один или несколько примитивов (массовая операция)
- modifyPrimitive: изменить существующий примитив (позиция, поворот, масштаб)
- removePrimitive: удалить примитив по индексу
- duplicatePrimitive: дублировать примитив с смещением

🎨 **Управление материалами:**
- createMaterial: создать новый материал с настройками цвета, металличности, шероховатости
- updateMaterial: обновить существующий материал
- assignMaterial: назначить материал группе примитивов
- removeMaterial: удалить материал (с опциональной заменой)
- duplicateMaterial: дублировать материал с изменениями

📊 **Анализ и оптимизация:**
- analyzeObject: анализировать структуру объекта
- optimizeObject: оптимизировать объект для производительности
- validateObject: проверить объект на корректность
- suggestImprovements: предложить улучшения
- calculateStats: подсчитать статистику объекта
- generateVariations: сгенерировать вариации объекта

**ВАЖНО:** Используй инструменты активно! Когда пользователь просит создать, изменить или проанализировать что-то - сразу вызывай соответствующий инструмент.

**Всегда отвечай на русском языке и будь конкретен в рекомендациях.**
    `.trim()

    if (objectInfo.isEmpty) {
      return basePrompt + `

**Текущее состояние:** Объект пустой - отличное время для создания чего-то нового!
Предлагай конкретные идеи и помогай пользователю начать работу.`
    }

    const contextInfo = `

**Текущий объект:**
- Примитивы: ${objectInfo.primitivesCount} (${objectInfo.primitiveTypes.join(', ')})
- Материалы: ${objectInfo.materialsCount}
${objectInfo.selectedPrimitiveIds.length > 0 ? `- Выбранные примитивы: ${objectInfo.selectedPrimitiveIds.length}` : ''}
${objectInfo.selectedMaterialUuid ? '- Выбран материал для редактирования' : ''}

Предлагай изменения с учетом существующей структуры объекта.`

    return basePrompt + contextInfo
  }, [objectInfo])

  const contextualHints = useMemo(() => {
    const hints: string[] = []

    if (objectInfo.isEmpty) {
      hints.push('Создай базовую структуру с помощью addPrimitives')
      hints.push('Начни с простых форм: box, sphere, cylinder')
    }

    if (objectInfo.primitivesCount > 0 && objectInfo.materialsCount === 0) {
      hints.push('Создай материалы для улучшения внешнего вида')
    }

    if (objectInfo.primitivesCount > 5) {
      hints.push('Можно проанализировать структуру с помощью analyzeObject')
      hints.push('Рассмотри оптимизацию для лучшей производительности')
    }

    if (objectInfo.selectedPrimitiveIds.length > 0) {
      hints.push('Можно изменить выбранные примитивы с помощью modifyPrimitive')
      hints.push('Или назначить материал выбранным примитивам')
    }

    return hints
  }, [objectInfo])

  return {
    systemPrompt,
    objectInfo,
    contextualHints
  }
}