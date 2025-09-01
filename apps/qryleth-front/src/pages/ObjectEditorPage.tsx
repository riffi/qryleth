import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MainLayout from '@/widgets/layouts/MainLayout'
import { PanelToggleButtons } from '@/features/editor/object'
import { ObjectEditor } from '@/widgets/ObjectEditor'
import { Title, Group, ActionIcon, Tooltip, Modal, Stack, TextInput, Button } from '@mantine/core'
import { IconDeviceFloppy } from '@tabler/icons-react'
import { db } from '@/shared/lib/database'
import type { ObjectRecord } from '@/shared/api/types'
import type { GfxObject } from '@/entities/object'
import { useGlobalPanelState } from '@/features/editor/object/hooks'
import { buildUpdatedObject, generateObjectPreview } from '@/features/editor/object/lib'

const ObjectEditorPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [objectRecord, setObjectRecord] = useState<ObjectRecord | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [saveModalOpened, setSaveModalOpened] = useState(false)
  const [objectName, setObjectName] = useState('')
  const [pendingObject, setPendingObject] = useState<GfxObject | null>(null)
  const globalPanelState = useGlobalPanelState()

  useEffect(() => {
    const loadObject = async () => {
      try {
        // Проверяем готовность базы данных
        const isDbReady = await db.isReady()
        if (!isDbReady) {
          console.error('Database not ready')
          setIsReady(true)
          return
        }
        
        if (id) {
          const record = await db.getObject(id)
          if (record) setObjectRecord(record)
        }
        setIsReady(true)
      } catch (error) {
        console.error('Error loading object:', error)
        setIsReady(true)
      }
    }
    
    loadObject()
  }, [id])

  /**
   * Сохраняет изменения текущего объекта в базе данных с автоматической генерацией превью.
   * Используем UUID записи библиотеки, иначе объект не обновится.
   */
  const handleSave = async (object: GfxObject) => {
    try {
      // Проверяем готовность базы данных
      const isDbReady = await db.isReady()
      if (!isDbReady) {
        throw new Error('База данных не готова к работе')
      }
      
      if (objectRecord) {
        // Генерируем превью для обновляемого объекта
        let thumbnail: string | undefined
        try {
          const previewDataUrl = await generateObjectPreview(object, false)
          thumbnail = previewDataUrl || undefined
        } catch (error) {
          console.warn('Не удалось сгенерировать превью при обновлении:', error)
        }
        
        // Обновляем существующий объект с превью
        await db.updateObject(objectRecord.uuid, {
          objectData: object,
          thumbnail
        })
      } else {
        // Генерируем превью для нового объекта
        let thumbnail: string | undefined
        try {
          const previewDataUrl = await generateObjectPreview(object, false)
          thumbnail = previewDataUrl || undefined
        } catch (error) {
          console.warn('Не удалось сгенерировать превью при создании:', error)
        }
        
        // Создаем новый объект с превью
        const uuid = await db.saveObject(object.name, object, undefined, thumbnail)
        setObjectRecord({
          uuid,
          name: object.name,
          objectData: object,
          thumbnail,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
      
      navigate('/')
    } catch (error) {
      console.error('Error saving object:', error)
      // Добавим уведомление об ошибке
      alert(`Ошибка сохранения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  /**
   * Обработчик для сохранения нового объекта с введенным именем и автоматической генерацией превью
   */
  const handleSaveNewObject = async () => {
    if (!pendingObject) return
    
    const trimmedName = objectName.trim()
    if (!trimmedName) return

    const objectWithName = {
      ...pendingObject,
      name: trimmedName
    }

    try {
      // Проверяем готовность базы данных
      const isDbReady = await db.isReady()
      if (!isDbReady) {
        throw new Error('База данных не готова к работе')
      }

      // Генерируем превью для нового объекта
      let thumbnail: string | undefined
      try {
        const previewDataUrl = await generateObjectPreview(objectWithName, false)
        thumbnail = previewDataUrl || undefined
      } catch (error) {
        console.warn('Не удалось сгенерировать превью для нового объекта:', error)
      }

      // Создаем новый объект с превью
      const uuid = await db.saveObject(trimmedName, objectWithName, undefined, thumbnail)
      setObjectRecord({
        uuid,
        name: trimmedName,
        objectData: objectWithName,
        thumbnail,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      setSaveModalOpened(false)
      setObjectName('')
      setPendingObject(null)
      navigate('/')
    } catch (error) {
      console.error('Error saving new object:', error)
      alert(`Ошибка сохранения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  /**
   * Закрывает модальное окно и сбрасывает состояние
   */
  const handleCloseModal = () => {
    setSaveModalOpened(false)
    setObjectName('')
    setPendingObject(null)
  }

  /**
   * Формирует объект из состояния редактора и сохраняет его.
   */
  const handleSaveClick = () => {
    const updated = buildUpdatedObject(objectRecord?.objectData || {
      uuid: '',
      name: 'Новый объект',
      primitives: [],
      materials: [],
      primitiveGroups: {},
      primitiveGroupAssignments: {}
    })

    if (objectRecord) {
      // Для существующего объекта сохраняем сразу
      handleSave(updated)
    } else {
      // Для нового объекта показываем модальное окно для ввода имени
      setPendingObject(updated)
      setObjectName('Новый объект')
      setSaveModalOpened(true)
    }
  }

  const headerRightSection = (
    <>
      <Title order={4} mr="3rem">
        {objectRecord?.objectData ? `Редактор объекта: ${objectRecord.objectData.name}` : 'Новый объект'}
      </Title>
      <Group gap="xs">
        <Tooltip label="Сохранить" withArrow>
          <ActionIcon variant="subtle"  color="white"onClick={handleSaveClick}>
            <IconDeviceFloppy size={24} />  
          </ActionIcon>
        </Tooltip>
        <PanelToggleButtons
          activeLeftPanel={globalPanelState.panelState.leftPanel}
          activeRightPanel={globalPanelState.panelState.rightPanel}
          onToggle={globalPanelState.togglePanel}
          size="md"
        />
      </Group>
    </>
  )

  if (!isReady) {
    return (
      <MainLayout rightSection={headerRightSection}>
        <div style={{ padding: '1rem' }}>Загрузка...</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout rightSection={headerRightSection}>
      <ObjectEditor mode="page"
        objectData={objectRecord?.objectData || {
          uuid: '',
          name: 'Новый объект',
          primitives: [],
          materials: [],
          primitiveGroups: {},
          primitiveGroupAssignments: {}
        }}
        externalLayoutState={globalPanelState}
      />
      
      {/* Модальное окно для ввода имени нового объекта */}
      <Modal opened={saveModalOpened} onClose={handleCloseModal} title="Сохранить новый объект" size="sm">
        <Stack gap="md">
          <TextInput
            label="Название объекта"
            value={objectName}
            onChange={(e) => setObjectName(e.currentTarget.value)}
            placeholder="Введите название объекта"
            autoFocus
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleCloseModal}>
              Отмена
            </Button>
            <Button onClick={handleSaveNewObject}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </Modal>
    </MainLayout>
  )
}

export default ObjectEditorPage
