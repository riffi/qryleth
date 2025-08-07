import type { DynamicStructuredTool } from '@langchain/core/tools'
import type { ToolProvider, ToolRegistrationEvent, ToolRegistry } from './types'

/**
 * Implementation of tool registry for dynamic tool registration
 */
class ToolRegistryImpl implements ToolRegistry {
  private providers = new Map<string, ToolProvider>()
  private changeCallbacks: Array<(event: ToolRegistrationEvent) => void> = []

  /**
   * Register a tool provider
   */
  registerProvider(provider: ToolProvider): void {
    if (this.providers.has(provider.featureName)) {
      console.warn(`Tool provider '${provider.featureName}' is already registered. Overwriting.`)
    }
    
    this.providers.set(provider.featureName, provider)
    
    // Notify subscribers
    const event: ToolRegistrationEvent = {
      type: 'register',
      provider
    }
    this.changeCallbacks.forEach(callback => callback(event))
  }

  /**
   * Unregister a tool provider
   */
  unregisterProvider(featureName: string): void {
    const provider = this.providers.get(featureName)
    if (!provider) {
      console.warn(`Tool provider '${featureName}' is not registered`)
      return
    }
    
    this.providers.delete(featureName)
    
    // Notify subscribers
    const event: ToolRegistrationEvent = {
      type: 'unregister',
      provider
    }
    this.changeCallbacks.forEach(callback => callback(event))
  }

  /**
   * Get all registered tools
   */
  getAllTools(): DynamicStructuredTool[] {
    const allTools: DynamicStructuredTool[] = []
    
    for (const provider of this.providers.values()) {
      try {
        const tools = provider.getTools()
        allTools.push(...tools)
      } catch (error) {
        console.error(`Error getting tools from provider '${provider.featureName}':`, error)
      }
    }
    
    return allTools
  }

  /**
   * Get tools from specific feature
   */
  getToolsByFeature(featureName: string): DynamicStructuredTool[] {
    const provider = this.providers.get(featureName)
    if (!provider) {
      return []
    }
    
    try {
      return provider.getTools()
    } catch (error) {
      console.error(`Error getting tools from provider '${featureName}':`, error)
      return []
    }
  }

  /**
   * Subscribe to tool registration events
   */
  onToolsChange(callback: (event: ToolRegistrationEvent) => void): void {
    this.changeCallbacks.push(callback)
  }

  /**
   * Get list of registered feature names
   */
  getRegisteredFeatures(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Clear all providers (for testing)
   */
  clear(): void {
    const features = Array.from(this.providers.keys())
    features.forEach(feature => this.unregisterProvider(feature))
  }
}

/**
 * Global tool registry instance
 */
export const toolRegistry = new ToolRegistryImpl()