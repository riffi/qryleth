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

🔍 **Работа с объектом:**
- getObjectData: получить полные данные текущего объекта

🔧 **Работа с примитивами:**
- addPrimitives: добавить один или несколько примитивов

**ВАЖНО:** Используй инструменты активно! Когда пользователь просит создать или получить информацию об объекте — сразу вызывай соответствующий инструмент.

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


  return {
    systemPrompt,
    objectInfo
  }
}

