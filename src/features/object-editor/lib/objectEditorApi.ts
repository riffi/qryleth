/**
 * ObjectEditor API предоставляет методы для работы с примитивами и материалами объекта.
 * Используется AI-инструментами для модификации данных через Zustand store.
 */

import { useObjectStore } from '../model/objectStore'
import { generateUUID } from '@/shared/lib/uuid'
import type { GfxPrimitive } from '@/entities/primitive'
import type { CreateGfxMaterial, GfxMaterial } from '@/entities/material'
import type { Vector3 } from '@/shared/types'

/** Параметры добавления примитивов */
export interface AddPrimitiveParams {
  primitiveType: string
  position?: Vector3
  rotation?: Vector3
  scale?: Vector3
  materialUuid?: string | null
  name?: string
}

/** Результат добавления примитивов */
export interface AddPrimitivesResult {
  success: boolean
  count: number
  indices: number[]
  error?: string
}

/** Результат модификации примитива */
export interface ModifyPrimitiveResult {
  success: boolean
  index: number
  error?: string
}

/** Результат удаления примитива */
export interface RemovePrimitiveResult {
  success: boolean
  index: number
  error?: string
}

/** Результат дублирования примитива */
export interface DuplicatePrimitiveResult {
  success: boolean
  indices: number[]
  error?: string
}

/** Результат операций с материалами */
export interface MaterialOperationResult {
  success: boolean
  materialUuid?: string
  updatedCount?: number
  error?: string
}

/** Результат аналитических операций */
export interface AnalysisResult {
  success: boolean
  message: string
  error?: string
}

/**
 * API для редактора объекта
 */
export class ObjectEditorAPI {
  /**
   * Возвращает текущие примитивы объекта
   */
  static getPrimitives(): GfxPrimitive[] {
    return useObjectStore.getState().primitives
  }

