import React, { useState, useCallback, useEffect } from 'react'
import { Box, Group, Textarea, Button, Tooltip } from '@mantine/core'
import { sceneApi } from '../../lib/sceneAPI.ts'
import { ToolbarPanel } from './components/ToolbarPanel.tsx'
import { ScriptEditor } from './components/ScriptEditor.tsx'
import { SaveScriptModal } from './components/SaveScriptModal.tsx'
import { useScriptManager } from './hooks/useScriptManager.ts'
import { useCodeCompletion } from './hooks/useCodeCompletion.ts'
import { useTooltipCreation } from './hooks/useTooltipCreation.ts'
import { analyzeCurrentContext } from './utils/codeAnalysis.ts'
import { getDefaultScript, getTerrainTemplateGroups } from './constants/scriptTemplates.ts'
import { useAIScriptGenerator } from './hooks/useAIScriptGenerator.ts'

interface ScriptingPanelProps {
  height?: number | string
}

export const ScriptingPanel: React.FC<ScriptingPanelProps> = React.memo(({ height = 800 }) => {
  // Храним только JS-скрипт, выбор языка удалён
  const [script, setScript] = useState(() => getDefaultScript())
  const [currentMethodInfo, setCurrentMethodInfo] = useState<string | null>(null)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [saveScriptName, setSaveScriptName] = useState('')
  const [saveScriptDescription, setSaveScriptDescription] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')

  const scriptManager = useScriptManager()
  const { enhancedCompletions } = useCodeCompletion()
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
    setScript(getDefaultScript())
    scriptManager.createNewScript()
  }, [scriptManager])

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
      const result = await func(sceneApi, window.console)

      if (result !== undefined) {
        console.log('Результат выполнения скрипта:', result)
      }

      console.log('✓ Скрипт успешно выполнен')
    } catch (error) {
      console.error('Ошибка выполнения:', error instanceof Error ? error.message : String(error))
    }
  }, [script])

  /**
   * Обработчик генерации скрипта через ИИ (только JS):
   * - берёт текущий промпт и отправляет в модель
   * - извлекает из ответа код и подменяет содержимое редактора
   * - язык не переключается: панель поддерживает только JavaScript
   */
  const handleGenerateByAI = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return

    const result = await generateScript(aiPrompt)
    if (result && result.code) {
      setScript(result.code)
    }
  }, [aiPrompt, aiLoading, generateScript])

  const handleEditorChange = useCallback((value: string, viewUpdate: any) => {
    setScript(value)

    const selection = viewUpdate.state.selection.main
    const cursorPos = selection.head

    const methodInfo = analyzeCurrentContext(value, cursorPos)
    setCurrentMethodInfo(methodInfo)
  }, [])

  const templates = React.useMemo(() => getTerrainTemplateGroups(), [])
  const handleApplyTemplate = useCallback((name: string) => {
    // Поиск шаблона по имени во всех группах
    for (const group of Object.values(templates)) {
      if (group[name]) {
        setScript(group[name])
        return
      }
    }
  }, [templates])

  return (
    <Box style={{ height, display: 'flex', flexDirection: 'column', width: '100%' }}>
      <ToolbarPanel
        onNewScript={handleNewScript}
        savedScripts={scriptManager.savedScripts}
        selectedScriptUuid={scriptManager.selectedScriptUuid}
        onLoadScript={handleLoadScript}
        onSaveScript={openSaveModal}
        onEditScript={openSaveModal}
        onDeleteScript={handleDeleteScript}
        onExecuteScript={executeScript}
        templates={templates}
        onApplyTemplate={handleApplyTemplate}
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
