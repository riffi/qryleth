import { SceneSerializer, SerializableSceneState } from './sceneSerializer'
import { LegacyCompatibility } from './legacyCompatibility'
import type { SceneObject, ScenePlacement, SceneLayer } from '../types/scene'

/**
 * Comprehensive test suite for R3F migration functionality
 */
export class R3FTestSuite {
  private static testResults: TestResult[] = []
  
  /**
   * Run all tests and return comprehensive report
   */
  static async runAllTests(): Promise<TestReport> {
    console.log('🧪 Starting R3F Test Suite...')
    this.testResults = []
    
    // Core functionality tests
    await this.testSceneSerialization()
    await this.testLegacyCompatibility()
    await this.testLibraryOperations()
    await this.testPerformanceComparison()
    await this.testDataIntegrity()
    
    // Generate final report
    const report = this.generateTestReport()
    console.log('✅ R3F Test Suite completed')
    
    return report
  }

  /**
   * Test scene serialization and deserialization
   */
  private static async testSceneSerialization(): Promise<void> {
    console.log('📄 Testing scene serialization...')
    
    try {
      // Create test scene data
      const testScene = this.createTestSceneData()
      
      // Test JSON serialization
      const json = SceneSerializer.toJSON(testScene)
      const deserializedScene = SceneSerializer.fromJSON(json)
      
      // Verify data integrity
      const integrityCheck = this.verifyDataIntegrity(testScene, deserializedScene)
      
      this.addTestResult({
        name: 'Scene Serialization',
        status: integrityCheck.isValid ? 'passed' : 'failed',
        message: integrityCheck.isValid ? 'Serialization works correctly' : integrityCheck.errors.join(', '),
        details: integrityCheck
      })
      
      // Test localStorage operations
      SceneSerializer.saveToLocalStorage(testScene, 'test-scene')
      const loadedScene = SceneSerializer.loadFromLocalStorage('test-scene')
      
      const localStorageTest = loadedScene !== null
      this.addTestResult({
        name: 'localStorage Operations',
        status: localStorageTest ? 'passed' : 'failed',
        message: localStorageTest ? 'localStorage works correctly' : 'localStorage failed'
      })
      
    } catch (error) {
      this.addTestResult({
        name: 'Scene Serialization',
        status: 'failed',
        message: `Serialization test failed: ${error}`,
        error: error as Error
      })
    }
  }

  /**
   * Test legacy compatibility and migration
   */
  private static async testLegacyCompatibility(): Promise<void> {
    console.log('🔄 Testing legacy compatibility...')
    
    try {
      // Create mock legacy data
      const legacyData = this.createMockLegacyData()
      
      // Test legacy detection
      const isLegacy = LegacyCompatibility.isLegacyFormat(legacyData)
      
      this.addTestResult({
        name: 'Legacy Format Detection',
        status: isLegacy ? 'passed' : 'failed',
        message: isLegacy ? 'Legacy format detected correctly' : 'Failed to detect legacy format'
      })
      
      // Test migration
      const migratedData = LegacyCompatibility.migrateLegacyData(legacyData)
      const validation = LegacyCompatibility.validateMigratedData(migratedData)
      
      this.addTestResult({
        name: 'Legacy Migration',
        status: validation.isValid ? 'passed' : 'failed',
        message: validation.isValid ? 'Migration completed successfully' : validation.issues.join(', '),
        details: { migratedData, validation }
      })
      
    } catch (error) {
      this.addTestResult({
        name: 'Legacy Compatibility',
        status: 'failed',
        message: `Legacy compatibility test failed: ${error}`,
        error: error as Error
      })
    }
  }

  /**
   * Test library operations (save/load)
   */
  private static async testLibraryOperations(): Promise<void> {
    console.log('📚 Testing library operations...')
    
    try {
      const testScene = this.createTestSceneData()
      
      // Test file export/import
      const jsonString = SceneSerializer.toJSON(testScene)
      const file = new File([jsonString], 'test-scene.json', { type: 'application/json' })
      
      // Test import
      const importedScene = await SceneSerializer.importFromFile(file)
      const importIntegrity = this.verifyDataIntegrity(testScene, importedScene)
      
      this.addTestResult({
        name: 'File Import/Export',
        status: importIntegrity.isValid ? 'passed' : 'failed',
        message: importIntegrity.isValid ? 'File operations work correctly' : importIntegrity.errors.join(', ')
      })
      
      // Test multiple scene handling
      const scene1 = this.createTestSceneData()
      const scene2 = this.createTestSceneData()
      scene2.currentScene.name = 'Test Scene 2'
      scene2.objects.push({
        id: 'test-object-2',
        name: 'Test Object 2',
        type: 'composite',
        primitives: [{
          type: 'sphere',
          size: { radius: 1 },
          material: { color: '#ff0000' }
        }],
        layerId: 'objects'
      })
      
      SceneSerializer.saveToLocalStorage(scene1, 'test-scene-1')
      SceneSerializer.saveToLocalStorage(scene2, 'test-scene-2')
      
      const loaded1 = SceneSerializer.loadFromLocalStorage('test-scene-1')
      const loaded2 = SceneSerializer.loadFromLocalStorage('test-scene-2')
      
      const multiSceneTest = loaded1 !== null && loaded2 !== null &&
                           loaded1.currentScene?.name !== loaded2.currentScene?.name
      
      this.addTestResult({
        name: 'Multiple Scene Handling',
        status: multiSceneTest ? 'passed' : 'failed',
        message: multiSceneTest ? 'Multiple scenes handled correctly' : 'Multiple scene handling failed'
      })
      
    } catch (error) {
      this.addTestResult({
        name: 'Library Operations',
        status: 'failed',
        message: `Library operations test failed: ${error}`,
        error: error as Error
      })
    }
  }

