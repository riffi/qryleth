import { useState, useCallback } from 'react'
import { db, type ScriptRecord } from '@/shared/lib/database'

export const useScriptManager = () => {
  const [savedScripts, setSavedScripts] = useState<ScriptRecord[]>([])
  const [selectedScriptUuid, setSelectedScriptUuid] = useState<string | null>(null)
  const [currentScriptUuid, setCurrentScriptUuid] = useState<string | null>(null)

  const loadSavedScripts = useCallback(async () => {
    try {
      const scripts = await db.getAllScripts()
      setSavedScripts(scripts)
    } catch (error) {
      console.error('Ошибка загрузки скриптов:', error)
    }
  }, [])

  const saveScript = useCallback(async (name: string, content: string, description?: string) => {
    if (!name.trim()) return false

    try {
      if (currentScriptUuid) {
        await db.updateScript(currentScriptUuid, {
          name,
          description: description || undefined,
          content
        })
        console.log('✓ Скрипт обновлён')
      } else {
        const uuid = await db.saveScript(name, content, description || undefined)
        setCurrentScriptUuid(uuid)
        console.log('✓ Скрипт сохранён')
      }
      
      await loadSavedScripts()
      return true
    } catch (error) {
      if (error instanceof Error && error.name === 'DuplicateNameError') {
        console.error('Ошибка: Скрипт с таким именем уже существует')
      } else {
        console.error('Ошибка сохранения скрипта:', error)
      }
      return false
    }
  }, [currentScriptUuid, loadSavedScripts])

  const loadScript = useCallback(async (scriptUuid: string): Promise<string | null> => {
    try {
      const scriptRecord = await db.getScript(scriptUuid)
      if (scriptRecord) {
        setCurrentScriptUuid(scriptRecord.uuid)
        setSelectedScriptUuid(scriptUuid)
        console.log('✓ Скрипт загружен:', scriptRecord.name)
        return scriptRecord.content
      }
      return null
    } catch (error) {
      console.error('Ошибка загрузки скрипта:', error)
      return null
    }
  }, [])

  const deleteScript = useCallback(async (scriptUuid: string) => {
    try {
      await db.deleteScript(scriptUuid)
      await loadSavedScripts()
      
      if (currentScriptUuid === scriptUuid) {
        setCurrentScriptUuid(null)
        setSelectedScriptUuid(null)
      }
      
      console.log('✓ Скрипт удалён')
      return true
    } catch (error) {
      console.error('Ошибка удаления скрипта:', error)
      return false
    }
  }, [currentScriptUuid, loadSavedScripts])

  const createNewScript = useCallback(() => {
    setCurrentScriptUuid(null)
    setSelectedScriptUuid(null)
  }, [])

  const getCurrentScriptInfo = useCallback(() => {
    if (currentScriptUuid) {
      return savedScripts.find(s => s.uuid === currentScriptUuid)
    }
    return null
  }, [currentScriptUuid, savedScripts])

  return {
    savedScripts,
    selectedScriptUuid,
    currentScriptUuid,
    loadSavedScripts,
    saveScript,
    loadScript,
    deleteScript,
    createNewScript,
    getCurrentScriptInfo
  }
}