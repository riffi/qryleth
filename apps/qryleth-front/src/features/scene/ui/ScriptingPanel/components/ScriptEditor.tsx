import React, { memo } from 'react'
import { Box } from '@mantine/core'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { autocompletion } from '@codemirror/autocomplete'
import { oneDark } from '@codemirror/theme-one-dark'
 

interface ScriptEditorProps {
  /** Текущий текст скрипта (JavaScript) */
  script: string
  /** Обработчик изменений текста редактора */
  onChange: (value: string, viewUpdate: any) => void
  /** Расширение автодополнения */
  completionExtension: any
  /** Расширение для hover‑подсказок */
  hoverTooltipExtension: any
}

export const ScriptEditor = memo<ScriptEditorProps>(({ 
  script,
  onChange,
  completionExtension,
  hoverTooltipExtension
}) => {
  return (
    <Box style={{ flex: '1', minHeight: 0, position: 'relative', width: '100%' }}>

      <CodeMirror
        value={script}
        onChange={onChange}
        extensions={[
          javascript({ typescript: false }),
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
        style={{ 
          height: '100%',
          width: '100%'
        }}
      />
    </Box>
  )
})
