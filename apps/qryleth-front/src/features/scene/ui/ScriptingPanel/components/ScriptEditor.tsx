import React, { memo } from 'react'
import { Box, Paper, Group, Text } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { autocompletion } from '@codemirror/autocomplete'
import { oneDark } from '@codemirror/theme-one-dark'
import type { LanguageMode } from '../constants/scriptTemplates'

interface ScriptEditorProps {
  script: string
  onChange: (value: string, viewUpdate: any) => void
  languageMode: LanguageMode
  completionExtension: any
  hoverTooltipExtension: any
  currentMethodInfo: string | null
}

export const ScriptEditor = memo<ScriptEditorProps>(({
  script,
  onChange,
  languageMode,
  completionExtension,
  hoverTooltipExtension,
  currentMethodInfo
}) => {
  return (
    <Box style={{ flex: '1', minHeight: 0, position: 'relative' }}>
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
        onChange={onChange}
        extensions={[
          javascript({ typescript: languageMode === 'typescript' }),
          autocompletion({ override: [completionExtension] }),
          hoverTooltipExtension
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
  )
})