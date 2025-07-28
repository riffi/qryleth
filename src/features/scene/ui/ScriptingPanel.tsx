import React, { useState, useCallback, useEffect } from 'react'
import { Box, Button, Group, Text, Tooltip, Select, Modal, TextInput, Menu, ActionIcon } from '@mantine/core'
import { IconPlayerPlay, IconCode, IconDeviceFloppy, IconFolderOpen, IconDotsVertical, IconTrash, IconEdit } from '@tabler/icons-react'
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

  // Загрузка сохранённых скриптов при монтировании
  useEffect(() => {
    loadSavedScripts()
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


  // SceneAPI автокомплит
  const sceneApiCompletions = useCallback((context: CompletionContext) => {
    const word = context.matchBefore(/\w*/)
    if (!word) return null
    if (word.from === word.to && !context.explicit) return null

    // Проверяем, есть ли перед словом "sceneApi."
    const beforeWord = context.state.doc.sliceString(Math.max(0, word.from - 9), word.from)
    const isAfterSceneApi = beforeWord.endsWith('sceneApi.')
    const isAfterConsole = beforeWord.endsWith('console.')

    let completions = []

    if (isAfterSceneApi) {
      // Если автокомплит после "sceneApi.", показываем только методы
      completions = [
        { 
          label: 'getSceneOverview', 
          type: 'function', 
          info: 'getSceneOverview(): SceneOverview - Получить общую информацию о сцене с объектами, экземплярами и слоями' 
        },
        { 
          label: 'getSceneObjects', 
          type: 'function', 
          info: 'getSceneObjects(): SceneObjectInfo[] - Получить список всех объектов сцены' 
        },
        { 
          label: 'getSceneInstances', 
          type: 'function', 
          info: 'getSceneInstances(): SceneInstanceInfo[] - Получить список всех экземпляров объектов' 
        },
        { 
          label: 'findObjectByUuid', 
          type: 'function', 
          info: 'findObjectByUuid(uuid: string): SceneObject | null - Найти объект по UUID' 
        },
        { 
          label: 'findObjectByName', 
          type: 'function', 
          info: 'findObjectByName(name: string): SceneObject | null - Найти объект по имени (первый найденный)' 
        },
        { 
          label: 'addObjectInstance', 
          type: 'function', 
          info: 'addObjectInstance(objectUuid: string, position?: Vector3, rotation?: Vector3, scale?: Vector3, visible?: boolean): AddInstanceResult - Добавить экземпляр объекта' 
        },
        { 
          label: 'addSingleObjectInstance', 
          type: 'function', 
          info: 'addSingleObjectInstance(objectUuid: string, params: InstanceCreationParams): AddInstancesResult - Добавить один экземпляр с BoundingBox' 
        },
        { 
          label: 'addObjectInstances', 
          type: 'function', 
          info: 'addObjectInstances(objectUuid: string, instances: InstanceCreationParams[]): AddInstancesResult - Добавить несколько экземпляров объекта' 
        },
        { 
          label: 'addRandomObjectInstances', 
          type: 'function', 
          info: 'addRandomObjectInstances(objectUuid: string, count: number, options?: {rotation?, scale?, visible?, alignToTerrain?}): AddInstancesResult - Создать случайные экземпляры' 
        },
        { 
          label: 'getAvailableLayers', 
          type: 'function', 
          info: 'getAvailableLayers(): Array - Получить доступные слои для размещения объектов' 
        },
        { 
          label: 'canAddInstance', 
          type: 'function', 
          info: 'canAddInstance(objectUuid: string): boolean - Проверить можно ли добавить экземпляр объекта' 
        },
        { 
          label: 'getSceneStats', 
          type: 'function', 
          info: 'getSceneStats(): Object - Получить статистику сцены (общие и видимые объекты, экземпляры, слои)' 
        },
        { 
          label: 'addObjectWithTransform', 
          type: 'function', 
          info: 'addObjectWithTransform(objectData: GFXObjectWithTransform): AddObjectWithTransformResult - Добавить объект с трансформацией в сцену' 
        },
        { 
          label: 'searchObjectsInLibrary', 
          type: 'function', 
          info: 'searchObjectsInLibrary(query: string): Promise<ObjectRecord[]> - Поиск объектов в библиотеке по строке запроса' 
        },
        { 
          label: 'addObjectFromLibrary', 
          type: 'function', 
          info: 'addObjectFromLibrary(objectUuid: string, layerId: string, transform?: Transform): Promise<AddObjectResult> - Добавить объект из библиотеки' 
        },
        { 
          label: 'adjustInstancesForPerlinTerrain', 
          type: 'function', 
          info: 'adjustInstancesForPerlinTerrain(perlinLayerId: string): {success, adjustedCount?, error?} - Привязать экземпляры к ландшафту Perlin' 
        }
      ]
    } else if (isAfterConsole) {
      // Если автокомплит после "console.", показываем только методы консоли
      completions = [
        { label: 'log', type: 'function', info: 'Вывести сообщение в консоль' },
        { label: 'error', type: 'function', info: 'Вывести ошибку в консоль' }
      ]
    } else {
      // Если автокомплит в общем контексте, показываем полные имена
      completions = [
        { label: 'sceneApi', type: 'variable', info: 'API для управления сценой' },
        { label: 'console', type: 'variable', info: 'Консоль браузера' }
      ]
    }

    return {
      from: word.from,
      options: completions.filter(item =>
        item.label.toLowerCase().includes(word.text.toLowerCase())
      )
    }
  }, [])


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
        <CodeMirror
          value={script}
          onChange={(value) => setScript(value)}
          extensions={[
            javascript(),
            autocompletion({ override: [sceneApiCompletions] })
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
