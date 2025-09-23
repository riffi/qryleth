import React from 'react'
import { ActionIcon, Badge, Button, Divider, Group, Tooltip, SegmentedControl } from '@mantine/core'
import { IconArrowBack, IconArrowForward, IconDeviceFloppy, IconPlayerPlay } from '@tabler/icons-react'
import { InlineEdit } from '@/shared/ui'
import { useSceneStore } from '../model/sceneStore'
import { useSceneHistory } from '@/features/editor/scene/lib/hooks/useSceneHistory'
import type { SceneStatus } from '@/entities/scene/types'

interface SceneHeaderRightProps {
  /**
   * Признак режима воспроизведения (Play). В этом режиме часть кнопок скрывается,
   * а иконка Play заменяется на Stop.
   */
  isPlay: boolean
  /**
   * Обработчик переключения режима Play ⟷ Edit. Передаётся с уровня виджета,
   * чтобы не создавать скрытую зависимость от внешнего контейнера.
   */
  onTogglePlay: () => void
  /**
   * Запрос на сохранение сцены. Виджет решает: открыть модал или
   * сохранить немедленно (в зависимости от наличия uuid и настроек).
   */
  onSaveSceneRequest?: (payload: { uuid?: string; name?: string }) => void
}

/**
 * Возвращает цвет бейджа статуса сцены по её статусу.
 * Используется для визуального индикатора состояния (черновик/изменена/сохранена).
 */
const getStatusColor = (status: SceneStatus) => {
  switch (status) {
    case 'draft':
      return 'orange'
    case 'modified':
      return 'yellow'
    case 'saved':
      return 'green'
    default:
      return 'gray'
  }
}

/**
 * Возвращает человекочитаемую подпись статуса сцены.
 */
const getStatusText = (status: SceneStatus) => {
  switch (status) {
    case 'draft':
      return 'Черновик'
    case 'modified':
      return 'Есть изменения'
    case 'saved':
      return 'Сохранена'
    default:
      return 'Неизвестно'
  }
}

/**
 * Компонент правой секции хедера редактора сцены.
 * Содержит инлайн-редактирование названия сцены, индикатор статуса,
 * кнопки Undo/Redo, кнопку сохранения и кнопку Play. Разметка повторяет прежний вид:
 * сохранение — через иконку дискеты, разделители Divider, Play — стилизованная кнопка.
 */
