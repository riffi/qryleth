import React, { useState } from 'react'
import { SceneEditorR3F } from '@/features/editor/scene/ui'
import { LeftToolbar, RightToolbar, SceneEditorToolBar } from '@/features/editor/scene/toolbar'
import { PlayControls, usePlayHotkeys } from '@/features/scene-play-mode'
import { useGlobalPanelState } from '@/features/editor/object/hooks'
import { ObjectEditor } from '@/widgets/ObjectEditor'
import { Modal, Group, Tooltip, ActionIcon, Text } from '@mantine/core'
import { IconDeviceFloppy } from '@tabler/icons-react'
import { SaveModal, saveNewScene, updateExistingScene } from '@/features/scene-persistence'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
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
  const [editorOpened, setEditorOpened] = useState(false)
  const [editingObject, setEditingObject] = useState<{ objectUuid: string; instanceId?: string } | null>(null)
  const globalPanelState = useGlobalPanelState()
  // Play‑hotkeys: обрабатываются на уровне виджета (FSD: features → widgets)
  const uiMode = useSceneStore(s => s.uiMode)
  const setViewMode = useSceneStore(s => s.setViewMode)
  const togglePlay = useSceneStore(s => s.togglePlay)
  usePlayHotkeys({ uiMode, onExitPlay: () => togglePlay(), onSetViewMode: (m) => setViewMode(m as any) })

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

  const objects = useSceneStore(s => s.objects)
  const updateObject = useSceneStore(s => s.updateObject)

  const editingObjectData = React.useMemo(() => {
    if (!editingObject) return undefined
    const obj = objects.find(o => o.uuid === editingObject.objectUuid)
    if (!obj) return undefined
    return JSON.parse(JSON.stringify(obj))
  }, [editingObject, objects])

  const handleRequestEditObject = (objectUuid: string, instanceId?: string) => {
    setEditingObject({ objectUuid, instanceId })
    setEditorOpened(true)
  }

  const handleEditorSaveClick = () => {
    if (!editingObjectData) return
    updateObject(editingObjectData.uuid, {
      primitives: editingObjectData.primitives,
      materials: editingObjectData.materials,
      boundingBox: editingObjectData.boundingBox,
      primitiveGroups: editingObjectData.primitiveGroups,
      primitiveGroupAssignments: editingObjectData.primitiveGroupAssignments,
    })
    notifications.show({ title: 'Успешно!', message: 'Изменения объекта сохранены', color: 'green' })
    setEditorOpened(false)
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
        onRequestEditObject={handleRequestEditObject}
      />
      <Modal
        opened={editorOpened}
        onClose={() => setEditorOpened(false)}
        fullScreen
        styles={{
          body: { height: 'calc(100dvh - 120px)', padding: 0 },
          content: { height: '100dvh' },
          header: { padding: '1rem' },
          title: { flexGrow: 1, marginRight: '2rem' }
        }}
        title={
          <Group justify="space-between" style={{ width: '100%' }}>
            <Text size="lg" fw={500}>{editingObjectData ? `Редактор объекта: ${editingObjectData.name}` : 'Редактор объекта'}</Text>
            <Group gap="xs">
              <Tooltip label="Сохранить" withArrow>
                <ActionIcon color="gray" variant="subtle" onClick={handleEditorSaveClick}>
                  <IconDeviceFloppy size={24} />
                </ActionIcon>
              </Tooltip>
              {/* Панели ObjectEditor управляются его встроенными тулбарами */}
            </Group>
          </Group>
        }
      >
        <ObjectEditor mode="embedded" objectData={editingObjectData} externalLayoutState={globalPanelState} />
      </Modal>
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
