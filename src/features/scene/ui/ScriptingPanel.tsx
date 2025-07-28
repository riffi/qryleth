import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Box, Button, Group, Text, Tooltip, Select, Modal, TextInput, Menu, ActionIcon, Paper, Stack } from '@mantine/core'
import { IconPlayerPlay, IconCode, IconDeviceFloppy, IconFolderOpen, IconDotsVertical, IconTrash, IconEdit, IconInfoCircle } from '@tabler/icons-react'
import { SceneAPI } from '../lib/sceneAPI'
import { db, type ScriptRecord } from '@/shared/lib/database'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { StreamLanguage } from '@codemirror/language'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'
import { oneDark } from '@codemirror/theme-one-dark'
import { hoverTooltip } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'

interface ScriptingPanelProps {
  height?: number | string
}

type LanguageMode = 'javascript' | 'typescript'

// Типовые схемы для результатов функций SceneAPI
interface TypeSchema {
  properties: Record<string, {
    type: string
    description: string
    properties?: Record<string, { type: string; description: string }>
  }>
}

const API_RETURN_TYPES: Record<string, TypeSchema> = {
  'getSceneOverview': {
    properties: {
      'totalObjects': { type: 'number', description: 'Общее количество объектов' },
      'totalInstances': { type: 'number', description: 'Общее количество экземпляров' },
      'objects': { type: 'SceneObjectInfo[]', description: 'Массив объектов сцены' },
      'instances': { type: 'SceneInstanceInfo[]', description: 'Массив экземпляров' },
      'sceneName': { type: 'string', description: 'Название сцены' },
      'layers': { type: 'LayerInfo[]', description: 'Массив слоев' }
    }
  },
  'getSceneObjects': {
    properties: {
      'length': { type: 'number', description: 'Количество объектов в массиве' },
      'forEach': { type: 'function', description: 'Метод итерации по массиву' },
      'map': { type: 'function', description: 'Метод преобразования массива' },
      'filter': { type: 'function', description: 'Метод фильтрации массива' },
      'find': { type: 'function', description: 'Поиск элемента в массиве' }
    }
  },
  'getSceneInstances': {
    properties: {
      'length': { type: 'number', description: 'Количество экземпляров в массиве' },
      'forEach': { type: 'function', description: 'Метод итерации по массиву' },
      'map': { type: 'function', description: 'Метод преобразования массива' },
      'filter': { type: 'function', description: 'Метод фильтрации массива' },
      'find': { type: 'function', description: 'Поиск элемента в массиве' }
    }
  },
  'getSceneStats': {
    properties: {
      'total': { 
        type: 'object', 
        description: 'Общая статистика',
        properties: {
          'objects': { type: 'number', description: 'Общее количество объектов' },
          'instances': { type: 'number', description: 'Общее количество экземпляров' },
          'layers': { type: 'number', description: 'Общее количество слоев' }
        }
      },
      'visible': { 
        type: 'object', 
        description: 'Статистика видимых элементов',
        properties: {
          'objects': { type: 'number', description: 'Видимые объекты' },
          'instances': { type: 'number', description: 'Видимые экземпляры' },
          'layers': { type: 'number', description: 'Видимые слои' }
        }
      },
      'primitiveTypes': { type: 'string[]', description: 'Типы примитивов' }
    }
  },
  'getAvailableLayers': {
    properties: {
      'length': { type: 'number', description: 'Количество слоев в массиве' },
      'forEach': { type: 'function', description: 'Метод итерации по массиву' },
      'map': { type: 'function', description: 'Метод преобразования массива' },
      'filter': { type: 'function', description: 'Метод фильтрации массива' },
      'find': { type: 'function', description: 'Поиск элемента в массиве' }
    }
  },
  'addObjectInstance': {
    properties: {
      'success': { type: 'boolean', description: 'Успешность операции' },
      'instanceUuid': { type: 'string', description: 'UUID созданного экземпляра' },
      'objectUuid': { type: 'string', description: 'UUID объекта' },
      'error': { type: 'string', description: 'Сообщение об ошибке' }
    }
  },
  'addObjectInstances': {
    properties: {
      'success': { type: 'boolean', description: 'Успешность операции' },
      'instanceCount': { type: 'number', description: 'Количество созданных экземпляров' },
      'instances': { type: 'CreatedInstanceInfo[]', description: 'Информация о созданных экземплярах' },
      'errors': { type: 'string[]', description: 'Массив ошибок' },
      'error': { type: 'string', description: 'Сообщение об ошибке' }
    }
  },
  'findObjectByUuid': {
    properties: {
      'uuid': { type: 'string', description: 'UUID объекта' },
      'name': { type: 'string', description: 'Название объекта' },
      'primitiveCount': { type: 'number', description: 'Количество примитивов' },
      'visible': { type: 'boolean', description: 'Видимость объекта' }
    }
  },
  'findObjectByName': {
    properties: {
      'uuid': { type: 'string', description: 'UUID объекта' },
      'name': { type: 'string', description: 'Название объекта' },
      'primitiveCount': { type: 'number', description: 'Количество примитивов' },
      'visible': { type: 'boolean', description: 'Видимость объекта' }
    }
  }
}

