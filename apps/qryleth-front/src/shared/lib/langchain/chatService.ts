import { ChatOpenAI } from '@langchain/openai'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { getActiveConnection } from '../openAISettings'
import { createChatModel, DEFAULT_LANGCHAIN_CONFIG } from './config'
import type {LangChainTool, LangChainChatResponse, ChatSession, ToolExecutionResult} from './types'
import { adaptMessagesToLangChain, adaptLangChainResponse } from './adapters'
import type {ChatMessage} from '@/shared/entities/chat'
import { toolRegistry } from './toolRegistry'
import type {GfxObjectWithTransform} from '@/entities'

// Типы для callback функций
export type ToolCallback = (toolName: string, result: any) => void

/**
 * Сервис LangChain для чата с поддержкой инструментов.
 *
 * Особенности:
 * - Идемпотентная инициализация (без повторных подписок/создания модели)
 * - Опциональная авто‑загрузка инструментов из глобального реестра
 * - Безопасная работа при двойном монтировании в React StrictMode (coalesce init)
 */
export const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful assistant that can use tools to interact with a 3D scene. ' +
  'When user wants to add new object to scene, first search existing objects in a library, if not found - create it.' +
  'When creating primitives always generate meaningful Russian names.'

export class LangChainChatService {
  private chatModel: ChatOpenAI | null = null
  private tools: DynamicStructuredTool[] = []
  private toolExecutors: Map<string, (args: any) => Promise<ToolExecutionResult>> = new Map()
  private toolCallback: ToolCallback | null = null
  private systemPrompt: string
  private initialized = false
  private initPromise: Promise<void> | null = null
  private autoLoadToolsFromRegistry: boolean

  /**
   * Создает экземпляр сервиса с указанным системным промптом
   * @param systemPrompt текст системного промпта, который будет использоваться агентом
   */
  constructor(systemPrompt: string = DEFAULT_SYSTEM_PROMPT, options?: { autoLoadToolsFromRegistry?: boolean }) {
    this.systemPrompt = systemPrompt
    this.autoLoadToolsFromRegistry = options?.autoLoadToolsFromRegistry ?? true
  }

