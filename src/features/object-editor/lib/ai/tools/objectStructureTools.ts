/**
 * AI инструменты для анализа и оптимизации структуры объекта
 */

import type { ToolDefinition } from '@/shared/entities/chat'

export const analyzeObjectTool: ToolDefinition = {
  name: 'analyzeObject',
  description: 'Проанализировать структуру объекта и предложить улучшения',
  parameters: {
    type: 'object',
    properties: {
      analysisType: {
        type: 'string',
        enum: ['structure', 'materials', 'performance', 'aesthetics', 'all'],
        description: 'Тип анализа для проведения'
      },
      detailed: {
        type: 'boolean',
        default: false,
        description: 'Провести детальный анализ с подробными рекомендациями'
      }
    },
    required: ['analysisType']
  }
}

export const optimizeObjectTool: ToolDefinition = {
  name: 'optimizeObject', 
  description: 'Оптимизировать объект для лучшей производительности',
  parameters: {
    type: 'object',
    properties: {
      optimizationType: {
        type: 'string',
        enum: ['geometry', 'materials', 'hierarchy', 'all'],
        description: 'Тип оптимизации'
      },
      aggressiveness: {
        type: 'string',
        enum: ['conservative', 'moderate', 'aggressive'],
        default: 'moderate',
        description: 'Уровень агрессивности оптимизации'
      },
      preserveVisualQuality: {
        type: 'boolean',
        default: true,
        description: 'Сохранять визуальное качество при оптимизации'
      }
    },
    required: ['optimizationType']
  }
}

export const validateObjectTool: ToolDefinition = {
  name: 'validateObject',
  description: 'Проверить объект на корректность и выявить потенциальные проблемы',
  parameters: {
    type: 'object',
    properties: {
      checkTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['geometry', 'materials', 'transforms', 'naming', 'performance']
        },
        default: ['geometry', 'materials', 'transforms'],
        description: 'Типы проверок для выполнения'
      },
      strict: {
        type: 'boolean',
        default: false,
        description: 'Строгий режим проверки'
      }
    }
  }
}

export const suggestImprovementsTool: ToolDefinition = {
  name: 'suggestImprovements',
  description: 'Предложить улучшения для объекта на основе его текущего состояния',
  parameters: {
    type: 'object',
    properties: {
      context: {
        type: 'string',
        enum: ['game', 'visualization', 'animation', 'vr', 'general'],
        default: 'general',
        description: 'Контекст использования объекта'
      },
      focus: {
        type: 'string',
        enum: ['performance', 'quality', 'realism', 'style', 'functionality'],
        default: 'quality',
        description: 'Фокус улучшений'
      },
      maxSuggestions: {
        type: 'number',
        minimum: 1,
        maximum: 10,
        default: 5,
        description: 'Максимальное количество предложений'
      }
    }
  }
}

export const calculateStatsTool: ToolDefinition = {
  name: 'calculateStats',
  description: 'Подсчитать статистику объекта (количество полигонов, материалов, etc.)',
  parameters: {
    type: 'object',
    properties: {
      includeEstimates: {
        type: 'boolean',
        default: true,
        description: 'Включить оценки производительности'
      },
      compareWithStandards: {
        type: 'boolean',
        default: false,
        description: 'Сравнить с индустриальными стандартами'
      }
    }
  }
}

export const generateVariationsTool: ToolDefinition = {
  name: 'generateVariations',
  description: 'Сгенерировать вариации объекта с изменениями',
  parameters: {
    type: 'object',
    properties: {
      variationType: {
        type: 'string',
        enum: ['scale', 'color', 'structure', 'materials', 'random'],
        description: 'Тип вариаций для генерации'
      },
      count: {
        type: 'number',
        minimum: 1,
        maximum: 5,
        default: 3,
        description: 'Количество вариаций'
      },
      magnitude: {
        type: 'string',
        enum: ['subtle', 'moderate', 'dramatic'],
        default: 'moderate',
        description: 'Величина изменений'
      }
    },
    required: ['variationType']
  }
}