import { getActiveConnection } from './openAISettings'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface Tool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required: string[]
    }
  }
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ChatResponse {
  message: string
  toolCalls?: ToolCall[]
  finishReason: 'stop' | 'tool_calls' | 'length'
}

// Define available tools
export const AVAILABLE_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'add_new_object',
      description: 'Добавляет новый объект в текущую сцену',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Название объекта (например, Дерево, Человек, Стол)'
          },
          primitives: {
            type: 'array',
            description: 'Массив графических примитивов, составляющих объект',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['box', 'sphere', 'cylinder', 'cone', 'pyramid', 'plane'],
                  description: 'Тип примитива'
                },
                // Box parameters
                width: {
                  type: 'number',
                  description: 'Ширина для box (в метрах)'
                },
                height: {
                  type: 'number',
                  description: 'Высота для box, cylinder, cone, pyramid (в метрах)'
                },
                depth: {
                  type: 'number',
                  description: 'Глубина для box (в метрах)'
                },
                // Sphere parameters
                radius: {
                  type: 'number',
                  description: 'Радиус для sphere, cone (в метрах)'
                },
                // Cylinder parameters
                radiusTop: {
                  type: 'number',
                  description: 'Радиус верха для cylinder (в метрах)'
                },
                radiusBottom: {
                  type: 'number',
                  description: 'Радиус низа для cylinder (в метрах)'
                },
                radialSegments: {
                  type: 'number',
                  description: 'Количество сегментов для cylinder, cone'
                },
                // Pyramid parameters
                baseSize: {
                  type: 'number',
                  description: 'Размер основания для pyramid (в метрах)'
                },
                // Material properties
                color: {
                  type: 'string',
                  description: 'Цвет в формате hex (#ffffff)'
                },
                opacity: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Прозрачность от 0 до 1'
                },
                emissive: {
                  type: 'string',
                  description: 'Цвет свечения в формате hex'
                },
                emissiveIntensity: {
                  type: 'number',
                  minimum: 0,
                  description: 'Интенсивность свечения (по умолчанию 1)'
                },
                // Transform properties
                position: {
                  type: 'array',
                  items: { type: 'number' },
                  minItems: 3,
                  maxItems: 3,
                  description: 'Позиция примитива относительно центра составного объекта [x, y, z]'
                },
                rotation: {
                  type: 'array',
                  items: { type: 'number' },
                  minItems: 3,
                  maxItems: 3,
                  description: 'Поворот примитива в радианах [x, y, z]'
                }
              },
              required: ['type']
            }
          },
          position: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'Позиция объекта в сцене [x, y, z]'
          },
          rotation: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'Поворот объекта [x, y, z] в радианах'
          },
          scale: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'Масштаб объекта [x, y, z]'
          }
        },
        required: ['name', 'primitives']
      }
    }
  }
]


export async function fetchWithTools(messages: ChatMessage[], tools?: Tool[]): Promise<ChatResponse> {
  const { url, model, apiKey } = await getActiveConnection()

  const body: any = {
    model,
    messages: messages.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    max_tokens: 4000,
    temperature: 0.7,
    reasoning: { exclude: true }
  }

  // Add tools if provided
  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const response = await fetch(`${url}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`OpenRouter error ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  const choice = data.choices?.[0]

  if (!choice) {
    throw new Error('No response from API')
  }

  const message = choice.message
  const finishReason = choice.finish_reason

  // Handle tool calls
  if (message.tool_calls && message.tool_calls.length > 0) {
    return {
      message: message.content || '',
      toolCalls: message.tool_calls.map((tc: any) => ({
        id: tc.id,
        type: tc.type,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      })),
      finishReason: finishReason
    }
  }

  // Regular text response
  return {
    message: message.content || '',
    finishReason: finishReason
  }
}
