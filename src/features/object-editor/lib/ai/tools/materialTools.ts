/**
 * AI инструменты для работы с материалами в ObjectEditor
 */

import type { ToolDefinition } from '@/shared/entities/chat'

export const createMaterialTool: ToolDefinition = {
  name: 'createMaterial',
  description: 'Создать новый материал для объекта',
  parameters: {
    type: 'object',
    properties: {
      name: { 
        type: 'string',
        description: 'Название материала'
      },
      color: { 
        type: 'string',
        pattern: '^#[0-9A-Fa-f]{6}$',
        description: 'Цвет материала в формате HEX (#RRGGBB)'
      },
      metalness: { 
        type: 'number', 
        minimum: 0, 
        maximum: 1,
        description: 'Металличность материала (0-1)'
      },
      roughness: { 
        type: 'number', 
        minimum: 0, 
        maximum: 1,
        description: 'Шероховатость материала (0-1)'
      },
      opacity: { 
        type: 'number', 
        minimum: 0, 
        maximum: 1,
        default: 1,
        description: 'Прозрачность материала (0-1)'
      },
      emissive: {
        type: 'string',
        pattern: '^#[0-9A-Fa-f]{6}$',
        description: 'Цвет свечения материала в формате HEX (опционально)'
      },
      emissiveIntensity: {
        type: 'number',
        minimum: 0,
        maximum: 10,
        default: 0,
        description: 'Интенсивность свечения (0-10)'
      }
    },
    required: ['name', 'color']
  }
}

export const updateMaterialTool: ToolDefinition = {
  name: 'updateMaterial',
  description: 'Обновить существующий материал',
  parameters: {
    type: 'object',
    properties: {
      materialUuid: {
        type: 'string',
        description: 'UUID материала для обновления'
      },
      updates: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          color: { 
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$'
          },
          metalness: { type: 'number', minimum: 0, maximum: 1 },
          roughness: { type: 'number', minimum: 0, maximum: 1 },
          opacity: { type: 'number', minimum: 0, maximum: 1 },
          emissive: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$'
          },
          emissiveIntensity: {
            type: 'number',
            minimum: 0,
            maximum: 10
          }
        },
        description: 'Объект с обновлениями для материала'
      }
    },
    required: ['materialUuid', 'updates']
  }
}

export const assignMaterialTool: ToolDefinition = {
  name: 'assignMaterial',
  description: 'Назначить материал примитиву или группе примитивов',
  parameters: {
    type: 'object',
    properties: {
      materialUuid: {
        type: 'string',
        description: 'UUID материала для назначения'
      },
      primitiveIndices: {
        type: 'array',
        items: {
          type: 'number',
          minimum: 0
        },
        minItems: 1,
        description: 'Массив индексов примитивов для назначения материала'
      }
    },
    required: ['materialUuid', 'primitiveIndices']
  }
}

export const removeMaterialTool: ToolDefinition = {
  name: 'removeMaterial',
  description: 'Удалить материал из объекта',
  parameters: {
    type: 'object',
    properties: {
      materialUuid: {
        type: 'string',
        description: 'UUID материала для удаления'
      },
      replacementMaterialUuid: {
        type: 'string',
        description: 'UUID материала-замены для примитивов, использующих удаляемый материал (опционально)'
      }
    },
    required: ['materialUuid']
  }
}

export const duplicateMaterialTool: ToolDefinition = {
  name: 'duplicateMaterial',
  description: 'Дублировать существующий материал с изменениями',
  parameters: {
    type: 'object',
    properties: {
      sourceMaterialUuid: {
        type: 'string',
        description: 'UUID исходного материала'
      },
      newName: {
        type: 'string',
        description: 'Название нового материала'
      },
      modifications: {
        type: 'object',
        properties: {
          color: { 
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$'
          },
          metalness: { type: 'number', minimum: 0, maximum: 1 },
          roughness: { type: 'number', minimum: 0, maximum: 1 },
          opacity: { type: 'number', minimum: 0, maximum: 1 },
          emissive: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$'
          },
          emissiveIntensity: {
            type: 'number',
            minimum: 0,
            maximum: 10
          }
        },
        description: 'Изменения для применения к дублированному материалу'
      }
    },
    required: ['sourceMaterialUuid', 'newName']
  }
}