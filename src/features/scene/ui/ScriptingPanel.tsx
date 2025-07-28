import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Box, Button, Group, Text, Tooltip, Select, Modal, TextInput, Menu, ActionIcon, Paper, Stack } from '@mantine/core'
import { IconPlayerPlay, IconCode, IconDeviceFloppy, IconFolderOpen, IconDotsVertical, IconTrash, IconEdit, IconInfoCircle } from '@tabler/icons-react'
import { SceneAPI } from '../lib/sceneAPI'
import { db, type ScriptRecord } from '@/shared/lib/database'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'
import { oneDark } from '@codemirror/theme-one-dark'

interface ScriptingPanelProps {
  height?: number | string
}

export const ScriptingPanel: React.FC<ScriptingPanelProps> = ({ height = 800 }) => {
  const [script, setScript] = useState(`// Пример использования SceneAPI
const overview = sceneApi.getSceneOverview()
console.log('Объектов в сцене:', overview.totalObjects)
console.log('Экземпляров:', overview.totalInstances)

// Получить все объекты
const objects = sceneApi.getSceneObjects()
objects.forEach(obj => {
  console.log(\`Объект: \${obj.name}, примитивов: \${obj.primitiveCount}\`)
})

// Создать экземпляр первого объекта (если есть)
if (objects.length > 0) {
  const result = sceneApi.addObjectInstance(
    objects[0].uuid,
    [2, 0, 2], // position
    [0, 0, 0], // rotation
    [1, 1, 1]  // scale
  )
  console.log('Результат создания экземпляра:', result)
}`)

  // Состояния для работы со скриптами
  const [savedScripts, setSavedScripts] = useState<ScriptRecord[]>([])
  const [selectedScriptUuid, setSelectedScriptUuid] = useState<string | null>(null)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [saveScriptName, setSaveScriptName] = useState('')
  const [saveScriptDescription, setSaveScriptDescription] = useState('')
  const [currentScriptUuid, setCurrentScriptUuid] = useState<string | null>(null)

  // Состояния для подсказок типов
  const [currentMethodInfo, setCurrentMethodInfo] = useState<string | null>(null)
  const [cursorPosition, setCursorPosition] = useState<{ line: number; ch: number } | null>(null)
  const editorRef = useRef<any>(null)

  // Загрузка сохранённых скриптов при монтировании
  useEffect(() => {
    loadSavedScripts()
  }, [])

  // Функция для анализа текущего контекста и определения метода
  const analyzeCurrentContext = useCallback((text: string, cursorPos: number) => {
    const beforeCursor = text.substring(0, cursorPos)
    
    // Поиск вызова метода sceneApi
    const sceneApiPattern = /sceneApi\.(\w+)\s*\(/g
    let match
    let lastMatch = null
    
    while ((match = sceneApiPattern.exec(beforeCursor)) !== null) {
      lastMatch = match
    }
    
    if (lastMatch) {
      const methodName = lastMatch[1]
      const methodStartPos = lastMatch.index + lastMatch[0].length - 1 // позиция открывающей скобки
      
      // Проверяем, находится ли курсор внутри скобок этого метода
      const afterMethodStart = text.substring(methodStartPos)
      let parenCount = 0
      let insideMethod = false
      
      for (let i = 0; i < afterMethodStart.length; i++) {
        const char = afterMethodStart[i]
        if (char === '(') {
          parenCount++
          if (parenCount === 1) insideMethod = true
        } else if (char === ')') {
          parenCount--
          if (parenCount === 0) {
            // Проверяем, находится ли курсор до этой закрывающей скобки
            if (cursorPos <= methodStartPos + i) {
              insideMethod = true
            } else {
              insideMethod = false
            }
            break
          }
        }
      }
      
      if (insideMethod) {
        return getMethodInfo(methodName)
      }
    }
    
    return null
  }, [])

  // Функция для получения информации о методе
  const getMethodInfo = useCallback((methodName: string) => {
    const methodInfoMap: Record<string, string> = {
      'getSceneOverview': `getSceneOverview(): SceneOverview
Возвращает: {
  totalObjects: number,
  totalInstances: number,
  objects: SceneObjectInfo[],
  instances: SceneInstanceInfo[],
  sceneName: string,
  layers: Array<{id, name, visible, objectCount}>
}`,
      'getSceneObjects': `getSceneObjects(): SceneObjectInfo[]
Возвращает массив объектов сцены`,
      'getSceneInstances': `getSceneInstances(): SceneInstanceInfo[]
Возвращает массив экземпляров объектов`,
      'findObjectByUuid': `findObjectByUuid(uuid: string): SceneObject | null
Параметры:
  uuid: string - UUID объекта для поиска`,
      'findObjectByName': `findObjectByName(name: string): SceneObject | null
Параметры:
  name: string - Имя объекта (частичное совпадение)`,
      'addObjectInstance': `addObjectInstance(objectUuid, position?, rotation?, scale?, visible?): AddInstanceResult
Параметры:
  objectUuid: string - UUID существующего объекта
  position?: Vector3 = [0, 0, 0] - Позиция [x, y, z]
  rotation?: Vector3 = [0, 0, 0] - Поворот [x, y, z] в радианах
  scale?: Vector3 = [1, 1, 1] - Масштаб [x, y, z]
  visible?: boolean = true - Видимость экземпляра`,
      'addSingleObjectInstance': `addSingleObjectInstance(objectUuid, params): AddInstancesResult
Параметры:
  objectUuid: string - UUID объекта
  params: InstanceCreationParams = {
    position?: Vector3,
    rotation?: Vector3,
    scale?: Vector3,
    visible?: boolean
  }`,
      'addObjectInstances': `addObjectInstances(objectUuid, instances): AddInstancesResult
Параметры:
  objectUuid: string - UUID объекта
  instances: InstanceCreationParams[] - Массив параметров`,
      'addRandomObjectInstances': `addRandomObjectInstances(objectUuid, count, options?): AddInstancesResult
Параметры:
  objectUuid: string - UUID объекта
  count: number - Количество экземпляров
  options?: {
    rotation?: Vector3,
    scale?: Vector3,
    visible?: boolean,
    alignToTerrain?: boolean
  }`,
      'getAvailableLayers': `getAvailableLayers(): Array<LayerInfo>
Возвращает массив доступных слоев`,
      'canAddInstance': `canAddInstance(objectUuid: string): boolean
Параметры:
  objectUuid: string - UUID объекта для проверки`,
      'getSceneStats': `getSceneStats(): SceneStats
Возвращает статистику сцены`,
      'addObjectWithTransform': `addObjectWithTransform(objectData: GFXObjectWithTransform): AddObjectWithTransformResult
Параметры:
  objectData: GFXObjectWithTransform - Данные объекта с трансформацией`,
      'searchObjectsInLibrary': `searchObjectsInLibrary(query: string): Promise<ObjectRecord[]>
Параметры:
  query: string - Строка поиска`,
      'addObjectFromLibrary': `addObjectFromLibrary(objectUuid, layerId, transform?): Promise<AddObjectResult>
Параметры:
  objectUuid: string - UUID объекта в библиотеке
  layerId: string - ID слоя для размещения
  transform?: Transform - Опциональная трансформация`,
      'adjustInstancesForPerlinTerrain': `adjustInstancesForPerlinTerrain(perlinLayerId: string): TerrainAdjustResult
Параметры:
  perlinLayerId: string - ID слоя с Perlin ландшафтом`
    }
    
    return methodInfoMap[methodName] || null
  }, [])

  const loadSavedScripts = useCallback(async () => {
    try {
      const scripts = await db.getAllScripts()
      setSavedScripts(scripts)
    } catch (error) {
      console.error('Ошибка загрузки скриптов:', error)
    }
  }, [])

  const handleSaveScript = useCallback(async () => {
    if (!saveScriptName.trim()) return

    try {
      if (currentScriptUuid) {
        // Обновляем существующий скрипт
        await db.updateScript(currentScriptUuid, {
          name: saveScriptName,
          description: saveScriptDescription || undefined,
          content: script
        })
        console.log('✓ Скрипт обновлён')
      } else {
        // Создаём новый скрипт
        const uuid = await db.saveScript(saveScriptName, script, saveScriptDescription || undefined)
        setCurrentScriptUuid(uuid)
        console.log('✓ Скрипт сохранён')
      }
      
      await loadSavedScripts() // Обновляем список
      setIsSaveModalOpen(false)
      setSaveScriptName('')
      setSaveScriptDescription('')
    } catch (error) {
      if (error instanceof Error && error.name === 'DuplicateNameError') {
        console.error('Ошибка: Скрипт с таким именем уже существует')
      } else {
        console.error('Ошибка сохранения скрипта:', error)
      }
    }
  }, [saveScriptName, saveScriptDescription, script, currentScriptUuid, loadSavedScripts])

  const handleLoadScript = useCallback(async (scriptUuid: string) => {
    try {
      const scriptRecord = await db.getScript(scriptUuid)
      if (scriptRecord) {
        setScript(scriptRecord.content)
        setCurrentScriptUuid(scriptRecord.uuid)
        setSelectedScriptUuid(scriptUuid)
        console.log('✓ Скрипт загружен:', scriptRecord.name)
      }
    } catch (error) {
      console.error('Ошибка загрузки скрипта:', error)
    }
  }, [])

  const handleDeleteScript = useCallback(async (scriptUuid: string) => {
    try {
      await db.deleteScript(scriptUuid)
      await loadSavedScripts()
      
      // Если удаляемый скрипт был выбран, очищаем выбор
      if (currentScriptUuid === scriptUuid) {
        setCurrentScriptUuid(null)
        setSelectedScriptUuid(null)
      }
      
      console.log('✓ Скрипт удалён')
    } catch (error) {
      console.error('Ошибка удаления скрипта:', error)
    }
  }, [currentScriptUuid, loadSavedScripts])

  const handleNewScript = useCallback(() => {
    setScript('')
    setCurrentScriptUuid(null)
    setSelectedScriptUuid(null)
  }, [])

  const openSaveModal = useCallback(() => {
    if (currentScriptUuid) {
      // Редактируем существующий скрипт
      const currentScript = savedScripts.find(s => s.uuid === currentScriptUuid)
      if (currentScript) {
        setSaveScriptName(currentScript.name)
        setSaveScriptDescription(currentScript.description || '')
      }
    } else {
      // Создаём новый скрипт
      setSaveScriptName('')
      setSaveScriptDescription('')
    }
    setIsSaveModalOpen(true)
  }, [currentScriptUuid, savedScripts])

  // Функция для извлечения переменных из кода
  const extractVariablesFromScript = useCallback((scriptText: string) => {
    const variables = new Set<string>()
    
    // Регулярные выражения для поиска объявлений переменных
    const patterns = [
      /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,  // const/let/var declarations
      /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,                    // assignments
      /for\s*\(\s*(?:const|let|var)?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // for loops
      /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,             // function declarations
      /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*/g,                // arrow functions
      /\.forEach\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g,       // forEach callbacks
      /\.map\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g,           // map callbacks
      /\.filter\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g,        // filter callbacks
      /catch\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g            // catch blocks
    ]
    
    patterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(scriptText)) !== null) {
        const varName = match[1]
        if (varName && !['true', 'false', 'null', 'undefined', 'this'].includes(varName)) {
          variables.add(varName)
        }
      }
    })
    
    return Array.from(variables)
  }, [])

  // Функция для получения переменных из контекста API
  const getApiVariables = useCallback(() => {
    try {
      const overview = SceneAPI.getSceneOverview()
      const apiVars = []
      
      // Добавляем переменные из overview
      if (overview.objects.length > 0) {
        apiVars.push({
          label: 'overview',
          type: 'variable',
          info: 'Обзор сцены с объектами и экземплярами'
        })
      }
      
      // Добавляем информацию об объектах
      overview.objects.forEach((obj, index) => {
        if (index < 10) { // Ограничиваем количество для производительности
          apiVars.push({
            label: `object_${obj.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
            type: 'variable',
            info: `Объект "${obj.name}" (UUID: ${obj.uuid})`
          })
        }
      })
      
      return apiVars
    } catch {
      return []
    }
  }, [])

  // Расширенный автокомплит с поддержкой переменных
  const enhancedCompletions = useCallback((context: CompletionContext) => {
    const word = context.matchBefore(/\w*/)
    if (!word) return null
    if (word.from === word.to && !context.explicit) return null

    // Получаем текущий код для анализа переменных
    const currentScript = context.state.doc.toString()
    const beforeWord = context.state.doc.sliceString(Math.max(0, word.from - 10), word.from)
    
    const isAfterSceneApi = beforeWord.endsWith('sceneApi.')
    const isAfterConsole = beforeWord.endsWith('console.')
    const isAfterDot = beforeWord.endsWith('.')

    let completions = []

    if (isAfterSceneApi) {
      // Если автокомплит после "sceneApi.", показываем только методы с детальными подсказками типов
      completions = [
        { 
          label: 'getSceneOverview', 
          type: 'function', 
          info: `getSceneOverview(): SceneOverview
Возвращает: {
  totalObjects: number,
  totalInstances: number,
  objects: SceneObjectInfo[],
  instances: SceneInstanceInfo[],
  sceneName: string,
  layers: Array<{id, name, visible, objectCount}>
}
Описание: Получить общую информацию о сцене с объектами, экземплярами и слоями` 
        },
        { 
          label: 'getSceneObjects', 
          type: 'function', 
          info: `getSceneObjects(): SceneObjectInfo[]
Возвращает: Array<{
  uuid: string,
  name: string,
  layerId?: string,
  visible?: boolean,
  libraryUuid?: string,
  boundingBox?: BoundingBox,
  primitiveCount: number,
  primitiveTypes: string[],
  hasInstances: boolean,
  instanceCount: number
}>
Описание: Получить список всех объектов сцены` 
        },
        { 
          label: 'getSceneInstances', 
          type: 'function', 
          info: `getSceneInstances(): SceneInstanceInfo[]
Возвращает: Array<{
  uuid: string,
  objectUuid: string,
  objectName: string,
  transform?: Transform,
  visible?: boolean
}>
Описание: Получить список всех экземпляров объектов` 
        },
        { 
          label: 'findObjectByUuid', 
          type: 'function', 
          info: `findObjectByUuid(uuid: string): SceneObject | null
Параметры:
  uuid: string - UUID объекта для поиска
Возвращает: SceneObject | null
Описание: Найти объект по UUID` 
        },
        { 
          label: 'findObjectByName', 
          type: 'function', 
          info: `findObjectByName(name: string): SceneObject | null
Параметры:
  name: string - Имя объекта для поиска (частичное совпадение)
Возвращает: SceneObject | null
Описание: Найти объект по имени (первый найденный)` 
        },
        { 
          label: 'addObjectInstance', 
          type: 'function', 
          info: `addObjectInstance(objectUuid, position?, rotation?, scale?, visible?): AddInstanceResult
Параметры:
  objectUuid: string - UUID существующего объекта
  position?: Vector3 = [0, 0, 0] - Позиция [x, y, z]
  rotation?: Vector3 = [0, 0, 0] - Поворот [x, y, z] в радианах
  scale?: Vector3 = [1, 1, 1] - Масштаб [x, y, z]
  visible?: boolean = true - Видимость экземпляра
Возвращает: {success: boolean, instanceUuid?: string, objectUuid?: string, error?: string}
Описание: Добавить экземпляр объекта` 
        },
        { 
          label: 'addSingleObjectInstance', 
          type: 'function', 
          info: `addSingleObjectInstance(objectUuid, params): AddInstancesResult
Параметры:
  objectUuid: string - UUID объекта
  params: InstanceCreationParams = {
    position?: Vector3,
    rotation?: Vector3,
    scale?: Vector3,
    visible?: boolean
  }
Возвращает: {success: boolean, instanceCount: number, instances?: CreatedInstanceInfo[], errors?: string[], error?: string}
Описание: Добавить один экземпляр с BoundingBox` 
        },
        { 
          label: 'addObjectInstances', 
          type: 'function', 
          info: `addObjectInstances(objectUuid, instances): AddInstancesResult
Параметры:
  objectUuid: string - UUID объекта
  instances: InstanceCreationParams[] - Массив параметров экземпляров
Возвращает: {success: boolean, instanceCount: number, instances?: CreatedInstanceInfo[], errors?: string[], error?: string}
Описание: Добавить несколько экземпляров объекта` 
        },
        { 
          label: 'addRandomObjectInstances', 
          type: 'function', 
          info: `addRandomObjectInstances(objectUuid, count, options?): AddInstancesResult
Параметры:
  objectUuid: string - UUID объекта
  count: number - Количество экземпляров
  options?: {
    rotation?: Vector3,
    scale?: Vector3,
    visible?: boolean,
    alignToTerrain?: boolean
  }
Возвращает: AddInstancesResult
Описание: Создать случайные экземпляры с автоматическим размещением` 
        },
        { 
          label: 'getAvailableLayers', 
          type: 'function', 
          info: `getAvailableLayers(): Array<LayerInfo>
Возвращает: Array<{
  id: string,
  name: string,
  visible: boolean,
  position: Vector3
}>
Описание: Получить доступные слои для размещения объектов` 
        },
        { 
          label: 'canAddInstance', 
          type: 'function', 
          info: `canAddInstance(objectUuid: string): boolean
Параметры:
  objectUuid: string - UUID объекта для проверки
Возвращает: boolean
Описание: Проверить можно ли добавить экземпляр объекта` 
        },
        { 
          label: 'getSceneStats', 
          type: 'function', 
          info: `getSceneStats(): SceneStats
Возвращает: {
  total: {objects: number, instances: number, layers: number},
  visible: {objects: number, instances: number, layers: number},
  primitiveTypes: string[]
}
Описание: Получить статистику сцены (общие и видимые объекты, экземпляры, слои)` 
        },
        { 
          label: 'addObjectWithTransform', 
          type: 'function', 
          info: `addObjectWithTransform(objectData: GFXObjectWithTransform): AddObjectWithTransformResult
Параметры:
  objectData: GFXObjectWithTransform = {
    uuid?: string,
    name: string,
    primitives: Primitive[],
    libraryUuid?: string,
    position?: Vector3,
    rotation?: Vector3,
    scale?: Vector3
  }
Возвращает: {success: boolean, objectUuid?: string, instanceUuid?: string, error?: string}
Описание: Добавить объект с трансформацией в сцену` 
        },
        { 
          label: 'searchObjectsInLibrary', 
          type: 'function', 
          info: `searchObjectsInLibrary(query: string): Promise<ObjectRecord[]>
Параметры:
  query: string - Строка поиска (по имени или описанию)
Возвращает: Promise<ObjectRecord[]>
Описание: Поиск объектов в библиотеке по строке запроса` 
        },
        { 
          label: 'addObjectFromLibrary', 
          type: 'function', 
          info: `addObjectFromLibrary(objectUuid, layerId, transform?): Promise<AddObjectResult>
Параметры:
  objectUuid: string - UUID объекта в библиотеке
  layerId: string - ID слоя для размещения
  transform?: Transform = {
    position?: Vector3,
    rotation?: Vector3,
    scale?: Vector3
  }
Возвращает: Promise<{success: boolean, objectUuid?: string, instanceUuid?: string, error?: string}>
Описание: Добавить объект из библиотеки` 
        },
        { 
          label: 'adjustInstancesForPerlinTerrain', 
          type: 'function', 
          info: `adjustInstancesForPerlinTerrain(perlinLayerId: string): TerrainAdjustResult
Параметры:
  perlinLayerId: string - ID слоя с Perlin ландшафтом
Возвращает: {success: boolean, adjustedCount?: number, error?: string}
Описание: Привязать экземпляры к ландшафту Perlin` 
        }
      ]
    } else if (isAfterConsole) {
      // Если автокомплит после "console.", показываем только методы консоли
      completions = [
        { label: 'log', type: 'function', info: 'Вывести сообщение в консоль' },
        { label: 'error', type: 'function', info: 'Вывести ошибку в консоль' },
        { label: 'warn', type: 'function', info: 'Вывести предупреждение в консоль' },
        { label: 'info', type: 'function', info: 'Вывести информацию в консоль' },
        { label: 'debug', type: 'function', info: 'Вывести отладочную информацию в консоль' },
        { label: 'table', type: 'function', info: 'Вывести данные в виде таблицы' },
        { label: 'clear', type: 'function', info: 'Очистить консоль' }
      ]
    } else if (!isAfterDot) {
      // Если автокомплит в общем контексте, показываем переменные и API
      
      // Базовые API и глобальные переменные
      completions = [
        { label: 'sceneApi', type: 'variable', info: 'API для управления сценой' },
        { label: 'console', type: 'variable', info: 'Консоль браузера' },
        { label: 'Math', type: 'variable', info: 'Математические функции и константы' },
        { label: 'Date', type: 'variable', info: 'Работа с датой и временем' },
        { label: 'JSON', type: 'variable', info: 'Парсинг и сериализация JSON' },
        { label: 'Array', type: 'variable', info: 'Конструктор массивов' },
        { label: 'Object', type: 'variable', info: 'Конструктор объектов' },
        { label: 'String', type: 'variable', info: 'Конструктор строк' },
        { label: 'Number', type: 'variable', info: 'Конструктор чисел' }
      ]
      
      // Добавляем переменные из текущего скрипта
      const scriptVariables = extractVariablesFromScript(currentScript)
      scriptVariables.forEach(varName => {
        if (!completions.some(c => c.label === varName)) {
          completions.push({
            label: varName,
            type: 'variable',
            info: `Переменная из скрипта: ${varName}`
          })
        }
      })
      
      // Добавляем переменные из API контекста
      const apiVariables = getApiVariables()
      completions.push(...apiVariables)
      
      // Добавляем ключевые слова JavaScript
      const keywords = [
        { label: 'const', type: 'keyword', info: 'Объявление константы' },
        { label: 'let', type: 'keyword', info: 'Объявление переменной' },
        { label: 'var', type: 'keyword', info: 'Объявление переменной (устаревшее)' },
        { label: 'function', type: 'keyword', info: 'Объявление функции' },
        { label: 'return', type: 'keyword', info: 'Возврат значения из функции' },
        { label: 'if', type: 'keyword', info: 'Условное выражение' },
        { label: 'else', type: 'keyword', info: 'Альтернативная ветка условия' },
        { label: 'for', type: 'keyword', info: 'Цикл for' },
        { label: 'while', type: 'keyword', info: 'Цикл while' },
        { label: 'try', type: 'keyword', info: 'Блок обработки исключений' },
        { label: 'catch', type: 'keyword', info: 'Обработка исключений' },
        { label: 'finally', type: 'keyword', info: 'Финальный блок' },
        { label: 'async', type: 'keyword', info: 'Асинхронная функция' },
        { label: 'await', type: 'keyword', info: 'Ожидание асинхронной операции' },
        { label: 'true', type: 'keyword', info: 'Логическое значение true' },
        { label: 'false', type: 'keyword', info: 'Логическое значение false' },
        { label: 'null', type: 'keyword', info: 'Значение null' },
        { label: 'undefined', type: 'keyword', info: 'Значение undefined' }
      ]
      
      completions.push(...keywords)
    }

    return {
      from: word.from,
      options: completions.filter(item =>
        item.label.toLowerCase().includes(word.text.toLowerCase())
      )
    }
  }, [extractVariablesFromScript, getApiVariables])

  const executeScript = useCallback(async () => {
    if (!script.trim()) return

    try {
      // Обернуть скрипт в async функцию для поддержки top-level await
      const asyncScript = `
        return (async () => {
          ${script}
        })();
      `
      
      // Выполнить скрипт с доступом к SceneAPI и нативной консоли
      const func = new Function('sceneApi', 'console', asyncScript)
      const result = await func(SceneAPI, window.console)

      if (result !== undefined) {
        console.log('Результат выполнения скрипта:', result)
      }

      console.log('✓ Скрипт успешно выполнен')
    } catch (error) {
      console.error('Ошибка выполнения:', error instanceof Error ? error.message : String(error))
    }
  }, [script])

  // Обработчик изменений в редакторе
  const handleEditorChange = useCallback((value: string, viewUpdate: any) => {
    setScript(value)
    
    // Получаем позицию курсора
    const selection = viewUpdate.state.selection.main
    const cursorPos = selection.head
    
    // Анализируем контекст и обновляем подсказки
    const methodInfo = analyzeCurrentContext(value, cursorPos)
    setCurrentMethodInfo(methodInfo)
  }, [analyzeCurrentContext])

  return (
    <Box style={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Панель инструментов */}
      <Group justify="space-between" p="sm" bg="gray.9">
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            onClick={handleNewScript}
          >
            Новый
          </Button>

          <Select
            placeholder="Загрузить скрипт"
            data={savedScripts.map(script => ({
              value: script.uuid,
              label: script.name
            }))}
            value={selectedScriptUuid}
            onChange={(value) => value && handleLoadScript(value)}
            size="xs"
            style={{ minWidth: 150 }}
            leftSection={<IconFolderOpen size={14} />}
            clearable
          />

          {selectedScriptUuid && (
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon size="sm" variant="light">
                  <IconDotsVertical size={14} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item 
                  leftSection={<IconEdit size={14} />}
                  onClick={openSaveModal}
                >
                  Переименовать
                </Menu.Item>
                <Menu.Item 
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={() => selectedScriptUuid && handleDeleteScript(selectedScriptUuid)}
                >
                  Удалить
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>

        <Group gap="xs">
          <Tooltip label="Сохранить скрипт">
            <Button
              size="xs"
              leftSection={<IconDeviceFloppy size={14} />}
              onClick={openSaveModal}
              variant="light"
            >
              Сохранить
            </Button>
          </Tooltip>

          <Tooltip label="Выполнить скрипт (Ctrl+Enter)">
            <Button
              size="xs"
              leftSection={<IconPlayerPlay size={14} />}
              onClick={executeScript}
              variant="filled"
            >
              Выполнить
            </Button>
          </Tooltip>
        </Group>
      </Group>

      {/* Редактор кода */}
      <Box style={{ flex: '1', minHeight: 0, position: 'relative' }}>
        {/* Панель подсказок типов */}
        {currentMethodInfo && (
          <Paper
            shadow="md"
            p="xs"
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 1000,
              maxWidth: 400,
              backgroundColor: 'var(--mantine-color-dark-7)',
              border: '1px solid var(--mantine-color-dark-4)'
            }}
          >
            <Group gap="xs" mb="xs">
              <IconInfoCircle size={16} color="var(--mantine-color-blue-4)" />
              <Text size="sm" fw={500} c="blue.4">Подсказка типов</Text>
            </Group>
            <Text
              size="xs"
              c="gray.3"
              style={{
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4
              }}
            >
              {currentMethodInfo}
            </Text>
          </Paper>
        )}

        <CodeMirror
          value={script}
          onChange={handleEditorChange}
          extensions={[
            javascript(),
            autocompletion({ override: [enhancedCompletions] })
          ]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            highlightSelectionMatches: false
          }}
          style={{
            height: '100%',
            fontSize: '13px',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
          }}
          theme="dark"
          onKeyDown={(event) => {
            if (event.ctrlKey && event.key === 'Enter') {
              event.preventDefault()
              executeScript()
            }
          }}
        />
      </Box>

      {/* Модальное окно для сохранения скрипта */}
      <Modal
        opened={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title={currentScriptUuid ? "Редактировать скрипт" : "Сохранить скрипт"}
        size="md"
      >
        <Box>
          <TextInput
            label="Название"
            placeholder="Введите название скрипта"
            value={saveScriptName}
            onChange={(event) => setSaveScriptName(event.currentTarget.value)}
            mb="sm"
            required
          />
          
          <TextInput
            label="Описание"
            placeholder="Краткое описание скрипта (необязательно)"
            value={saveScriptDescription}
            onChange={(event) => setSaveScriptDescription(event.currentTarget.value)}
            mb="md"
          />

          <Group justify="flex-end" gap="sm">
            <Button 
              variant="light" 
              onClick={() => setIsSaveModalOpen(false)}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleSaveScript}
              disabled={!saveScriptName.trim()}
            >
              {currentScriptUuid ? "Обновить" : "Сохранить"}
            </Button>
          </Group>
        </Box>
      </Modal>
    </Box>
  )
}