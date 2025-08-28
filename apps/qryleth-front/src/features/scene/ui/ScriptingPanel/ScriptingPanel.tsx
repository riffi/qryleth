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
import { getDefaultScript } from './templates'
import { getTemplateGroups } from './templates'
import { TemplatePickerModal } from './components/TemplatePickerModal'
import { useAIScriptGenerator } from './hooks/useAIScriptGenerator.ts'

interface ScriptingPanelProps {
  height?: number | string
}

/**
 * Основной компонент панели скриптинга.
 * 
 * Предоставляет редактор JS-кода, автокомплит, подсказки по API, генерацию кода ИИ,
 * управление сохранёнными скриптами и выбор шаблонов через полноэкранное окно.
 */
export const ScriptingPanel: React.FC<ScriptingPanelProps> = React.memo(({ height = 800 }) => {
  // Храним только JS-скрипт, выбор языка удалён
  const [script, setScript] = useState(() => getDefaultScript())
  const [currentMethodInfo, setCurrentMethodInfo] = useState<string | null>(null)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false)
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

  /**
   * Сохранить текущий скрипт:
   * - проверяет валидность имени
   * - сохраняет имя и описание в менеджере скриптов
   * - закрывает модалку и очищает поля при успехе
   */
  const handleSaveScript = useCallback(async () => {
    if (!saveScriptName.trim()) return

    const success = await scriptManager.saveScript(saveScriptName, script, saveScriptDescription)
    if (success) {
      setIsSaveModalOpen(false)
      setSaveScriptName('')
      setSaveScriptDescription('')
    }
  }, [saveScriptName, saveScriptDescription, script, scriptManager])

  /**
   * Загрузить ранее сохранённый скрипт по UUID и заменить содержимое редактора.
   */
  const handleLoadScript = useCallback(async (scriptUuid: string) => {
    const content = await scriptManager.loadScript(scriptUuid)
    if (content) {
      setScript(content)
    }
  }, [scriptManager])

  /**
   * Удалить сохранённый скрипт по его UUID из локального хранилища.
   */
  const handleDeleteScript = useCallback(async (scriptUuid: string) => {
    await scriptManager.deleteScript(scriptUuid)
  }, [scriptManager])

  /**
   * Создать новый скрипт: подставить дефолтный шаблон и сбросить состояние редактора.
   */
  const handleNewScript = useCallback(() => {
    setScript(getDefaultScript())
    scriptManager.createNewScript()
  }, [scriptManager])

  /**
   * Открыть окно сохранения. Если редактируем сохранённый скрипт —
   * подставить текущее имя и описание для удобства.
   */
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

  /**
   * Выполнить код из редактора с поддержкой async-функций.
   * Результат (если есть) и ошибки — в консоль.
   */
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
  /**
   * Сгенерировать код по описанию с помощью ИИ и заменить содержимое редактора.
   */
  const handleGenerateByAI = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return

    const result = await generateScript(aiPrompt)
    if (result && result.code) {
      setScript(result.code)
    }
  }, [aiPrompt, aiLoading, generateScript])

  /**
   * Обработчик редактора: сохраняет текст, анализирует контекст под курсором
   * для показа подсказок и справки по методам.
   */
  const handleEditorChange = useCallback((value: string, viewUpdate: any) => {
    setScript(value)

    const selection = viewUpdate.state.selection.main
    const cursorPos = selection.head

    const methodInfo = analyzeCurrentContext(value, cursorPos)
    setCurrentMethodInfo(methodInfo)
  }, [])

  /**
   * Группы шаблонов для нового модального выбора.
   */
  const templateGroups = React.useMemo(() => getTemplateGroups(), [])

  /**
   * Применить выбранный шаблон: подставить код и закрыть выбор.
   */
  const handleSelectTemplate = useCallback((tpl: { code: string }) => {
    setScript(tpl.code)
    setIsTemplatePickerOpen(false)
  }, [])

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
        onOpenTemplatePicker={() => setIsTemplatePickerOpen(true)}
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

      <TemplatePickerModal
        opened={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        groups={templateGroups}
        onSelect={handleSelectTemplate}
      />
    </Box>
  )
})
