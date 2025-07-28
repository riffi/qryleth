import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Box, Paper, Button, Group, ScrollArea, Text, Code, Divider, ActionIcon, Tooltip } from '@mantine/core'
import { IconPlayerPlay, IconTrash, IconCode } from '@tabler/icons-react'
import { SceneAPI } from '../lib/sceneAPI'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'
import { oneDark } from '@codemirror/theme-one-dark'

interface ConsoleEntry {
  id: string
  type: 'log' | 'error' | 'result'
  content: string
  timestamp: Date
}

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

  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // SceneAPI автокомплит
  const sceneApiCompletions = useCallback((context: CompletionContext) => {
    const word = context.matchBefore(/\w*/)
    if (!word) return null
    if (word.from === word.to && !context.explicit) return null

    const sceneApiMethods = [
      { label: 'sceneApi.getSceneOverview', type: 'function', info: 'Получить общую информацию о сцене' },
      { label: 'sceneApi.getSceneObjects', type: 'function', info: 'Получить все объекты сцены' },
      { label: 'sceneApi.addObjectInstance', type: 'function', info: 'Добавить экземпляр объекта в сцену' },
      { label: 'sceneApi.removeObjectInstance', type: 'function', info: 'Удалить экземпляр объекта' },
      { label: 'sceneApi.updateObjectInstance', type: 'function', info: 'Обновить экземпляр объекта' },
      { label: 'sceneApi.getObjectInstances', type: 'function', info: 'Получить все экземпляры объектов' },
      { label: 'sceneApi.clearScene', type: 'function', info: 'Очистить всю сцену' },
      { label: 'console.log', type: 'function', info: 'Вывести сообщение в консоль' },
      { label: 'console.error', type: 'function', info: 'Вывести ошибку в консоль' }
    ]

    return {
      from: word.from,
      options: sceneApiMethods.filter(item => 
        item.label.toLowerCase().includes(word.text.toLowerCase())
      )
    }
  }, [])

  const addConsoleEntry = useCallback((type: ConsoleEntry['type'], content: string) => {
    const entry: ConsoleEntry = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    }
    setConsoleEntries(prev => [...prev, entry])
  }, [])

  const clearConsole = useCallback(() => {
    setConsoleEntries([])
  }, [])

  const executeScript = useCallback(() => {
    if (!script.trim()) return

    try {
      // Создать изолированный контекст для выполнения скрипта
      const context = {
        sceneApi: SceneAPI,
        console: {
          log: (...args: any[]) => {
            const content = args.map(arg =>
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ')
            addConsoleEntry('log', content)
          },
          error: (...args: any[]) => {
            const content = args.map(arg => String(arg)).join(' ')
            addConsoleEntry('error', content)
          }
        }
      }

      // Выполнить скрипт в контексте
      const func = new Function('sceneApi', 'console', script)
      const result = func(context.sceneApi, context.console)

      if (result !== undefined) {
        const resultContent = typeof result === 'object'
          ? JSON.stringify(result, null, 2)
          : String(result)
        addConsoleEntry('result', resultContent)
      }

      addConsoleEntry('log', '✓ Скрипт успешно выполнен')
    } catch (error) {
      addConsoleEntry('error', `Ошибка выполнения: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [script, addConsoleEntry])

  const getEntryColor = (type: ConsoleEntry['type']) => {
    switch (type) {
      case 'error':
        return 'red'
      case 'result':
        return 'blue'
      default:
        return 'gray'
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('ru-RU', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Auto-scroll to bottom when new console entries are added
  useEffect(() => {
    if (scrollAreaRef.current && consoleEntries.length > 0) {
      const scrollArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight
      }
    }
  }, [consoleEntries])

  return (
    <Box style={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Заголовок */}
      <Group justify="space-between" p="sm" bg="gray.1">
        <Group>
          <IconCode size={20} />
          <Text fw={500}>Панель скриптинга</Text>
        </Group>
        <Group gap="xs">
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
          <Tooltip label="Очистить консоль">
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={clearConsole}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Divider />

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
          theme="light"
          onKeyDown={(event) => {
            if (event.ctrlKey && event.key === 'Enter') {
              event.preventDefault()
              executeScript()
            }
          }}
        />
      </Box>

      <Divider />

      {/* Консоль */}
      <Box style={{ height: '200px', backgroundColor: 'var(--mantine-color-dark-9)', color: 'var(--mantine-color-gray-0)', flexShrink: 0 }}>
        <Text size="xs" p="xs" bg="dark.8" c="gray.4" fw={500}>
          Консоль разработчика
        </Text>
        <ScrollArea ref={scrollAreaRef} style={{ height: 'calc(100% - 30px)' }}>
          <Box p="xs">
            {consoleEntries.length === 0 ? (
              <Text size="sm" c="dimmed" fs="italic">
                Консоль пуста. Выполните скрипт для вывода результатов.
              </Text>
            ) : (
              consoleEntries.map((entry) => (
                <Box key={entry.id} mb="xs">
                  <Group gap="xs" align="flex-start">
                    <Text size="xs" c="dimmed" style={{ minWidth: '60px' }}>
                      {formatTimestamp(entry.timestamp)}
                    </Text>
                    <Text size="xs" c={getEntryColor(entry.type)} fw={entry.type === 'error' ? 600 : 400}>
                      {entry.type === 'error' && '❌ '}
                      {entry.type === 'result' && '→ '}
                      {entry.type === 'log' && '📝 '}
                    </Text>
                  </Group>
                  <Code
                    block
                    style={{
                      backgroundColor: 'var(--mantine-color-dark-8)',
                      color: entry.type === 'error' ? 'var(--mantine-color-red-4)' : 'var(--mantine-color-gray-2)',
                      fontSize: '12px',
                      marginTop: '4px'
                    }}
                  >
                    {entry.content}
                  </Code>
                </Box>
              ))
            )}
          </Box>
        </ScrollArea>
      </Box>
    </Box>
  )
}
