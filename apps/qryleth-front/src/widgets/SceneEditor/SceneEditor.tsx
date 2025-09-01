import React, { useState } from 'react'
import { SceneEditorR3F } from '@/features/scene'
import { LeftToolbar, RightToolbar, SceneEditorToolBar } from '@/features/scene-toolbar'
import { PlayControls } from '@/features/scene-play-mode'
import { SaveModal, saveNewScene, updateExistingScene } from '@/features/scene-persistence'
import { useSceneStore } from '@/features/scene/model/sceneStore'
import { notifications } from '@mantine/notifications'

export interface SceneEditorProps {
  /** UUID сцены для загрузки. Если не передан — создаётся новая сцена. */
  uuid?: string
  /** Флаг создания новой сцены. При true — сцена очищается и получает статус draft. */
  isNew?: boolean
  /** Показывать ли правую панель менеджера объектов. */
  showObjectManager?: boolean
}

/**
 * Виджет SceneEditor — точка композиции редактора сцены.
 *
 * Назначение:
 * - инкапсулировать выбор и сборку фич редактора сцены на уровне widgets (FSD);
 * - предоставлять стабильный публичный компонент для страниц (`pages/*`);
 * - постепенно изолировать логику раскладки/панелей в фиче `scene-layout`.
 *
 * На первом этапе виджет делегирует отрисовку существующему компоненту `SceneEditorR3F`.
 * По мере рефакторинга внутренняя композиция будет перемещаться в виджет.
 */
export const SceneEditor: React.FC<SceneEditorProps> = ({ uuid, isNew, showObjectManager = true }) => {
  const [saveOpened, setSaveOpened] = useState(false)
  const [pendingSave, setPendingSave] = useState<{ uuid?: string; name?: string } | null>(null)

  const handleSaveRequest = (payload: { uuid?: string; name?: string }) => {
    if (payload.uuid) {
      // Сохранить существующую сцену сразу
      const state = useSceneStore.getState()
      const data = state.getCurrentSceneData()
      updateExistingScene(payload.uuid, payload.name || 'Сцена', data)
        .then((sceneUuid) => {
          state.setSceneMetadata({ uuid: sceneUuid, name: payload.name || 'Сцена', status: 'saved' })
          notifications.show({ title: 'Успешно!', message: `Сцена "${payload.name}" сохранена`, color: 'green' })
        })
        .catch((err) => {
          console.error('Failed to save scene:', err)
          notifications.show({ title: 'Ошибка', message: 'Не удалось сохранить сцену', color: 'red' })
        })
    } else {
      // Новая сцена — открыть модал сохранения
      setPendingSave(payload)
      setSaveOpened(true)
    }
  }

  const handleSaveNew = async (name: string, description?: string) => {
    try {
      const state = useSceneStore.getState()
      const data = state.getCurrentSceneData()
      const sceneUuid = await saveNewScene(name, data, description)
      state.setSceneMetadata({ uuid: sceneUuid, name, status: 'saved' })
      notifications.show({ title: 'Успешно!', message: `Сцена "${name}" сохранена в библиотеку`, color: 'green' })
      return true
    } catch (error) {
      console.error('Failed to save scene:', error)
      notifications.show({ title: 'Ошибка', message: 'Не удалось сохранить сцену', color: 'red' })
      return false
    }
  }

  return (
    <>
      <SceneEditorR3F
        uuid={uuid}
        isNew={isNew}
        showObjectManager={showObjectManager}
        onSaveSceneRequest={handleSaveRequest}
        LeftToolbarComponent={LeftToolbar}
        RightToolbarComponent={RightToolbar}
        TopToolbarComponent={SceneEditorToolBar}
        PlayOverlayComponent={PlayControls}
      />
      <SaveModal
        opened={saveOpened}
        onClose={() => setSaveOpened(false)}
        onSave={handleSaveNew}
        currentSceneName={pendingSave?.name}
      />
    </>
  )
}

export default SceneEditor
