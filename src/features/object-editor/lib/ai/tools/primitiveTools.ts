/**
 * AI инструменты для работы с примитивами в ObjectEditor
 */

import type { ToolDefinition } from '@/shared/entities/chat'

export const addPrimitivesTool: ToolDefinition = {
  name: 'addPrimitives',
  description: 'Добавить один или несколько примитивов к объекту (массовая операция)',
  parameters: {
    type: 'object',
    properties: {
      primitives: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            primitiveType: { 
              type: 'string',
              enum: ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane'],
              description: 'Тип примитива'
            },
            position: { 
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                z: { type: 'number' }
              },
              required: ['x', 'y', 'z'],
              description: 'Позиция примитива в пространстве'
            },
            rotation: { 
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                z: { type: 'number' }
              },
              required: ['x', 'y', 'z'],
              description: 'Поворот примитива (в радианах)'
            },
            scale: { 
              type: 'object',
              properties: {
                x: { type: 'number', minimum: 0.1 },
                y: { type: 'number', minimum: 0.1 },
                z: { type: 'number', minimum: 0.1 }
              },
              required: ['x', 'y', 'z'],
              description: 'Масштабирование примитива'
            },
            materialUuid: { 
              type: 'string',
              description: 'UUID материала (опционально)'
            },
            name: {
              type: 'string',
              description: 'Название примитива (опционально)'
            }
          },
          required: ['primitiveType']
        },
        minItems: 1,
        maxItems: 10,
        description: 'Массив примитивов для добавления'
      }
    },
    required: ['primitives']
  }
}

export const modifyPrimitiveTool: ToolDefinition = {
  name: 'modifyPrimitive',
  description: 'Изменить существующий примитив по индексу',
  parameters: {
    type: 'object',
    properties: {
      index: {
        type: 'number',
        minimum: 0,
        description: 'Индекс примитива в массиве'
      },
      updates: {
        type: 'object',
        properties: {
          position: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              z: { type: 'number' }
            }
          },
          rotation: {
            type: 'object', 
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              z: { type: 'number' }
            }
          },
          scale: {
            type: 'object',
            properties: {
              x: { type: 'number', minimum: 0.1 },
              y: { type: 'number', minimum: 0.1 },
              z: { type: 'number', minimum: 0.1 }
            }
          },
          materialUuid: { type: 'string' },
          name: { type: 'string' },
          visible: { type: 'boolean' }
        },
        description: 'Объект с обновлениями для примитива'
      }
    },
    required: ['index', 'updates']
  }
}

export const removePrimitiveTool: ToolDefinition = {
  name: 'removePrimitive',
  description: 'Удалить примитив по индексу',
  parameters: {
    type: 'object',
    properties: {
      index: {
        type: 'number',
        minimum: 0,
        description: 'Индекс примитива для удаления'
      }
    },
    required: ['index']
  }
}

export const duplicatePrimitiveTool: ToolDefinition = {
  name: 'duplicatePrimitive',
  description: 'Дублировать примитив с возможностью смещения',
  parameters: {
    type: 'object',
    properties: {
      index: {
        type: 'number',
        minimum: 0,
        description: 'Индекс примитива для дублирования'
      },
      offset: {
        type: 'object',
        properties: {
          x: { type: 'number', default: 1 },
          y: { type: 'number', default: 0 },
          z: { type: 'number', default: 0 }
        },
        description: 'Смещение дублированного примитива'
      },
      count: {
        type: 'number',
        minimum: 1,
        maximum: 10,
        default: 1,
        description: 'Количество копий'
      }
    },
    required: ['index']
  }
}