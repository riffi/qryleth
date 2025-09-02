import React from 'react'
import { addNewObjectTool } from '@/features/editor/scene/lib/ai/tools'
import type {GfxObjectWithTransform} from "@/entities"

interface SceneToolCallbacksProps {
  children?: React.ReactNode
}

/**
 * Компонент-провайдер для обработки scene-специфичных tool callbacks.
 * В текущей реализации логика обработки перенесена в useSceneChat хук,
 * но компонент оставлен для будущих расширений.
 */
export const SceneToolCallbacks: React.FC<SceneToolCallbacksProps> = ({ children }) => {
  /**
   * Выполняет инструмент add_new_object и возвращает созданный объект
   */
  const executeAddNewObject = async (args: Record<string, unknown>): Promise<GfxObjectWithTransform> => {
    const result = await addNewObjectTool.func(args)
    const parsed = JSON.parse(result)
    if (parsed.success && parsed.object) {
      return parsed.object as GfxObjectWithTransform
    }
    throw new Error(parsed.error || 'Ошибка выполнения инструмента')
  }

  // В будущем здесь может быть контекст для передачи callback'ов
  return <>{children}</>
}

// Экспортируем утилитарную функцию для использования в других компонентах
export { SceneToolCallbacks as default }

// Утилитарные функции для работы с scene tools
export const sceneToolUtils = {
  executeAddNewObject: async (args: Record<string, unknown>): Promise<GfxObjectWithTransform> => {
    const result = await addNewObjectTool.func(args)
    const parsed = JSON.parse(result)
    if (parsed.success && parsed.object) {
      return parsed.object as GfxObjectWithTransform
    }
    throw new Error(parsed.error || 'Ошибка выполнения инструмента')
  }
}
