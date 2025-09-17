import React, { useState } from 'react'
import {
  Group,
  Text,
  ActionIcon,
  Collapse,
  Stack,
  Box,
  ColorInput,
  NumberInput,
  Divider,
  Switch,
  Paper
} from '@mantine/core'
import { IconBulb, IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { useObjectStore, useObjectLighting } from '../../model/objectStore'
import type { LightingSettings, AmbientLightSettings, DirectionalLightSettings } from '@/entities/lighting'

/**
 * Панель управления освещением для редактора объектов.
 * Включает настройки ambient occlusion.
 */
export const LightingControlPanel: React.FC = () => {
  const lighting = useObjectLighting()
  const setLighting = useObjectStore(s => s.setLighting)
  const [expanded, setExpanded] = useState(false)

  /**
   * Обновляет параметр ambient света объекта.
   */
  const handleAmbientChange = (key: keyof AmbientLightSettings, value: string | number) => {
    setLighting({
      ...lighting,
      ambient: {
        ...(lighting.ambient ?? { uuid: 'ambient-light' }),
        [key]: value
      }
    })
  }

  /**
   * Обновляет параметр направленного света объекта.
   */
  const handleDirectionalChange = (key: keyof DirectionalLightSettings, value: string | number) => {
    setLighting({
      ...lighting,
      directional: {
        ...(lighting.directional ?? {
          uuid: 'directional-light',
          position: [10, 10, 10],
          castShadow: true
        }),
        [key]: value
      }
    })
  }

  /**
   * Изменяет цвет фона сцены объекта.
   */
  const handleBackgroundChange = (value: string) => {
    setLighting({
      ...lighting,
      backgroundColor: value
    })
  }

  const handleAmbientOcclusionChange = (
    key: keyof NonNullable<LightingSettings['ambientOcclusion']>,
    value: number | boolean
  ) => {
    setLighting({
      ...lighting,
      ambientOcclusion: {
        ...lighting.ambientOcclusion,
        [key]: value
      }
    })
  }

  return (
    <Paper p="sm" radius="md" withBorder style={{ marginBottom: 8 }}>
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            onClick={() => setExpanded(prev => !prev)}
          >
            {expanded ? (
              <IconChevronDown size={14} />
            ) : (
              <IconChevronRight size={14} />
            )}
          </ActionIcon>
          <IconBulb size={16} color="var(--mantine-color-yellow-6)" />
          <Text size="sm" fw={500}>
            Освещение
          </Text>
        </Group>
      </Group>

      <Collapse in={expanded}>
        <Stack gap="sm" mt="sm">
          <Box>
            <Text size="xs" fw={500} mb="xs">Фоновое освещение</Text>
            <Group gap="xs">
              <ColorInput
                size="xs"
                value={lighting.ambient?.color || '#404040'}
                onChange={(value) => handleAmbientChange('color', value)}
                withEyeDropper={false}
                style={{ flex: 1 }}
              />
              <NumberInput
                size="xs"
                value={lighting.ambient?.intensity || 0.6}
                onChange={(value) => handleAmbientChange('intensity', value)}
                min={0}
                max={8}
                step={0.1}
                style={{ width: 70 }}
              />
            </Group>
          </Box>

          <Box>
            <Text size="xs" fw={500} mb="xs">Направленный свет</Text>
            <Group gap="xs">
              <ColorInput
                size="xs"
                value={lighting.directional?.color || '#ffffff'}
                onChange={(value) => handleDirectionalChange('color', value)}
                withEyeDropper={false}
                style={{ flex: 1 }}
              />
              <NumberInput
                size="xs"
                value={lighting.directional?.intensity || 1}
                onChange={(value) => handleDirectionalChange('intensity', value)}
                min={0}
                max={8}
                step={0.1}
                style={{ width: 70 }}
              />
            </Group>
          </Box>

          <Box>
            <Text size="xs" fw={500} mb="xs">Фон сцены</Text>
            <ColorInput
              size="xs"
              value={lighting.backgroundColor || '#222222'}
              onChange={(value) => handleBackgroundChange(value)}
              withEyeDropper={false}
            />
          </Box>

          <Divider />

          <Box>
            <Group justify="space-between" mb="xs">
              <Text size="xs" fw={500}>Ambient Occlusion</Text>
              <Switch
                size="xs"
                checked={lighting.ambientOcclusion?.enabled || false}
                onChange={(event) => handleAmbientOcclusionChange('enabled', event.currentTarget.checked)}
              />
            </Group>

            {lighting.ambientOcclusion?.enabled && (
              <Stack gap="xs">
                <Box>
                  <Text size="xs" c="dimmed" mb={4}>Интенсивность</Text>
                  <NumberInput
                    size="xs"
                    value={lighting.ambientOcclusion.intensity || 1.0}
                    onChange={(value) => handleAmbientOcclusionChange('intensity', value)}
                    min={0}
                    max={3}
                    step={0.1}
                  />
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" mb={4}>Радиус</Text>
                  <NumberInput
                    size="xs"
                    value={lighting.ambientOcclusion.radius || 0.5}
                    onChange={(value) => handleAmbientOcclusionChange('radius', value)}
                    min={0.1}
                    max={2}
                    step={0.1}
                  />
                </Box>
              </Stack>
            )}
          </Box>
        </Stack>
      </Collapse>
    </Paper>
  )
}