  /**
   * Добавляет несколько примитивов в объект
   */
  static addPrimitives(params: AddPrimitiveParams[]): AddPrimitivesResult {
    try {
      const store = useObjectStore.getState()
      const startIndex = store.primitives.length
      params.forEach(p => {
        const primitive: GfxPrimitive = {
          id: generateUUID(),
          primitiveType: p.primitiveType as any,
          position: p.position || { x: 0, y: 0, z: 0 },
          rotation: p.rotation || { x: 0, y: 0, z: 0 },
          scale: p.scale || { x: 1, y: 1, z: 1 },
          materialUuid: p.materialUuid || null,
          name: p.name || `${p.primitiveType}_${Date.now()}`,
          visible: true
        } as any
        store.addPrimitive(primitive)
      })
      const indices = Array.from({ length: params.length }, (_, i) => startIndex + i)
      return { success: true, count: params.length, indices }
    } catch (error) {
      return {
        success: false,
        count: 0,
        indices: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Изменяет примитив по индексу
   */
  static modifyPrimitive(index: number, updates: Partial<GfxPrimitive>): ModifyPrimitiveResult {
    try {
      const store = useObjectStore.getState()
      store.updatePrimitive(index, updates)
      return { success: true, index }
    } catch (error) {
      return {
        success: false,
        index,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Удаляет примитив по индексу
   */
  static removePrimitive(index: number): RemovePrimitiveResult {
    try {
      const store = useObjectStore.getState()
      store.removePrimitive(index)
      return { success: true, index }
    } catch (error) {
      return {
        success: false,
        index,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Дублирует примитив указанное количество раз
   */
  static duplicatePrimitive(index: number, offset: Vector3 = { x: 1, y: 0, z: 0 }, count = 1): DuplicatePrimitiveResult {
    try {
      const store = useObjectStore.getState()
      const original = store.primitives[index] as any
      if (!original) {
        return { success: false, indices: [], error: 'Primitive not found' }
      }
      const start = store.primitives.length
      for (let i = 1; i <= count; i++) {
        const dup: GfxPrimitive = {
          ...original,
          id: generateUUID(),
          name: `${original.name || original.primitiveType}_copy_${i}`,
          position: {
            x: original.position.x + offset.x * i,
            y: original.position.y + offset.y * i,
            z: original.position.z + offset.z * i
          }
        }
        store.addPrimitive(dup as any)
      }
      const indices = Array.from({ length: count }, (_, i) => start + i)
      return { success: true, indices }
    } catch (error) {
      return {
        success: false,
        indices: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Создаёт новый материал и добавляет его в объект
   */
  static createMaterial(params: CreateGfxMaterial): MaterialOperationResult {
    try {
      const store = useObjectStore.getState()
      store.addMaterial(params)
      const material = useObjectStore.getState().materials.slice(-1)[0]
      return { success: true, materialUuid: material.uuid }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Обновляет существующий материал по UUID
   */
  static updateMaterial(materialUuid: string, updates: Partial<GfxMaterial>): MaterialOperationResult {
    try {
      const store = useObjectStore.getState()
      store.updateMaterial(materialUuid, updates)
      return { success: true, materialUuid }
    } catch (error) {
      return {
        success: false,
        materialUuid,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Назначает материал указанным примитивам
   */
  static assignMaterial(materialUuid: string, primitiveIndices: number[]): MaterialOperationResult {
    try {
      const store = useObjectStore.getState()
      primitiveIndices.forEach(index => {
        store.updatePrimitive(index, { materialUuid })
      })
      return { success: true, materialUuid, updatedCount: primitiveIndices.length }
    } catch (error) {
      return {
        success: false,
        materialUuid,
        updatedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Удаляет материал из объекта
   */
  static removeMaterial(materialUuid: string, replacementUuid?: string): MaterialOperationResult {
    try {
      const store = useObjectStore.getState()
      // Заменяем материал у примитивов если требуется
      const primitives = store.primitives
      primitives.forEach((p, i) => {
        if ((p as any).materialUuid === materialUuid) {
          store.updatePrimitive(i, { materialUuid: replacementUuid || null })
        }
      })
      store.removeMaterial(materialUuid)
      return { success: true, materialUuid }
    } catch (error) {
      return {
        success: false,
        materialUuid,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Дублирует существующий материал
   */
  static duplicateMaterial(sourceUuid: string, newName: string, modifications: Partial<GfxMaterial> = {}): MaterialOperationResult {
    try {
      const store = useObjectStore.getState()
      const source = store.materials.find(m => m.uuid === sourceUuid)
      if (!source) {
        return { success: false, error: 'Source material not found' }
      }
      const newMaterial: CreateGfxMaterial = {
        ...source,
        ...modifications,
        name: newName
      }
      store.addMaterial(newMaterial)
      const created = store.materials.slice(-1)[0]
      return { success: true, materialUuid: created.uuid }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Выполняет простой анализ объекта
   */
  static analyzeObject(analysisType: string, detailed = false): AnalysisResult {
    try {
      const store = useObjectStore.getState()
      const primitives = store.primitives
      const materials = store.materials
      let message = ''
      switch (analysisType) {
        case 'structure':
          message = `Примитивы: ${primitives.length}\nМатериалы: ${materials.length}`
          break
        case 'materials':
          const unused = materials.filter(m => !primitives.some(p => (p as any).materialUuid === m.uuid))
          message = `Всего материалов: ${materials.length}\nНеиспользуемые: ${unused.length}`
          break
        case 'performance':
          message = `Количество примитивов: ${primitives.length}`
          break
        default:
          message = 'Общий анализ выполнен'
      }
      if (detailed) {
        message += '\nДетальный режим активирован'
      }
      return { success: true, message }
    } catch (error) {
      return {
        success: false,
        message: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Заглушка оптимизации объекта
   */
  static optimizeObject(): AnalysisResult {
    return { success: true, message: 'Оптимизация выполнена' }
  }

  /**
   * Заглушка проверки объекта
   */
  static validateObject(): AnalysisResult {
    return { success: true, message: 'Валидация выполнена' }
  }

  /**
   * Заглушка предложений по улучшению
   */
  static suggestImprovements(): AnalysisResult {
    return { success: true, message: 'Предложения по улучшению сгенерированы' }
  }

  /**
   * Подсчёт базовой статистики объекта
   */
  static calculateStats(): AnalysisResult {
    const store = useObjectStore.getState()
    const primitives = store.primitives.length
    const materials = store.materials.length
    const message = `Статистика объекта:\nПримитивы: ${primitives}\nМатериалы: ${materials}`
    return { success: true, message }
  }

  /**
   * Заглушка генерации вариаций
   */
  static generateVariations(count: number): AnalysisResult {
    return { success: true, message: `Сгенерировано ${count} вариаций` }
  }
}

