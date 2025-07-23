import { ChatOpenAI } from '@langchain/openai'
import { DynamicTool } from '@langchain/core/tools'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { getActiveConnection } from '../openAISettings'
import { createChatModel, DEFAULT_LANGCHAIN_CONFIG } from './config'
import type {LangChainTool, LangChainChatResponse, ChatSession, ToolExecutionResult} from './types'
import { adaptMessagesToLangChain, adaptLangChainResponse } from './adapters'
import type {ChatMessage} from '../openAIAPI'
import { getAllSceneTools } from './tools'
import type {GFXObjectWithTransform} from '@/entities'

// Типы для callback функций
export type ToolCallback = (toolName: string, result: any) => void
export type ObjectAddedCallback = (object: GFXObjectWithTransform) => void

/**
 * LangChain chat service for handling AI conversations with tools
 */
export class LangChainChatService {
  private chatModel: ChatOpenAI | null = null
  private tools: DynamicTool[] = []
  private toolExecutors: Map<string, (args: any) => Promise<ToolExecutionResult>> = new Map()
  private objectAddedCallback: ObjectAddedCallback | null = null
  private toolCallback: ToolCallback | null = null

  /**
   * Initialize the chat service with current connection settings
   */
  async initialize(): Promise<void> {
    const connection = await getActiveConnection()
    this.chatModel = createChatModel({
      connection,
      ...DEFAULT_LANGCHAIN_CONFIG,
    })

    // Auto-register scene tools
    this.registerSceneTools()
  }

  /**
   * Register a tool with its execution function
   */
  registerTool(tool: LangChainTool, executor: (args: any) => Promise<ToolExecutionResult>): void {
    const dynamicTool = new DynamicTool({
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
  registerDynamicTool(tool: DynamicTool): void {
    // Wrap the original func to handle callbacks
    const originalFunc = tool.func
    const wrappedTool = new DynamicTool({
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
   * Register all scene tools
   */
  registerSceneTools(): void {
    // Clear existing tools first
    this.clearTools()

    // Register all scene tools
    const sceneTools = getAllSceneTools()
    sceneTools.forEach(tool => {
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
        ['system', 'You are a helpful assistant that can use tools to interact with a 3D scene.'],
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
   * Update connection settings and reinitialize
   */
  async updateConnection(): Promise<void> {
    await this.initialize()
  }

  /**
   * Set callback for object added events
   */
  setObjectAddedCallback(callback: ObjectAddedCallback | null): void {
    this.objectAddedCallback = callback
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

      // Handle specific tool results
      if (toolName === 'add_new_object' && parsedResult.success && parsedResult.object) {
        if (this.objectAddedCallback) {
          this.objectAddedCallback(parsedResult.object)
        }
      }
    } catch (error) {
      console.error('Ошибка обработки результата инструмента:', error)
    }
  }
}

/**
 * Global instance of the chat service
 */
export const langChainChatService = new LangChainChatService()
