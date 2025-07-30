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
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import {
  useObjectPrimitives,
  useObjectSelectedPrimitiveIds,
  useObjectHoveredPrimitiveId,
  useObjectStore
} from '../../model/objectStore.ts'
import { getPrimitiveDisplayName, getPrimitiveIcon } from '@/entities/primitive'
import type { GfxPrimitive } from '@/entities/primitive'

/**
 * Элемент примитива в списке PrimitiveManager
 */
const PrimitiveItem: React.FC<{
  primitive: GfxPrimitive
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
        backgroundColor: isSelected
          ? 'var(--mantine-color-blue-9)'
          : 'transparent',
        border: isSelected
          ? '1px solid var(--mantine-color-blue-6)'
          : '1px solid transparent',
        transition: 'all 0.15s ease'
      }}
      onClick={() => onSelect(index)}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      <Group gap="xs" wrap="nowrap">
        {(() => {
          const Icon = getPrimitiveIcon(primitive.type)
          return <Icon size={16} color="var(--mantine-color-blue-4)" />
        })()}

        <Text size="sm" style={{ flex: 1, userSelect: 'none' }} fw={500}>
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
  const {
    selectPrimitive,
    togglePrimitiveSelection,
    setHoveredPrimitive,
    setSelectedPrimitives
  } = useObjectStore()

  // Храним последний индекс, выбранный пользователем, для поддержки диапазонного выделения
  const lastSelectedRef = React.useRef<number | null>(null)

  /**
   * Обработчик клика по примитиву. Поддерживает одиночное, множественное
   * (Ctrl) и диапазонное (Shift) выделение.
   * @param index индекс примитива в списке
   */
  const handlePrimitiveSelect = (index: number) => {
    // При выборе примитива необходимо сбросить выбранный материал,
    // чтобы левая панель переключилась в режим редактирования примитива.
    useObjectStore.getState().selectMaterial(null)

    const event = window.event as KeyboardEvent

    if (event?.shiftKey && lastSelectedRef.current !== null) {
      // Диапазонное выделение между последним выбранным элементом и текущим
      const start = Math.min(lastSelectedRef.current, index)
      const end = Math.max(lastSelectedRef.current, index)
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i)
      setSelectedPrimitives(range)
    } else if (event?.ctrlKey || event?.metaKey) {
      // Множественный выбор с Ctrl или Cmd
      togglePrimitiveSelection(index)
    } else {
      // Одиночный выбор
      selectPrimitive(index)
    }

    lastSelectedRef.current = index
  }

  /**
   * Обработчик наведения курсора на примитив.
   * Передает индекс выделяемого элемента в zustand‑хранилище.
   * @param index индекс примитива или null, если курсор покинул элемент
   */
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
        userSelect: 'none'
      }}
    >
      <Stack gap={0} style={{ height: '100%' }}>
        {/* Заголовок */}
        <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-8)' }}>
          <Group justify="space-between">
            <Text size="lg" fw={500} style={{ userSelect: 'none' }}>
              Примитивы
            </Text>
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
              <Text
                size="sm"
                c="dimmed"
                ta="center"
                mt="xl"
                style={{ userSelect: 'none' }}
              >
                Нет примитивов
              </Text>
            )}
          </Stack>
        </ScrollArea>

        {/* Статус выбора */}
        {selectedPrimitiveIds.length > 0 && (
          <Box p="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-8)' }}>
            <Text size="xs" c="dimmed" style={{ userSelect: 'none' }}>
              Выбрано: {selectedPrimitiveIds.length} примитив(ов)
            </Text>
          </Box>
        )}
      </Stack>
    </Paper>
  )
}
