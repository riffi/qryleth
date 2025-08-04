/**
 * LangChain инструменты для анализа и оптимизации объекта
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ObjectEditorAPI } from '../../objectEditorApi'

/**
 * Инструмент анализа объекта
 */
export const analyzeObjectTool = new DynamicStructuredTool({
  name: 'analyze_object',
  description: 'Проанализировать структуру объекта и вернуть рекомендации.',
  schema: z.object({
    analysisType: z.enum(['structure', 'materials', 'performance', 'aesthetics', 'all']),
    detailed: z.boolean().optional().default(false)
  }),
  func: async ({ analysisType, detailed }) => {
    try {
      const result = ObjectEditorAPI.analyzeObject(analysisType, detailed)
      return JSON.stringify(result, null, 2)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({ success: false, error: msg })
    }
  }
})

/**
 * Инструмент оптимизации объекта
 */
export const optimizeObjectTool = new DynamicStructuredTool({
  name: 'optimize_object',
  description: 'Оптимизировать объект для повышения производительности.',
  schema: z.object({
    optimizationType: z.enum(['geometry', 'materials', 'hierarchy', 'all']),
    aggressiveness: z.enum(['conservative', 'moderate', 'aggressive']).optional().default('moderate'),
    preserveVisualQuality: z.boolean().optional().default(true)
  }),
  func: async () => JSON.stringify(ObjectEditorAPI.optimizeObject(), null, 2)
})

/**
 * Инструмент проверки объекта
 */
export const validateObjectTool = new DynamicStructuredTool({
  name: 'validate_object',
  description: 'Проверить объект на корректность и потенциальные проблемы.',
  schema: z.object({
    checkTypes: z.array(z.enum(['geometry', 'materials', 'transforms', 'naming', 'performance']))
      .optional().default(['geometry', 'materials', 'transforms']),
    strict: z.boolean().optional().default(false)
  }),
  func: async () => JSON.stringify(ObjectEditorAPI.validateObject(), null, 2)
})

/**
 * Инструмент предложения улучшений
 */
export const suggestImprovementsTool = new DynamicStructuredTool({
  name: 'suggest_improvements',
  description: 'Предложить улучшения для объекта.',
  schema: z.object({
    context: z.enum(['game', 'visualization', 'animation', 'vr', 'general']).optional().default('general'),
    focus: z.enum(['performance', 'quality', 'realism', 'style', 'functionality']).optional().default('quality'),
    maxSuggestions: z.number().int().min(1).max(10).optional().default(5)
  }),
  func: async () => JSON.stringify(ObjectEditorAPI.suggestImprovements(), null, 2)
})

/**
 * Инструмент подсчёта статистики объекта
 */
export const calculateStatsTool = new DynamicStructuredTool({
  name: 'calculate_stats',
  description: 'Подсчитать статистику объекта.',
  schema: z.object({
    includeEstimates: z.boolean().optional().default(true),
    compareWithStandards: z.boolean().optional().default(false)
  }),
  func: async () => JSON.stringify(ObjectEditorAPI.calculateStats(), null, 2)
})

/**
 * Инструмент генерации вариаций объекта
 */
export const generateVariationsTool = new DynamicStructuredTool({
  name: 'generate_variations',
  description: 'Сгенерировать вариации объекта.',
  schema: z.object({
    variationType: z.enum(['scale', 'color', 'structure', 'materials', 'random']),
    count: z.number().int().min(1).max(5).optional().default(3),
    magnitude: z.enum(['subtle', 'moderate', 'dramatic']).optional().default('moderate')
  }),
  func: async ({ count }) => JSON.stringify(ObjectEditorAPI.generateVariations(count), null, 2)
})