export const ScriptingPanel: React.FC<ScriptingPanelProps> = ({ height = 800 }) => {
  const getDefaultScript = useCallback((mode: LanguageMode) => {
    if (mode === 'typescript') {
      return `// Пример использования SceneAPI с TypeScript
interface SceneOverview {
  totalObjects: number
  totalInstances: number
  objects: SceneObjectInfo[]
  instances: SceneInstanceInfo[]
  sceneName: string
  layers: Array<{id: string, name: string, visible: boolean, objectCount: number}>
}

const overview: SceneOverview = sceneApi.getSceneOverview()
console.log('Объектов в сцене:', overview.totalObjects)
console.log('Экземпляров:', overview.totalInstances)
console.log('Слои:', overview.layers)

// Получить статистику с вложенными свойствами
const stats = sceneApi.getSceneStats()
console.log('Общие объекты:', stats.total.objects)
console.log('Видимые объекты:', stats.visible.objects)

// Получить все объекты
const objects: SceneObjectInfo[] = sceneApi.getSceneObjects()
objects.forEach((obj: SceneObjectInfo) => {
  console.log(\`Объект: \${obj.name}, примитивов: \${obj.primitiveCount}\`)
})

// Создать экземпляр первого объекта (если есть)
if (objects.length > 0) {
  const result: AddInstanceResult = sceneApi.addObjectInstance(
    objects[0].uuid,
    [2, 0, 2] as Vector3, // position
    [0, 0, 0] as Vector3, // rotation
    [1, 1, 1] as Vector3  // scale
  )
  console.log('Результат создания экземпляра:', result)
}`
    } else {
      return `// Пример использования SceneAPI
const overview = sceneApi.getSceneOverview()
console.log('Объектов в сцене:', overview.totalObjects)
console.log('Экземпляров:', overview.totalInstances)
console.log('Слои:', overview.layers)

// Получить статистику с вложенными свойствами  
const stats = sceneApi.getSceneStats()
console.log('Общие объекты:', stats.total.objects)
console.log('Видимые объекты:', stats.visible.objects)

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
}`
    }
  }, [])

  const [script, setScript] = useState(() => getDefaultScript('javascript'))

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
  const [languageMode, setLanguageMode] = useState<LanguageMode>('javascript')

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
    const isTs = languageMode === 'typescript'
    const methodInfoMap: Record<string, string> = {
      'getSceneOverview': isTs ? `getSceneOverview(): SceneOverview
Возвращает: {
  totalObjects: number,
  totalInstances: number,
  objects: SceneObjectInfo[],
  instances: SceneInstanceInfo[],
  sceneName: string,
  layers: Array<{id: string, name: string, visible: boolean, objectCount: number}>
}` : `getSceneOverview(): SceneOverview
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
  }, [languageMode])

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
    setScript(getDefaultScript(languageMode))
    setCurrentScriptUuid(null)
    setSelectedScriptUuid(null)
  }, [languageMode, getDefaultScript])

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

  // Функция для анализа типов переменных из присваиваний
  const analyzeVariableTypes = useCallback((scriptText: string): Record<string, string> => {
    const variableTypes: Record<string, string> = {}
    
    // Поиск присваиваний результатов функций sceneApi (включая await)
    const patterns = [
      /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*sceneApi\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
      /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*await\s+sceneApi\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g
    ]
    
    patterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(scriptText)) !== null) {
        const varName = match[1]
        const methodName = match[2]
        
        if (API_RETURN_TYPES[methodName]) {
          variableTypes[varName] = methodName
        }
      }
    })
    
    return variableTypes
  }, [])

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

  // Функция для создания стилизованной подсказки
  const createStyledInfo = (text: string) => {
    return () => {
      const div = document.createElement('div');
      div.style.padding = '10px';
      div.style.backgroundColor = '#1e1e1e';
      div.style.color = '#d4d4d4';
      div.style.borderRadius = '6px';
      div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
      div.style.maxWidth = '450px';
      div.style.fontFamily = "'Fira Code', monospace";
      div.style.fontSize = '13px';
      div.style.lineHeight = '1.5';

      const lines = text.split('\n');
      let html = '';
      lines.forEach(line => {
        if (line.trim() === '') return;
        if (line.includes('():')) {
          html += `<h3 style="margin: 0 0 8px 0; color: #4ec9b0;">${line}</h3>`;
        } else if (line.startsWith('Возвращает:')) {
          html += `<p style="margin: 4px 0; color: #dcdcaa;"><strong>${line}</strong></p>`;
        } else if (line.startsWith('Параметры:')) {
          html += `<p style="margin: 4px 0; color: #dcdcaa;"><strong>${line}</strong></p>`;
        } else if (line.startsWith('Описание:')) {
          html += `<p style="margin: 8px 0 0 0; color: #9cdcfe;">${line}</p>`;
        } else {
          html += `<pre style="margin: 0; color: #d4d4d4;">${line}</pre>`;
        }
      });

      div.innerHTML = html;
      return div;
    };
  };

  // Функция для создания hover tooltip с информацией о методах
  const createHoverTooltip = useCallback(() => {
    return hoverTooltip((view, pos, side) => {
      const { state } = view
      const tree = syntaxTree(state)
      const node = tree.resolveInner(pos, side)
      
      // Получаем текущий код
      const currentScript = state.doc.toString()
      const variableTypes = analyzeVariableTypes(currentScript)
      
      // Получаем слово под курсором
      let word = state.doc.sliceString(node.from, node.to)
      const beforeNode = state.doc.sliceString(Math.max(0, node.from - 20), node.from)
      
      // Если узел не содержит слово, попробуем найти ближайшее слово
      if (!word || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(word)) {
        // Ищем слово в окрестности позиции
        const lineText = state.doc.lineAt(pos).text
        const lineStart = state.doc.lineAt(pos).from
        const localPos = pos - lineStart
        const match = lineText.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g)
        if (match) {
          for (const m of match) {
            const index = lineText.indexOf(m)
            if (index <= localPos && localPos <= index + m.length) {
              word = m
              break
            }
          }
        }
      }
      
      // Проверяем, является ли это методом sceneApi
      if (beforeNode.includes('sceneApi.') && word) {
        const methodInfo = getMethodInfo(word)
        if (methodInfo) {
          return {
            pos: node.from,
            end: node.to,
            above: true,
            create: () => {
              const div = document.createElement('div')
              div.style.padding = '8px 12px'
              div.style.backgroundColor = '#1e1e1e'
              div.style.color = '#d4d4d4'
              div.style.border = '1px solid #444'
              div.style.borderRadius = '6px'
              div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)'
              div.style.maxWidth = '400px'
              div.style.fontFamily = "'Fira Code', monospace"
              div.style.fontSize = '12px'
              div.style.lineHeight = '1.4'
              div.style.whiteSpace = 'pre-wrap'
              div.style.zIndex = '1000'
              
              div.textContent = methodInfo
              return { dom: div }
            }
          }
        }
      }
      
      // Проверяем, является ли это переменной с выведенным типом
      if (word && variableTypes[word]) {
        const apiMethodName = variableTypes[word]
        const typeSchema = API_RETURN_TYPES[apiMethodName]
        if (typeSchema) {
          const typeInfo = `${word}: результат ${apiMethodName}()\n\nДоступные свойства:\n${Object.entries(typeSchema.properties).map(([prop, info]) => `• ${prop}: ${info.type} - ${info.description}`).join('\n')}`
          
          return {
            pos: node.from,
            end: node.to,
            above: true,
            create: () => {
              const div = document.createElement('div')
              div.style.padding = '8px 12px'
              div.style.backgroundColor = '#1e1e1e'
              div.style.color = '#d4d4d4'
              div.style.border = '1px solid #444'
              div.style.borderRadius = '6px'
              div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)'
              div.style.maxWidth = '400px'
              div.style.fontFamily = "'Fira Code', monospace"
              div.style.fontSize = '12px'
              div.style.lineHeight = '1.4'
              div.style.whiteSpace = 'pre-wrap'
              div.style.zIndex = '1000'
              
              div.textContent = typeInfo
              return { dom: div }
            }
          }
        }
      }
      
      // Проверяем свойства переменных с выведенными типами
      const propertyAccess = beforeNode.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\.$/)
      if (propertyAccess && variableTypes[propertyAccess[1]] && word) {
        const variableName = propertyAccess[1]
        const apiMethodName = variableTypes[variableName]
        const typeSchema = API_RETURN_TYPES[apiMethodName]
        
        if (typeSchema && typeSchema.properties[word]) {
          const propInfo = typeSchema.properties[word]
          const propertyInfo = `${variableName}.${word}: ${propInfo.type}\n\n${propInfo.description}`
          
          // Если есть вложенные свойства, добавляем их
          if (propInfo.properties) {
            const nestedProps = Object.entries(propInfo.properties).map(([prop, info]) => `• ${prop}: ${info.type} - ${info.description}`).join('\n')
            return {
              pos: node.from,
              end: node.to,
              above: true,
              create: () => {
                const div = document.createElement('div')
                div.style.padding = '8px 12px'
                div.style.backgroundColor = '#1e1e1e'
                div.style.color = '#d4d4d4'
                div.style.border = '1px solid #444'
                div.style.borderRadius = '6px'
                div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)'
                div.style.maxWidth = '400px'
                div.style.fontFamily = "'Fira Code', monospace"
                div.style.fontSize = '12px'
                div.style.lineHeight = '1.4'
                div.style.whiteSpace = 'pre-wrap'
                div.style.zIndex = '1000'
                
                div.textContent = `${propertyInfo}\n\nВложенные свойства:\n${nestedProps}`
                return { dom: div }
              }
            }
          } else {
            return {
              pos: node.from,
              end: node.to,
              above: true,
              create: () => {
                const div = document.createElement('div')
                div.style.padding = '8px 12px'
                div.style.backgroundColor = '#1e1e1e'
                div.style.color = '#d4d4d4'
                div.style.border = '1px solid #444'
                div.style.borderRadius = '6px'
                div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)'
                div.style.maxWidth = '400px'
                div.style.fontFamily = "'Fira Code', monospace"
                div.style.fontSize = '12px'
                div.style.lineHeight = '1.4'
                div.style.whiteSpace = 'pre-wrap'
                div.style.zIndex = '1000'
                
                div.textContent = propertyInfo
                return { dom: div }
              }
            }
          }
        }
      }
      
      return null
    })
  }, [analyzeVariableTypes, getMethodInfo])

  // Расширенный автокомплит с поддержкой переменных
  const enhancedCompletions = useCallback((context: CompletionContext) => {
    const word = context.matchBefore(/\w*/)
    if (!word) return null
    if (word.from === word.to && !context.explicit) return null

    // Получаем текущий код для анализа переменных
    const currentScript = context.state.doc.toString()
    const beforeWord = context.state.doc.sliceString(Math.max(0, word.from - 20), word.from)
    
    const isAfterSceneApi = beforeWord.endsWith('sceneApi.')
    const isAfterConsole = beforeWord.endsWith('console.')
    const isAfterDot = beforeWord.endsWith('.')
    
    // Анализируем типы переменных
    const variableTypes = analyzeVariableTypes(currentScript)
    
    // Проверяем, находимся ли мы после переменной с известным типом
    const variableAccess = beforeWord.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\.$/)
    const isAfterTypedVariable = variableAccess && variableTypes[variableAccess[1]]
    
    // Проверяем вложенные свойства (например, stats.total.)
    const nestedAccess = beforeWord.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z_$][a-zA-Z0-9_$]*)\.$/)
    const isAfterNestedProperty = nestedAccess && variableTypes[nestedAccess[1]]

    let completions = []

    if (isAfterNestedProperty) {
      // Если автокомплит после вложенного свойства (например, stats.total.)
      const variableName = nestedAccess[1]
      const propertyName = nestedAccess[2]
      const apiMethodName = variableTypes[variableName]
      const typeSchema = API_RETURN_TYPES[apiMethodName]
      
      if (typeSchema && typeSchema.properties[propertyName]?.properties) {
        completions = Object.entries(typeSchema.properties[propertyName].properties!).map(([propName, propInfo]) => ({
          label: propName,
          type: 'property',
          info: createStyledInfo(`${propName}: ${propInfo.type}\n${propInfo.description}`)
        }))
      }
    } else if (isAfterTypedVariable) {
      // Если автокомплит после переменной с известным типом
      const variableName = variableAccess[1]
      const apiMethodName = variableTypes[variableName]
      const typeSchema = API_RETURN_TYPES[apiMethodName]
      
      if (typeSchema) {
        completions = Object.entries(typeSchema.properties).map(([propName, propInfo]) => ({
          label: propName,
          type: propInfo.type.includes('function') ? 'function' : 
                propInfo.type.includes('[]') ? 'variable' : 
                propInfo.type === 'object' ? 'variable' : 'property',
          info: createStyledInfo(`${propName}: ${propInfo.type}\n${propInfo.description}`)
        }))
      }
    } else if (isAfterSceneApi) {
      // Если автокомплит после "sceneApi.", показываем только методы с детальными подсказками типов
      completions = [
        { 
          label: 'getSceneOverview', 
          type: 'function', 
          info: createStyledInfo(`getSceneOverview(): SceneOverview
Возвращает: {
  totalObjects: number,
  totalInstances: number,
  objects: SceneObjectInfo[],
  instances: SceneInstanceInfo[],
  sceneName: string,
  layers: Array<{id, name, visible, objectCount}>
}
Описание: Получить общую информацию о сцене с объектами, экземплярами и слоями`) 
        },
        { 
          label: 'getSceneObjects', 
          type: 'function', 
          info: createStyledInfo(`getSceneObjects(): SceneObjectInfo[]
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
Описание: Получить список всех объектов сцены`) 
        },
        { 
          label: 'getSceneInstances', 
          type: 'function', 
          info: createStyledInfo(`getSceneInstances(): SceneInstanceInfo[]
Возвращает: Array<{
  uuid: string,
  objectUuid: string,
  objectName: string,
  transform?: Transform,
  visible?: boolean
}>
Описание: Получить список всех экземпляров объектов`) 
        },
        { 
          label: 'findObjectByUuid', 
          type: 'function', 
          info: createStyledInfo(`findObjectByUuid(uuid: string): SceneObject | null
Параметры:
  uuid: string - UUID объекта для поиска
Возвращает: SceneObject | null
Описание: Найти объект по UUID`) 
        },
        { 
          label: 'findObjectByName', 
          type: 'function', 
          info: createStyledInfo(`findObjectByName(name: string): SceneObject | null
Параметры:
  name: string - Имя объекта для поиска (частичное совпадение)
Возвращает: SceneObject | null
Описание: Найти объект по имени (первый найденный)`) 
        },
        { 
          label: 'addObjectInstance', 
          type: 'function', 
          info: createStyledInfo(`addObjectInstance(objectUuid, position?, rotation?, scale?, visible?): AddInstanceResult
Параметры:
  objectUuid: string - UUID существующего объекта
  position?: Vector3 = [0, 0, 0] - Позиция [x, y, z]
  rotation?: Vector3 = [0, 0, 0] - Поворот [x, y, z] в радианах
  scale?: Vector3 = [1, 1, 1] - Масштаб [x, y, z]
  visible?: boolean = true - Видимость экземпляра
Возвращает: {success: boolean, instanceUuid?: string, objectUuid?: string, error?: string}
Описание: Добавить экземпляр объекта`) 
        },
        { 
          label: 'addSingleObjectInstance', 
          type: 'function', 
          info: createStyledInfo(`addSingleObjectInstance(objectUuid, params): AddInstancesResult
Параметры:
  objectUuid: string - UUID объекта
  params: InstanceCreationParams = {
    position?: Vector3,
    rotation?: Vector3,
    scale?: Vector3,
    visible?: boolean
  }
Возвращает: {success: boolean, instanceCount: number, instances?: CreatedInstanceInfo[], errors?: string[], error?: string}
Описание: Добавить один экземпляр с BoundingBox`) 
        },
        { 
          label: 'addObjectInstances', 
          type: 'function', 
          info: createStyledInfo(`addObjectInstances(objectUuid, instances): AddInstancesResult
Параметры:
  objectUuid: string - UUID объекта
  instances: InstanceCreationParams[] - Массив параметров экземпляров
Возвращает: {success: boolean, instanceCount: number, instances?: CreatedInstanceInfo[], errors?: string[], error?: string}
Описание: Добавить несколько экземпляров объекта`) 
        },
        { 
          label: 'addRandomObjectInstances', 
          type: 'function', 
          info: createStyledInfo(`addRandomObjectInstances(objectUuid, count, options?): AddInstancesResult
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
Описание: Создать случайные экземпляры с автоматическим размещением`) 
        },
        { 
          label: 'getAvailableLayers', 
          type: 'function', 
          info: createStyledInfo(`getAvailableLayers(): Array<LayerInfo>
Возвращает: Array<{
  id: string,
  name: string,
  visible: boolean,
  position: Vector3
}>
Описание: Получить доступные слои для размещения объектов`) 
        },
        { 
          label: 'canAddInstance', 
          type: 'function', 
          info: createStyledInfo(`canAddInstance(objectUuid: string): boolean
Параметры:
  objectUuid: string - UUID объекта для проверки
Возвращает: boolean
Описание: Проверить можно ли добавить экземпляр объекта`) 
        },
        { 
          label: 'getSceneStats', 
          type: 'function', 
          info: createStyledInfo(`getSceneStats(): SceneStats
Возвращает: {
  total: {objects: number, instances: number, layers: number},
  visible: {objects: number, instances: number, layers: number},
  primitiveTypes: string[]
}
Описание: Получить статистику сцены (общие и видимые объекты, экземпляры, слои)`) 
        },
        { 
          label: 'addObjectWithTransform', 
          type: 'function', 
          info: createStyledInfo(`addObjectWithTransform(objectData: GFXObjectWithTransform): AddObjectWithTransformResult
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
Описание: Добавить объект с трансформацией в сцену`) 
        },
        { 
          label: 'searchObjectsInLibrary', 
          type: 'function', 
          info: createStyledInfo(`searchObjectsInLibrary(query: string): Promise<ObjectRecord[]>
Параметры:
  query: string - Строка поиска (по имени или описанию)
Возвращает: Promise<ObjectRecord[]>
Описание: Поиск объектов в библиотеке по строке запроса`) 
        },
        { 
          label: 'addObjectFromLibrary', 
          type: 'function', 
          info: createStyledInfo(`addObjectFromLibrary(objectUuid, layerId, transform?): Promise<AddObjectResult>
Параметры:
  objectUuid: string - UUID объекта в библиотеке
  layerId: string - ID слоя для размещения
  transform?: Transform = {
    position?: Vector3,
    rotation?: Vector3,
    scale?: Vector3
  }
Возвращает: Promise<{success: boolean, objectUuid?: string, instanceUuid?: string, error?: string}>
Описание: Добавить объект из библиотеки`) 
        },
        { 
          label: 'adjustInstancesForPerlinTerrain', 
          type: 'function', 
          info: createStyledInfo(`adjustInstancesForPerlinTerrain(perlinLayerId: string): TerrainAdjustResult
Параметры:
  perlinLayerId: string - ID слоя с Perlin ландшафтом
Возвращает: {success: boolean, adjustedCount?: number, error?: string}
Описание: Привязать экземпляры к ландшафту Perlin`) 
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

      // Добавляем TypeScript-специфичные типы для API
      if (languageMode === 'typescript') {
        const tsTypes = [
          { label: 'Vector3', type: 'type', info: 'Тип для 3D вектора: [number, number, number]' },
          { label: 'SceneOverview', type: 'type', info: 'Интерфейс обзора сцены' },
          { label: 'SceneObjectInfo', type: 'type', info: 'Интерфейс информации об объекте сцены' },
          { label: 'SceneInstanceInfo', type: 'type', info: 'Интерфейс информации об экземпляре' },
          { label: 'AddInstanceResult', type: 'type', info: 'Результат добавления экземпляра' },
          { label: 'AddInstancesResult', type: 'type', info: 'Результат добавления нескольких экземпляров' },
          { label: 'InstanceCreationParams', type: 'type', info: 'Параметры создания экземпляра' },
          { label: 'LayerInfo', type: 'type', info: 'Информация о слое' },
          { label: 'SceneStats', type: 'type', info: 'Статистика сцены' },
          { label: 'Transform', type: 'type', info: 'Трансформация объекта' },
          { label: 'BoundingBox', type: 'type', info: 'Ограничивающий бокс' }
        ]
        completions.push(...tsTypes)
      }
      
      // Добавляем переменные из текущего скрипта
      const scriptVariables = extractVariablesFromScript(currentScript)
      scriptVariables.forEach(varName => {
        if (!completions.some(c => c.label === varName)) {
          // Проверяем, есть ли у переменной выведенный тип
          const inferredType = variableTypes[varName]
          const typeInfo = inferredType ? ` (тип: результат ${inferredType})` : ''
          
          completions.push({
            label: varName,
            type: 'variable',
            info: `Переменная из скрипта: ${varName}${typeInfo}`
          })
        }
      })
      
      // Добавляем переменные из API контекста
      const apiVariables = getApiVariables()
      completions.push(...apiVariables)
      
      // Добавляем ключевые слова JavaScript/TypeScript
      const jsKeywords = [
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

      const tsKeywords = [
        { label: 'interface', type: 'keyword', info: 'Объявление интерфейса' },
        { label: 'type', type: 'keyword', info: 'Объявление типа' },
        { label: 'enum', type: 'keyword', info: 'Объявление перечисления' },
        { label: 'namespace', type: 'keyword', info: 'Объявление пространства имён' },
        { label: 'class', type: 'keyword', info: 'Объявление класса' },
        { label: 'extends', type: 'keyword', info: 'Наследование класса/интерфейса' },
        { label: 'implements', type: 'keyword', info: 'Реализация интерфейса' },
        { label: 'public', type: 'keyword', info: 'Модификатор доступа public' },
        { label: 'private', type: 'keyword', info: 'Модификатор доступа private' },
        { label: 'protected', type: 'keyword', info: 'Модификатор доступа protected' },
        { label: 'readonly', type: 'keyword', info: 'Модификатор readonly' },
        { label: 'static', type: 'keyword', info: 'Статический член класса' },
        { label: 'abstract', type: 'keyword', info: 'Абстрактный класс/метод' },
        { label: 'as', type: 'keyword', info: 'Приведение типа' },
        { label: 'is', type: 'keyword', info: 'Предикат типа' },
        { label: 'keyof', type: 'keyword', info: 'Оператор keyof' },
        { label: 'typeof', type: 'keyword', info: 'Оператор typeof' },
        { label: 'in', type: 'keyword', info: 'Оператор in' },
        { label: 'never', type: 'keyword', info: 'Тип never' },
        { label: 'unknown', type: 'keyword', info: 'Тип unknown' },
        { label: 'any', type: 'keyword', info: 'Тип any' },
        { label: 'void', type: 'keyword', info: 'Тип void' },
        { label: 'string', type: 'keyword', info: 'Тип string' },
        { label: 'number', type: 'keyword', info: 'Тип number' },
        { label: 'boolean', type: 'keyword', info: 'Тип boolean' },
        { label: 'object', type: 'keyword', info: 'Тип object' }
      ]

      const keywords = languageMode === 'typescript' ? [...jsKeywords, ...tsKeywords] : jsKeywords
      
      completions.push(...keywords)
    }

    return {
      from: word.from,
      options: completions.filter(item =>
        item.label.toLowerCase().includes(word.text.toLowerCase())
      )
    }
  }, [extractVariablesFromScript, getApiVariables, languageMode, analyzeVariableTypes])

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
            size="xs"
            value={languageMode}
            onChange={(value) => {
              const newMode = value as LanguageMode
              setLanguageMode(newMode)
              if (!script.trim() || script === getDefaultScript('javascript') || script === getDefaultScript('typescript')) {
                setScript(getDefaultScript(newMode))
              }
            }}
            data={[
              { value: 'javascript', label: 'JavaScript' },
              { value: 'typescript', label: 'TypeScript' }
            ]}
            leftSection={<IconCode size={14} />}
            style={{ minWidth: 120 }}
          />

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
            javascript({ typescript: languageMode === 'typescript' }),
            autocompletion({ override: [enhancedCompletions] }),
            createHoverTooltip()
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
            rectangularSelection: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            syntaxHighlighting: true
          }}
          theme={oneDark}
          height="100%"
          style={{ height: '100%' }}
        />
      </Box>

      {/* Модальное окно сохранения */}
      <Modal
        opened={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title={currentScriptUuid ? 'Редактировать скрипт' : 'Сохранить скрипт'}
      >
        <Stack gap="md">
          <TextInput
            label="Название скрипта"
            value={saveScriptName}
            onChange={(e) => setSaveScriptName(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Описание (опционально)"
            value={saveScriptDescription}
            onChange={(e) => setSaveScriptDescription(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setIsSaveModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveScript}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}