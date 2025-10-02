import React from 'react'
import { ActionIcon, Group, Modal, SegmentedControl, Text, Tooltip, Button } from '@mantine/core'
import { IconCube, IconTrees, IconPencil, IconLeaf } from '@tabler/icons-react'
import { useObjectStore } from '@/features/editor/object/model/objectStore'

/**
 * Индикатор типа редактируемого объекта с кнопкой изменения типа.
 *
 * Показывает иконку текущего типа ('regular' | 'tree') и кнопку редактирования.
 * При нажатии открывает модальное окно, в котором можно выбрать тип объекта.
 * При смене типа выполняется очистка всех примитивов и параметров генерации,
 * при этом материалы остаются без изменений.
 */
export const ObjectTypeIndicator: React.FC<{ size?: 'sm' | 'md' | 'lg'; withLabel?: boolean }>
  = ({ size = 'md', withLabel = false }) => {
  const objectType = useObjectStore(s => s.objectType)
  const setObjectType = useObjectStore(s => s.setObjectType)
  const setTreeData = useObjectStore(s => s.setTreeData)
  const setPrimitives = useObjectStore(s => s.setPrimitives)
  const setGrassData = useObjectStore(s => s.setGrassData)
  const setPrimitiveGroups = useObjectStore(s => s.setPrimitiveGroups)
  const setPrimitiveGroupAssignments = useObjectStore(s => s.setPrimitiveGroupAssignments)
  const setRockData = useObjectStore(s => (s as any).setRockData)

  const [opened, setOpened] = React.useState(false)
  const [nextType, setNextType] = React.useState<'regular' | 'tree' | 'grass' | 'rock'>(objectType || 'regular')

  /**
   * Подтверждает смену типа объекта: очищает примитивы/группы/привязки и параметры дерева,
   * затем устанавливает выбранный тип объекта в сторе ObjectEditor.
   */
  const applyTypeChange = () => {
    // Очищаем примитивы и группировки
    setPrimitives([])
    setPrimitiveGroups({})
    setPrimitiveGroupAssignments({})
    // Сбрасываем параметры генерации дерева/травы/камня
    setTreeData(undefined)
    setGrassData(undefined)
    setRockData?.(undefined as any)
    // Устанавливаем новый тип
    setObjectType(nextType)
    setOpened(false)
  }

  const Icon = objectType === 'tree' ? IconTrees : objectType === 'grass' ? IconLeaf : IconCube
  const iconTitle = objectType === 'tree' ? 'Процедурный объект: Дерево' : objectType === 'grass' ? 'Процедурный объект: Трава' : objectType === 'rock' ? 'Процедурный объект: Камень' : 'Обычный объект'
  const iconPx = size === 'lg' ? 22 : size === 'md' ? 18 : 16
  const textSize = size === 'lg' ? 'md' : size === 'md' ? 'sm' : 'xs'
  const editIconPx = size === 'lg' ? 18 : size === 'md' ? 16 : 14

  return (
    <>
      <Group gap={6} align="center">
        <Tooltip label={iconTitle} withArrow>
          <span>
            <Icon size={iconPx} />
          </span>
        </Tooltip>
        {withLabel && (
          <Text size={textSize} c="dimmed" fw={500}>
            {objectType === 'tree' ? 'Дерево' : objectType === 'grass' ? 'Трава' : 'Обычный'}
          </Text>
        )}
        <Tooltip label="Изменить тип объекта" withArrow>
          <ActionIcon variant="subtle" size={size === 'lg' ? 'md' : size} onClick={() => { setNextType(objectType || 'regular'); setOpened(true) }}>
            <IconPencil size={editIconPx} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Modal opened={opened} onClose={() => setOpened(false)} title="Тип объекта" size="sm">
        <Text size="sm" c="dimmed" mb="xs">
          Выберите тип объекта. При изменении типа все примитивы и параметры генерации будут очищены.
        </Text>
        <SegmentedControl
          fullWidth
          value={nextType}
          onChange={(v) => setNextType(v as 'regular' | 'tree' | 'grass' | 'rock')}
          data={[
            { label: 'Обычный', value: 'regular' },
            { label: 'Дерево', value: 'tree' },
            { label: 'Трава', value: 'grass' },
            { label: 'Камень', value: 'rock' },
          ]}
        />
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={() => setOpened(false)}>Отмена</Button>
          <Button onClick={applyTypeChange}>Применить</Button>
        </Group>
      </Modal>
    </>
  )
}

export default ObjectTypeIndicator