  /**
   * Инициализирует сервис чата по текущим настройкам подключения. Идемпотентно.
   * Повторный вызов не приводит к повторной подписке/созданию модели.
   */
  async initialize(): Promise<void> {
    // Если уже инициализирован — ничего не делаем
    if (this.initialized) return
    // Если инициализация уже идёт — ждём её завершения
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      const connection = await getActiveConnection()
      this.chatModel = createChatModel({
        connection,
        ...DEFAULT_LANGCHAIN_CONFIG,
      })

      // Загрузка инструментов из реестра (опционально)
      if (this.autoLoadToolsFromRegistry) {
        this.loadToolsFromRegistry()
        toolRegistry.onToolsChange(() => {
          this.loadToolsFromRegistry()
        })
      }

      this.initialized = true

      // Единоразовый лог успешной инициализации
      if (this.autoLoadToolsFromRegistry) {
        console.log('LangChain сервис инициализирован. Инструменты:', this.getRegisteredTools())
      } else {
        console.log('LangChain сервис (без авто‑реестра) инициализирован.')
      }
    })()

    try {
      await this.initPromise
    } finally {
      this.initPromise = null
    }
  }

  /**
   * Register a tool with its execution function
   */
  registerTool(tool: LangChainTool, executor: (args: any) => Promise<ToolExecutionResult>): void {
    const dynamicTool = new DynamicStructuredTool({
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
      func: async (args: any) => {
        const result = await executor(args)
        if (result.success) {
          return JSON.stringify(result.result)
        } else {
          throw new Error(result.error || 'Tool execution failed')
        }
      },
    })

    this.tools.push(dynamicTool)
    this.toolExecutors.set(tool.name, executor)
  }

  /**
   * Register a DynamicTool instance directly with callback support
   */
  registerDynamicTool(tool: DynamicStructuredTool): void {
    // Wrap the original func to handle callbacks
    const originalFunc = tool.func
    const wrappedTool = new DynamicStructuredTool({
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
      func: async (args: any) => {
        const result = await originalFunc(args)

        // Handle callbacks after tool execution
        this.handleToolResult(tool.name, result)

        return result
      }
    })

    this.tools.push(wrappedTool)
  }

  /**
   * Load all tools from registry
   */
  loadToolsFromRegistry(): void {
    // Clear existing tools first
    this.clearTools()

    // Load all tools from registry
    const allTools = toolRegistry.getAllTools()
    allTools.forEach(tool => {
      this.registerDynamicTool(tool)
    })
  }

  /**
   * Clear all registered tools
   */
  clearTools(): void {
    this.tools = []
    this.toolExecutors.clear()
  }

  /**
   * Send a chat message and get response with tool support
   */
  async chat(messages: ChatMessage[]): Promise<LangChainChatResponse> {
    if (!this.chatModel) {
      throw new Error('Chat service not initialized. Call initialize() first.')
    }
    try {
      // If no tools are registered, use simple chat
      if (this.tools.length === 0) {
        const langChainMessages = adaptMessagesToLangChain(messages)
        const response = await this.chatModel.invoke(langChainMessages)
        return adaptLangChainResponse(response)
      }

      // Create agent with tools
      const prompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          this.systemPrompt
        ],
        ['placeholder', '{chat_history}'],
        ['human', '{input}'],
        ['placeholder', '{agent_scratchpad}'],
      ])


      const agent = await createToolCallingAgent({
        llm: this.chatModel,
        tools: this.tools,
        prompt,
      })

      const agentExecutor = new AgentExecutor({
        agent,
        tools: this.tools,
        verbose: false,
      })

      // Get the last user message as input
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role !== 'user') {
        throw new Error('Last message must be from user')
      }

      // Execute the agent
      const result = await agentExecutor.invoke({
        input: lastMessage.content,
        chat_history: adaptMessagesToLangChain(messages.slice(0, -1)),
      })

      return {
        message: result.output || '',
        finishReason: 'stop',
      }

    } catch (error) {
      console.error('LangChain chat error:', error)
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get list of registered tools for debugging
   */
  getRegisteredTools(): string[] {
    return this.tools.map(tool => tool.name)
  }

  /**
   * Возвращает признак инициализации сервиса.
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Update connection settings and reinitialize
   */
  async updateConnection(): Promise<void> {
    // Сбрасываем только модель под новое подключение, инструменты переиспользуем
    const connection = await getActiveConnection()
    this.chatModel = createChatModel({
      connection,
      ...DEFAULT_LANGCHAIN_CONFIG,
    })
    this.initialized = true
  }

  /**
   * Get the tool registry for external access
   */
  getToolRegistry() {
    return toolRegistry
  }


  /**
   * Set general tool callback
   */
  setToolCallback(callback: ToolCallback | null): void {
    this.toolCallback = callback
  }

  /**
   * Handle tool execution results and trigger callbacks
   */
  private handleToolResult(toolName: string, result: string): void {
    try {
      const parsedResult = JSON.parse(result)

      // Call general tool callback
      if (this.toolCallback) {
        this.toolCallback(toolName, parsedResult)
      }

    } catch (error) {
      console.error('Ошибка обработки результата инструмента:', error)
    }
  }
}

/**
 * Factory function to create new chat service instances
 */
export const createLangChainChatService = (systemPrompt?: string, options?: { autoLoadToolsFromRegistry?: boolean }) => {
  return new LangChainChatService(systemPrompt, options)
}

/**
 * Возвращает синглтон LangChainChatService по ключу. Используется для избежания
 * повторной инициализации в React StrictMode при двойном монтировании компонентов.
 * @param key уникальный ключ фичи (например, 'scene', 'scene-debug', 'object-editor')
 * @param systemPrompt системный промпт для первого создания
 */
const __langchainSingletons = new Map<string, LangChainChatService>()
export const getOrCreateLangChainChatService = (key: string, systemPrompt?: string, options?: { autoLoadToolsFromRegistry?: boolean }) => {
  if (__langchainSingletons.has(key)) {
    return __langchainSingletons.get(key) as LangChainChatService
  }
  const instance = new LangChainChatService(systemPrompt, options)
  __langchainSingletons.set(key, instance)
  return instance
}

/**
 * Признак инициализации сервиса
 */
export type LangChainChatServiceInitState = { isInitialized: boolean }
