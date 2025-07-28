import React, { useState, useCallback } from 'react'
import { Box, Button, Group, Text, Tooltip } from '@mantine/core'
import { IconPlayerPlay, IconCode } from '@tabler/icons-react'
import { SceneAPI } from '../lib/sceneAPI'
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


  const executeScript = useCallback(() => {
    if (!script.trim()) return

    try {
      // Выполнить скрипт с доступом к SceneAPI и нативной консоли
      const func = new Function('sceneApi', 'console', script)
      const result = func(SceneAPI, window.console)

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
      {/* Заголовок */}
      <Group justify="space-between" p="sm" bg="gray.8">
        <Group>
          <IconCode size={20} />
          <Text fw={500}>Панель скриптинга</Text>
        </Group>
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
    </Box>
  )
}
