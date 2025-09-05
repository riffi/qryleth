import type { TemplateData } from '../../types'

/**
 * Утилита: Тест производительности — замер времени генерации для разных размеров.
 */
export const perfTestTemplate: TemplateData = {
  id: 'perf-test',
  name: 'Тест производительности',
  description: 'Замер времени генерации для разных размеров мира и числа операций.',
  code: `// Тест производительности генерации террейнов
console.log('Запуск теста производительности...')

const testSizes = [
  { name: 'Малый', world: [50, 50], base: [16, 16], ops: 5 },
  { name: 'Средний', world: [100, 100], base: [32, 32], ops: 15 },
  { name: 'Большой', world: [200, 200], base: [64, 64], ops: 30 }
]

for (const test of testSizes) {
  console.log('\nТестирую размер: ' + test.name + ' (' + test.world[0] + 'x' + test.world[1] + ')')
  
  const startTime = Date.now()
  
  const spec = {
    world: { width: test.world[0], depth: test.world[1], edgeFade: 0.1 },
    base: { 
      seed: 555, 
      octaveCount: 3, 
      amplitude: 5, 
      persistence: 0.4, 
      width: test.base[0], 
      height: test.base[1] 
    },
    pool: {
      global: { maxOps: test.ops },
      recipes: [
        { kind: 'hill', count: test.ops, placement: { type: 'uniform' }, radius: [5, 12], intensity: [2, 5] }
      ]
    },
    seed: 555
  }
  
  try {
    const result = await sceneApi.createProceduralLandscape(spec, { 
      name: 'Тест ' + test.name.toLowerCase(), 
      visible: true 
    })
    
    const duration = Date.now() - startTime
    
    if (result.success) {
      console.log('✅ Успешно за ' + duration + 'мс (ID: ' + result.layerId + ')')
    } else {
      console.log('❌ Ошибка: ' + result.error)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.log('❌ Исключение за ' + duration + 'мс: ' + (error as any).message)
  }
}

console.log('\nТест производительности завершен!')`
}