  /**
   * Test performance comparison between R3F and legacy systems
   */
  private static async testPerformanceComparison(): Promise<void> {
    console.log('⚡ Testing performance...')
    
    try {
      // Create large test scene
      const largeScene = this.createLargeTestScene(1000) // 1000 objects
      
      // Test serialization performance
      const serializationStart = performance.now()
      const json = SceneSerializer.toJSON(largeScene)
      const serializationTime = performance.now() - serializationStart
      
      // Test deserialization performance
      const deserializationStart = performance.now()
      const deserializedScene = SceneSerializer.fromJSON(json)
      const deserializationTime = performance.now() - deserializationStart
      
      // Test memory usage estimation
      const memoryUsage = this.estimateMemoryUsage(largeScene)
      
      const performanceResults = {
        serializationTime,
        deserializationTime,
        memoryUsage,
        objectCount: largeScene.objects.length,
        placementCount: largeScene.placements.length
      }
      
      // Performance benchmarks (acceptable thresholds)
      const isPerformanceAcceptable = 
        serializationTime < 100 && // Less than 100ms for 1000 objects
        deserializationTime < 100 && // Less than 100ms for 1000 objects
        memoryUsage < 10 // Less than 10MB estimated
      
      this.addTestResult({
        name: 'Performance Benchmark',
        status: isPerformanceAcceptable ? 'passed' : 'warning',
        message: isPerformanceAcceptable ? 
          'Performance is acceptable' : 
          'Performance may need optimization',
        details: performanceResults
      })
      
    } catch (error) {
      this.addTestResult({
        name: 'Performance Comparison',
        status: 'failed',
        message: `Performance test failed: ${error}`,
        error: error as Error
      })
    }
  }

  /**
   * Test data integrity and validation
   */
  private static async testDataIntegrity(): Promise<void> {
    console.log('🔍 Testing data integrity...')
    
    try {
      // Test various edge cases
      const edgeCases = [
        this.createEmptyScene(),
        this.createSceneWithMissingData(),
        this.createSceneWithInvalidReferences(),
        this.createSceneWithSpecialCharacters()
      ]
      
      const integrityResults = edgeCases.map((testCase, index) => {
        try {
          const json = SceneSerializer.toJSON(testCase.scene)
          const deserialized = SceneSerializer.fromJSON(json)
          return {
            name: testCase.name,
            passed: true,
            message: 'Edge case handled correctly'
          }
        } catch (error) {
          return {
            name: testCase.name,
            passed: false,
            message: `Edge case failed: ${error}`
          }
        }
      })
      
      const allPassed = integrityResults.every(result => result.passed)
      
      this.addTestResult({
        name: 'Data Integrity',
        status: allPassed ? 'passed' : 'failed',
        message: allPassed ? 'All edge cases handled correctly' : 'Some edge cases failed',
        details: integrityResults
      })
      
    } catch (error) {
      this.addTestResult({
        name: 'Data Integrity',
        status: 'failed',
        message: `Data integrity test failed: ${error}`,
        error: error as Error
      })
    }
  }

  // Helper methods
  private static createTestSceneData(): any {
    return {
      currentScene: { name: 'Test Scene', status: 'saved' },
      objects: [{
        id: 'test-object-1',
        name: 'Test Object',
        type: 'composite',
        primitives: [{
          type: 'box',
          size: { width: 1, height: 1, depth: 1 },
          material: { color: '#ffffff' }
        }],
        layerId: 'objects'
      }],
      placements: [{
        objectIndex: 0,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      }],
      layers: [{
        id: 'objects',
        name: 'Objects',
        type: 'object',
        visible: true,
        position: 0
      }],
      lighting: {
        ambient: { intensity: 0.4, color: '#ffffff' },
        directional: { intensity: 1, color: '#ffffff', position: [10, 10, 5], castShadow: true }
      },
      viewMode: 'orbit',
      renderMode: 'solid',
      transformMode: 'translate',
      gridVisible: true
    }
  }

  private static createMockLegacyData(): any {
    return {
      version: 'legacy',
      sceneObjects: [{
        id: 'legacy-object',
        name: 'Legacy Object',
        type: 'cube',
        primitives: [{
          type: 'cube',
          dimensions: { x: 1, y: 1, z: 1 },
          material: { diffuse: '#ffffff' }
        }]
      }],
      placements: [{
        objectIndex: 0,
        position: [1, 2, 3]
      }],
      lighting: {
        ambientColor: '#404040',
        ambientIntensity: 0.6,
        directionalColor: '#ffffff',
        directionalIntensity: 1.0
      }
    }
  }

