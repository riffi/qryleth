import React, { useState, useCallback, useEffect } from 'react'
import { Box, Group, Textarea, Button, Tooltip } from '@mantine/core'
import { SceneAPI } from '../../lib/sceneAPI.ts'
import { ToolbarPanel } from './components/ToolbarPanel.tsx'
import { ScriptEditor } from './components/ScriptEditor.tsx'
import { SaveScriptModal } from './components/SaveScriptModal.tsx'
import { useScriptManager } from './hooks/useScriptManager.ts'
import { useCodeCompletion } from './hooks/useCodeCompletion.ts'
import { useTooltipCreation } from './hooks/useTooltipCreation.ts'
import { analyzeCurrentContext } from './utils/codeAnalysis.ts'
import { getDefaultScript, type LanguageMode } from './constants/scriptTemplates.ts'
import { useAIScriptGenerator } from './hooks/useAIScriptGenerator.ts'

interface ScriptingPanelProps {
  height?: number | string
}

export const ScriptingPanel: React.FC<ScriptingPanelProps> = React.memo(({ height = 800 }) => {
  const [script, setScript] = useState(() => getDefaultScript('javascript'))
  const [languageMode, setLanguageMode] = useState<LanguageMode>('javascript')
  const [currentMethodInfo, setCurrentMethodInfo] = useState<string | null>(null)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [saveScriptName, setSaveScriptName] = useState('')
  const [saveScriptDescription, setSaveScriptDescription] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')

  const scriptManager = useScriptManager()
  const { enhancedCompletions } = useCodeCompletion(languageMode)
  const { createHoverTooltipExtension } = useTooltipCreation()
  const { loading: aiLoading, error: aiError, generateScript } = useAIScriptGenerator()

  useEffect(() => {
    scriptManager.loadSavedScripts()
  }, [scriptManager])

  const handleSaveScript = useCallback(async () => {
    if (!saveScriptName.trim()) return

    const success = await scriptManager.saveScript(saveScriptName, script, saveScriptDescription)
    if (success) {
      setIsSaveModalOpen(false)
      setSaveScriptName('')
      setSaveScriptDescription('')
    }
  }, [saveScriptName, saveScriptDescription, script, scriptManager])

  const handleLoadScript = useCallback(async (scriptUuid: string) => {
    const content = await scriptManager.loadScript(scriptUuid)
    if (content) {
      setScript(content)
    }
  }, [scriptManager])

  const handleDeleteScript = useCallback(async (scriptUuid: string) => {
    await scriptManager.deleteScript(scriptUuid)
  }, [scriptManager])

  const handleNewScript = useCallback(() => {
    setScript(getDefaultScript(languageMode))
    scriptManager.createNewScript()
  }, [languageMode, scriptManager])

  const openSaveModal = useCallback(() => {
    const currentScript = scriptManager.getCurrentScriptInfo()
    if (currentScript) {
      setSaveScriptName(currentScript.name)
      setSaveScriptDescription(currentScript.description || '')
    } else {
      setSaveScriptName('')
      setSaveScriptDescription('')
    }
    setIsSaveModalOpen(true)
  }, [scriptManager])

  const executeScript = useCallback(async () => {
    if (!script.trim()) return

    try {
      const asyncScript = `
        return (async () => {
          ${script}
        })();
      `

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

  /**
   * Обработчик генерации скрипта через ИИ:
   * - берёт текущий промпт из состояния
   * - отправляет запрос к активной модели (через fetch)
   * - по получении ответа извлекает код и подменяет содержимое редактора
   * - при наличии подсказки по языку — переключает режим редактора
   */
  const handleGenerateByAI = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return

    const result = await generateScript(aiPrompt)
    if (result && result.code) {
      setScript(result.code)
      if (result.language && (result.language === 'javascript' || result.language === 'typescript')) {
        setLanguageMode(result.language)
      }
    }
  }, [aiPrompt, aiLoading, generateScript])

  const handleEditorChange = useCallback((value: string, viewUpdate: any) => {
    setScript(value)

    const selection = viewUpdate.state.selection.main
    const cursorPos = selection.head

    const methodInfo = analyzeCurrentContext(value, cursorPos)
    setCurrentMethodInfo(methodInfo)
  }, [])

  const handleLanguageModeChange = useCallback((mode: LanguageMode) => {
    setLanguageMode(mode)
    if (!script.trim() || script === getDefaultScript('javascript') || script === getDefaultScript('typescript')) {
      setScript(getDefaultScript(mode))
    }
  }, [script])

  return (
    <Box style={{ height, display: 'flex', flexDirection: 'column', width: '100%' }}>
      <ToolbarPanel
        languageMode={languageMode}
        onLanguageModeChange={handleLanguageModeChange}
        onNewScript={handleNewScript}
        savedScripts={scriptManager.savedScripts}
        selectedScriptUuid={scriptManager.selectedScriptUuid}
        onLoadScript={handleLoadScript}
        onSaveScript={openSaveModal}
        onEditScript={openSaveModal}
        onDeleteScript={handleDeleteScript}
        onExecuteScript={executeScript}
      />

      {/* Панель генерации скрипта ИИ */}
      <Box p="sm" style={{ borderTop: '1px solid var(--mantine-color-dark-5)', borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
        <Group align="flex-end" gap="sm" wrap="nowrap">
          <Textarea
            label="Промпт для ИИ"
            description={aiError ? `Ошибка: ${aiError}` : 'Опишите желаемые изменения в сцене. ИИ вернёт готовый код.'}
            autosize
            minRows={2}
            maxRows={6}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Tooltip label={aiLoading ? 'Ожидание ответа модели...' : 'Сгенерировать скрипт ИИ и подменить текущий код'}>
            <Button loading={aiLoading} onClick={handleGenerateByAI} variant="light">
              Отправить
            </Button>
          </Tooltip>
        </Group>
      </Box>

      <ScriptEditor
        script={script}
        onChange={handleEditorChange}
        languageMode={languageMode}
        completionExtension={enhancedCompletions}
        hoverTooltipExtension={createHoverTooltipExtension}
        currentMethodInfo={currentMethodInfo}
      />

      <SaveScriptModal
        opened={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        isEditing={!!scriptManager.currentScriptUuid}
        scriptName={saveScriptName}
        scriptDescription={saveScriptDescription}
        onNameChange={setSaveScriptName}
        onDescriptionChange={setSaveScriptDescription}
        onSave={handleSaveScript}
      />
    </Box>
  )
})
