/**
 * Адаптеры для преобразования ToolDefinition в LangChain DynamicStructuredTool
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import type { ToolDefinition } from '@/shared/entities/chat'

/**
 * Преобразует JSON Schema параметр в Zod схему
 */
function jsonSchemaToZod(schema: any): z.ZodType<any> {
  if (schema.type === 'object') {
    const shape: Record<string, z.ZodType<any>> = {}
    
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties as Record<string, any>)) {
        let zodType = jsonSchemaToZod(prop)
        
        // Проверяем required поля
        if (!schema.required?.includes(key)) {
          zodType = zodType.optional()
        }
        
        shape[key] = zodType
      }
    }
    
    return z.object(shape)
  }
  
  if (schema.type === 'array') {
    const itemSchema = schema.items ? jsonSchemaToZod(schema.items) : z.any()
    let arraySchema = z.array(itemSchema)
    
    if (schema.minItems) {
      arraySchema = arraySchema.min(schema.minItems)
    }
    if (schema.maxItems) {
      arraySchema = arraySchema.max(schema.maxItems)
    }
    
    return arraySchema
  }
  
  if (schema.type === 'string') {
    let stringSchema = z.string()
    
    if (schema.enum) {
      stringSchema = z.enum(schema.enum)
    }
    if (schema.pattern) {
      stringSchema = stringSchema.regex(new RegExp(schema.pattern))
    }
    
    return stringSchema
  }
  
  if (schema.type === 'number') {
    let numberSchema = z.number()
    
    if (schema.minimum !== undefined) {
      numberSchema = numberSchema.min(schema.minimum)
    }
    if (schema.maximum !== undefined) {
      numberSchema = numberSchema.max(schema.maximum)
    }
    
    return numberSchema
  }
  
  if (schema.type === 'boolean') {
    return z.boolean()
  }
  
  // Fallback
  return z.any()
}

/**
 * Преобразует ToolDefinition в LangChain DynamicStructuredTool
 */
export function createLangChainTool(
  toolDef: ToolDefinition, 
  handler: (args: any) => Promise<string> | string
): DynamicStructuredTool {
  const zodSchema = jsonSchemaToZod(toolDef.parameters)
  
  return new DynamicStructuredTool({
    name: toolDef.name,
    description: toolDef.description,
    schema: zodSchema,
    func: handler
  })
}

/**
 * Создает набор LangChain tools из массива ToolDefinition
 */
export function createLangChainTools(
  toolDefs: ToolDefinition[],
  handlers: Record<string, (args: any) => Promise<string> | string>
): DynamicStructuredTool[] {
  return toolDefs.map(toolDef => {
    const handler = handlers[toolDef.name]
    if (!handler) {
      throw new Error(`Handler not found for tool: ${toolDef.name}`)
    }
    return createLangChainTool(toolDef, handler)
  })
}