import React from 'react'
import {
  Paper,
  Stack,
  Text,
  Group,
  Badge,
  ScrollArea,
  ActionIcon,
  Box,
  Tooltip
} from '@mantine/core'
import { IconEye, IconEyeOff, IconCube } from '@tabler/icons-react'
import {
  useObjectPrimitives,
  useObjectSelectedPrimitiveIds,
  useObjectHoveredPrimitiveId,
  useObjectStore
} from '../model/objectStore'
import { getPrimitiveDisplayName } from '@/entities/primitive'

/**
 * Элемент примитива в списке PrimitiveManager
 */
const PrimitiveItem: React.FC<{
  primitive: any
  index: number
  isSelected: boolean
  isHovered: boolean
  onSelect: (index: number) => void
  onHover: (index: number | null) => void
}> = ({ primitive, index, isSelected, isHovered, onSelect, onHover }) => {
  const [isVisible, setIsVisible] = React.useState(true)

  return (
    <Box
      style={{
        padding: '8px 12px',
        borderRadius: 4,
        cursor: 'pointer',
        backgroundColor: isSelected ? 'var(--mantine-color-blue-1)' : 'transparent',
        transition: 'all 0.15s ease'
      }}
      onClick={() => onSelect(index)}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      <Group gap="xs" wrap="nowrap">
        <IconCube size={16} color={isSelected ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-6)'} />

        <Text
          size="sm"
          style={{ flex: 1 }}
          fw={isSelected ? 500 : 400}
          c={isSelected ? 'blue' : undefined}
        >
          {getPrimitiveDisplayName(primitive, index)}
        </Text>

        <Group gap="xs">
          <Tooltip label={isVisible ? 'Скрыть примитив' : 'Показать примитив'}>
            <ActionIcon
              size="xs"
              variant="subtle"
              color={isVisible ? 'blue' : 'gray'}
              onClick={(e) => {
                e.stopPropagation()
                setIsVisible(!isVisible)
              }}
            >
              {isVisible ? <IconEye size={12} /> : <IconEyeOff size={12} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Box>
  )
}

/**
 * Панель управления примитивами, аналогичная ObjectManager по стилю
 */
export const PrimitiveManager: React.FC = () => {
  const primitives = useObjectPrimitives()
  const selectedPrimitiveIds = useObjectSelectedPrimitiveIds()
  const hoveredPrimitiveId = useObjectHoveredPrimitiveId()
  const { selectPrimitive, togglePrimitiveSelection, setHoveredPrimitive } = useObjectStore()

  const handlePrimitiveSelect = (index: number) => {
    // Поддержка множественного выбора с Ctrl
    const event = window.event as KeyboardEvent
    if (event?.ctrlKey || event?.metaKey) {
      togglePrimitiveSelection(index)
    } else {
      selectPrimitive(index)
    }
  }

  const handlePrimitiveHover = (index: number | null) => {
    setHoveredPrimitive(index)
  }

  return (
    <Paper
      shadow="sm"
      style={{
        width: 280,
        height: '100%',
        borderRadius: 0,
        borderLeft: '1px solid var(--mantine-color-gray-3)'
      }}
    >
      <Stack gap={0} style={{ height: '100%' }}>
        {/* Заголовок */}
        <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
          <Group justify="space-between">
            <Text size="lg" fw={500}>Примитивы</Text>
            <Badge variant="light" color="blue" size="sm">
              {primitives.length}
            </Badge>
          </Group>
        </Box>

        {/* Список примитивов */}
        <ScrollArea style={{ flex: 1 }} p="sm">
          <Stack gap="xs">
            {primitives.map((primitive, index) => (
              <PrimitiveItem
                key={index}
                primitive={primitive}
                index={index}
                isSelected={selectedPrimitiveIds.includes(index)}
                isHovered={hoveredPrimitiveId === index}
                onSelect={handlePrimitiveSelect}
                onHover={handlePrimitiveHover}
              />
            ))}
            {primitives.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" mt="xl">
                Нет примитивов
              </Text>
            )}
          </Stack>
        </ScrollArea>

        {/* Статус выбора */}
        {selectedPrimitiveIds.length > 0 && (
          <Box p="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
            <Text size="xs" c="dimmed">
              Выбрано: {selectedPrimitiveIds.length} примитив(ов)
            </Text>
          </Box>
        )}
      </Stack>
    </Paper>
  )
}
