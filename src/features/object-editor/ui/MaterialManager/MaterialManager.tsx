import React, { useState } from 'react'
import {
  Paper,
  Stack,
  Text,
  Group,
  Badge,
  ScrollArea,
  ActionIcon,
  Box,
  Tooltip,
  Button
} from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import {
  useObjectMaterials,
  useSelectedMaterialUuid,
  useObjectStore
} from '../../model/objectStore.ts'
import type { GfxMaterial, CreateGfxMaterial } from '@/entities/material'
import { AddMaterialModal } from './AddMaterialModal.tsx'

/**
 * Элемент списка материалов в MaterialManager.
 */
const MaterialItem: React.FC<{
  material: GfxMaterial
  selected: boolean
  onSelect: (uuid: string) => void
}> = ({ material, selected, onSelect }) => {
  return (
    <Box
      onClick={() => onSelect(material.uuid)}
      style={{
        padding: '8px 12px',
        borderRadius: 4,
        cursor: 'pointer',
        backgroundColor: selected ? 'var(--mantine-color-blue-9)' : 'transparent',
        border: selected
          ? '1px solid var(--mantine-color-blue-6)'
          : '1px solid transparent',
        transition: 'all 0.15s ease'
      }}
    >
      <Group gap="xs" wrap="nowrap">
        <Box
          style={{
            width: 14,
            height: 14,
            borderRadius: 2,
            backgroundColor: material.properties.color
          }}
        />
        <Text size="sm" fw={500} style={{ userSelect: 'none', flex: 1 }}>
          {material.name}
        </Text>
      </Group>
    </Box>
  )
}

/**
 * Панель управления материалами объекта.
 * Позволяет создавать новые материалы и выбирать их для редактирования.
 */
export const MaterialManager: React.FC = () => {
  const materials = useObjectMaterials()
  const selected = useSelectedMaterialUuid()
  const {
    selectMaterial,
    addMaterial,
    isMaterialNameUnique
  } = useObjectStore()
  const [modalOpened, setModalOpened] = useState(false)

  /**
   * Обрабатывает выбор материала из списка.
   * @param uuid UUID выбранного материала
   */
  const handleSelect = (uuid: string) => {
    selectMaterial(uuid)
  }

  /**
   * Создаёт новый материал и добавляет его в хранилище объекта.
   */
  const handleAddMaterial = (material: CreateGfxMaterial) => {
    addMaterial(material)
  }

  return (
    <Paper shadow="sm" style={{ width: 280, height: '100%', borderRadius: 0 }}>
      <Stack gap={0} style={{ height: '100%' }}>
        {/* Заголовок */}
        <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-8)' }}>
          <Group justify="space-between">
            <Text size="lg" fw={500} style={{ userSelect: 'none' }}>
              Материалы
            </Text>
            <Group gap="xs">
              <Badge variant="light" color="blue" size="sm">
                {materials.length}
              </Badge>
              <Tooltip label="Создать материал">
                <ActionIcon size="sm" onClick={() => setModalOpened(true)}>
                  <IconPlus size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Box>

        {/* Список материалов */}
        <ScrollArea style={{ flex: 1 }} p="sm">
          <Stack gap="xs">
            {materials.map(mat => (
              <MaterialItem
                key={mat.uuid}
                material={mat}
                selected={selected === mat.uuid}
                onSelect={handleSelect}
              />
            ))}
            {materials.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" mt="xl">
                Нет материалов
              </Text>
            )}
          </Stack>
        </ScrollArea>
      </Stack>

      <AddMaterialModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        onAdd={handleAddMaterial}
        isNameUnique={isMaterialNameUnique}
      />
    </Paper>
  )
}