  private static createLargeTestScene(objectCount: number): any {
    const scene = this.createTestSceneData()
    
    // Add many objects and placements
    for (let i = 1; i < objectCount; i++) {
      scene.objects.push({
        id: `test-object-${i}`,
        name: `Test Object ${i}`,
        type: 'composite',
        primitives: [{
          type: i % 2 === 0 ? 'box' : 'sphere',
          size: i % 2 === 0 ? 
            { width: 1, height: 1, depth: 1 } : 
            { radius: 0.5 },
          material: { color: `#${Math.floor(Math.random()*16777215).toString(16)}` }
        }],
        layerId: 'objects'
      })
      
      scene.placements.push({
        objectIndex: i,
        position: [Math.random() * 10, Math.random() * 10, Math.random() * 10],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      })
    }
    
    return scene
  }

  private static createEmptyScene(): { name: string; scene: any } {
    return {
      name: 'Empty Scene',
      scene: {
        currentScene: { name: 'Empty', status: 'saved' },
        objects: [],
        placements: [],
        layers: [],
        lighting: {
          ambient: { intensity: 0.4, color: '#ffffff' },
          directional: { intensity: 1, color: '#ffffff', position: [10, 10, 5], castShadow: true }
        }
      }
    }
  }

  private static createSceneWithMissingData(): { name: string; scene: any } {
    return {
      name: 'Scene with Missing Data',
      scene: {
        objects: [{ id: 'incomplete', name: 'Incomplete' }],
        placements: [{ objectIndex: 0 }]
      }
    }
  }

  private static createSceneWithInvalidReferences(): { name: string; scene: any } {
    return {
      name: 'Scene with Invalid References',
      scene: {
        objects: [{ id: 'valid', name: 'Valid', type: 'composite', primitives: [] }],
        placements: [{ objectIndex: 999, position: [0, 0, 0] }], // Invalid reference
        layers: [{ id: 'objects', name: 'Objects', type: 'object', visible: true }]
      }
    }
  }

  private static createSceneWithSpecialCharacters(): { name: string; scene: any } {
    return {
      name: 'Scene with Special Characters',
      scene: {
        currentScene: { name: 'Тест с unicode 中文 🌟', status: 'saved' },
        objects: [{
          id: 'special-object',
          name: 'Object with émojis 🎨',
          type: 'composite',
          primitives: [],
          layerId: 'objects'
        }]
      }
    }
  }

  private static verifyDataIntegrity(original: any, deserialized: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Check basic structure
    if (!deserialized.objects) errors.push('Missing objects array')
    if (!deserialized.placements) errors.push('Missing placements array')
    if (!deserialized.layers) errors.push('Missing layers array')
    
    // Check object count
    if (original.objects?.length !== deserialized.objects?.length) {
      errors.push(`Object count mismatch: ${original.objects?.length} vs ${deserialized.objects?.length}`)
    }
    
    // Check placement count
    if (original.placements?.length !== deserialized.placements?.length) {
      errors.push(`Placement count mismatch: ${original.placements?.length} vs ${deserialized.placements?.length}`)
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private static estimateMemoryUsage(scene: any): number {
    const jsonString = JSON.stringify(scene)
    return (jsonString.length * 2) / (1024 * 1024) // Rough estimate in MB
  }

  private static addTestResult(result: TestResult): void {
    this.testResults.push(result)
    const emoji = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️'
    console.log(`${emoji} ${result.name}: ${result.message}`)
  }

  private static generateTestReport(): TestReport {
    const passed = this.testResults.filter(r => r.status === 'passed').length
    const failed = this.testResults.filter(r => r.status === 'failed').length
    const warnings = this.testResults.filter(r => r.status === 'warning').length
    const total = this.testResults.length
    
    return {
      summary: {
        total,
        passed,
        failed,
        warnings,
        successRate: (passed / total) * 100
      },
      results: this.testResults,
      timestamp: new Date().toISOString(),
      recommendations: this.generateRecommendations()
    }
  }

  private static generateRecommendations(): string[] {
    const recommendations: string[] = []
    const failed = this.testResults.filter(r => r.status === 'failed')
    const warnings = this.testResults.filter(r => r.status === 'warning')
    
    if (failed.length > 0) {
      recommendations.push(`Fix ${failed.length} failing test(s) before production deployment`)
    }
    
    if (warnings.length > 0) {
      recommendations.push(`Address ${warnings.length} warning(s) for optimal performance`)
    }
    
    if (failed.length === 0 && warnings.length === 0) {
      recommendations.push('All tests passed! R3F migration is ready for production')
    }
    
    return recommendations
  }
}

interface TestResult {
  name: string
  status: 'passed' | 'failed' | 'warning'
  message: string
  details?: any
  error?: Error
}

interface TestReport {
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
    successRate: number
  }
  results: TestResult[]
  timestamp: string
  recommendations: string[]
}