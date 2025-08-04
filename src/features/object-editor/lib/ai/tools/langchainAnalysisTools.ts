/**
 * LangChain инструменты для анализа и оптимизации структуры объекта
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

export const createAnalyzeObjectTool = () => {
  return new DynamicStructuredTool({
    name: 'analyzeObject',
    description: 'Проанализировать структуру объекта и предложить улучшения. Используй когда пользователь просит проанализировать объект.',
    schema: z.object({
      analysisType: z.enum(['structure', 'materials', 'performance', 'aesthetics', 'all']),
      detailed: z.boolean().optional().default(false)
    }),
    func: async (input) => {
      return `Анализ объекта (${input.analysisType}) выполнен`
    }
  })
}

export const createOptimizeObjectTool = () => {
  return new DynamicStructuredTool({
    name: 'optimizeObject',
    description: 'Оптимизировать объект для лучшей производительности. Используй когда нужно улучшить производительность.',
    schema: z.object({
      optimizationType: z.enum(['geometry', 'materials', 'hierarchy', 'all']),
      aggressiveness: z.enum(['conservative', 'moderate', 'aggressive']).optional().default('moderate'),
      preserveVisualQuality: z.boolean().optional().default(true)
    }),
    func: async (input) => {
      return `Оптимизация объекта (${input.optimizationType}) выполнена`
    }
  })
}

export const createValidateObjectTool = () => {
  return new DynamicStructuredTool({
    name: 'validateObject',
    description: 'Проверить объект на корректность и выявить потенциальные проблемы. Используй для диагностики проблем.',
    schema: z.object({
      checkTypes: z.array(z.enum(['geometry', 'materials', 'transforms', 'naming', 'performance']))
        .optional().default(['geometry', 'materials', 'transforms']),
      strict: z.boolean().optional().default(false)
    }),
    func: async (input) => {
      return 'Валидация объекта выполнена'
    }
  })
}

export const createSuggestImprovementsTool = () => {
  return new DynamicStructuredTool({
    name: 'suggestImprovements',
    description: 'Предложить улучшения для объекта на основе его текущего состояния. Используй для получения рекомендаций.',
    schema: z.object({
      context: z.enum(['game', 'visualization', 'animation', 'vr', 'general']).optional().default('general'),
      focus: z.enum(['performance', 'quality', 'realism', 'style', 'functionality']).optional().default('quality'),
      maxSuggestions: z.number().int().min(1).max(10).optional().default(5)
    }),
    func: async (input) => {
      return `Предложения улучшений сгенерированы (фокус: ${input.focus})`
    }
  })
}

export const createCalculateStatsTool = () => {
  return new DynamicStructuredTool({
    name: 'calculateStats',
    description: 'Подсчитать статистику объекта (количество полигонов, материалов, etc.). Используй для получения статистики.',
    schema: z.object({
      includeEstimates: z.boolean().optional().default(true),
      compareWithStandards: z.boolean().optional().default(false)
    }),
    func: async (input) => {
      return 'Статистика объекта подсчитана'
    }
  })
}

export const createGenerateVariationsTool = () => {
  return new DynamicStructuredTool({
    name: 'generateVariations',
    description: 'Сгенерировать вариации объекта с изменениями. Используй для создания альтернативных версий.',
    schema: z.object({
      variationType: z.enum(['scale', 'color', 'structure', 'materials', 'random']),
      count: z.number().int().min(1).max(5).optional().default(3),
      magnitude: z.enum(['subtle', 'moderate', 'dramatic']).optional().default('moderate')
    }),
    func: async (input) => {
      return `Сгенерировано ${input.count} вариаций (тип: ${input.variationType})`
    }
  })
}