export const SceneHeaderRight: React.FC<SceneHeaderRightProps> = ({ isPlay, onTogglePlay, onSaveSceneRequest }) => {
  // История действий сцены (Undo/Redo)
  const { undo, redo, canUndo, canRedo } = useSceneHistory()

  // Метаданные сцены и действия стора
  const sceneMetaData = useSceneStore(s => s.sceneMetaData)
  const setSceneMetadata = useSceneStore.getState().setSceneMetadata
  const markSceneAsModified = useSceneStore.getState().markSceneAsModified

  // Локальный драфт имени сцены, чтобы не дёргать стор на каждый кейстрок
  const [sceneNameDraft, setSceneNameDraft] = React.useState<string>('')
  const [isEditingSceneName, setIsEditingSceneName] = React.useState<boolean>(false)

  // Синхронизация драфта при смене сцены/имени
  React.useEffect(() => {
    setSceneNameDraft(sceneMetaData?.name || '')
  }, [sceneMetaData?.name])

  /**
   * Обработчик изменения названия сцены в инлайн-редакторе.
   * Обновляет локальный драфт, не трогая стор до подтверждения.
   */
  const handleSceneNameChange = (value: string) => {
    setSceneNameDraft(value)
  }

  /**
   * Подтверждение изменения названия сцены. Обновляет метаданные в сторе
   * и помечает сцену как изменённую, если имя действительно поменялось.
   */
  const commitSceneName = () => {
    const prev = sceneMetaData?.name || ''
    const next = (sceneNameDraft || '').trim() || 'Сцена'
    if (next !== prev) {
      setSceneMetadata({ name: next })
      markSceneAsModified()
    }
    setIsEditingSceneName(false)
  }

  /**
   * Вызов запроса сохранения сцены. Делегируется виджету: он либо откроет
   * модал для новой сцены, либо сохранит существующую без диалога.
   */
  const handleSaveClick = () => {
    onSaveSceneRequest?.({ uuid: sceneMetaData?.uuid, name: sceneMetaData?.name })
  }

  const status = sceneMetaData?.status || 'draft'

  // Текущий тип неба из окружения сцены (procedural | hdri)
  const skyType = useSceneStore(s => s.environmentContent?.sky?.type || 'procedural')
  const setEnvSky = useSceneStore.getState().setEnvSky

  /**
   * Смена режима неба.
   * 
   * Назначение:
   * - Переключает тип неба между процедурным Sky и skybox (HDRI);
   * - Обновляет состояние окружения сцены через стор с записью в историю.
   */
  const handleSkyTypeChange = (value: string) => {
    const nextType = (value === 'hdri') ? 'hdri' : 'procedural'
    setEnvSky({ type: nextType })
  }

  return (
    <Group gap={8} wrap="nowrap" align="center">
      {/* Имя сцены и статус */}
      <Group gap={6} wrap="nowrap" align="center">
        <InlineEdit
          value={sceneNameDraft}
          onChange={handleSceneNameChange}
          onEditStart={() => setIsEditingSceneName(true)}
          onEditEnd={commitSceneName}
          size="xs"
          ariaLabel={'Название сцены'}
          placeholder={'Название сцены'}
          minInputWidth={160}
        />
        <Badge color={getStatusColor(status)} variant="light" size="sm">
          {getStatusText(status)}
        </Badge>
      </Group>

      {/* Сохранить — как раньше: показываем, если статус не "saved" */}
      {!isPlay && status !== 'saved' && (
        <Tooltip label="Сохранить (Ctrl/Cmd+S)" withArrow>
          <ActionIcon
            size="md"
            variant={'subtle'}
            color={'blue'}
            onClick={handleSaveClick}
            aria-label={'Сохранить'}
          >
            <IconDeviceFloppy size={24} />
          </ActionIcon>
        </Tooltip>
      )}

      {/* Разделитель */}
      {!isPlay && <Divider ml="md" mr="md" orientation="vertical" />}

      {/* Переключатель вида неба: Procedural | Skybox */}
      {!isPlay && (
        <>
          <Tooltip label="Вид неба: процедурное или skybox (EXR)" withArrow>
            <SegmentedControl
              size="xs"
              data={[
                { label: 'Проц. небо', value: 'procedural' },
                { label: 'Skybox', value: 'hdri' }
              ]}
              value={skyType}
              onChange={handleSkyTypeChange}
            />
          </Tooltip>
          <Divider ml="md" mr="md" orientation="vertical" />
        </>
      )}

      {/* Undo / Redo — как в прежней вёрстке */}
      {!isPlay && (
        <>
          <Tooltip label="Отменить (Ctrl+Z)">
            <ActionIcon variant="subtle" size="sm" onClick={undo} disabled={!canUndo}>
              <IconArrowBack size={'1.5rem'} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Вернуть (Ctrl+Y)">
            <ActionIcon variant="subtle" size="sm" onClick={redo} disabled={!canRedo}>
              <IconArrowForward size={'1.5rem'} />
            </ActionIcon>
          </Tooltip>

          <Divider ml="md" mr="md" orientation="vertical" />
        </>
      )}

      {/* Play — стилизованная кнопка (header скрыт в Play) */}
      {!isPlay && (
        <Tooltip label="Войти в режим просмотра (Play)" withArrow>
          <Button
            variant={'gradient'}
            style={{ height: '32px' }}
            onClick={onTogglePlay}
            rightSection={<IconPlayerPlay size={18} />}
          >
            Play
          </Button>
        </Tooltip>
      )}
    </Group>
  )
}

export default SceneHeaderRight
